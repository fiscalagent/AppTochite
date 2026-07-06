package io.github.apptochite;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.UriPermission;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Environment;
import android.provider.DocumentsContract;

import androidx.activity.result.ActivityResult;
import androidx.documentfile.provider.DocumentFile;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Папочный бэкап для APK через Storage Access Framework (SAF).
 *
 * На Android 11+ прямая запись в публичные Документы запрещена scoped storage
 * (см. историю: @capacitor/filesystem Directory.Documents падал с «нет доступа
 * к памяти»). SAF — единственный способ писать в видимую пользователю,
 * переживающую удаление приложения папку: юзер сам выбирает её через системный
 * пикер (ACTION_OPEN_DOCUMENT_TREE), а мы забираем persistable-доступ к tree Uri.
 *
 * Плагин локальный — регистрируется в MainActivity.registerPlugin().
 * Файлы пишутся в корень выбранной папки (без подкаталога): юзер выбрал её явно.
 */
@CapacitorPlugin(name = "SafFolder")
public class SafFolderPlugin extends Plugin {

    private static final String MIME_JSON = "application/json";

    // ── Выбор папки (системный пикер) ─────────────────────────────────────────

    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        );
        startActivityForResult(call, intent, "pickFolderResult");
    }

    // ВАЖНО: call может быть null. Пока открыт системный пикер, агрессивные
    // прошивки (Samsung, MIUI, EMUI) выгружают приложение; Activity и WebView
    // пересоздаются, JS-промис pickFolder исчезает — результат некому принять.
    // Поэтому разрешение и выбранную папку фиксируем ВСЕГДА, независимо от call:
    // JS заберёт её на старте через getPendingFolder и довыполнит включение.
    @ActivityCallback
    private void pickFolderResult(PluginCall call, ActivityResult result) {
        Uri treeUri = (result.getResultCode() == Activity.RESULT_OK && result.getData() != null)
            ? result.getData().getData()
            : null;
        if (treeUri == null) {
            if (call != null) call.reject("cancelled", "CANCELLED");
            return;
        }
        try {
            final int flags = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
            getContext().getContentResolver().takePersistableUriPermission(treeUri, flags);
        } catch (Exception e) {
            if (call != null) call.reject("Failed to persist folder access: " + e.getMessage());
            return;
        }
        DocumentFile dir = DocumentFile.fromTreeUri(getContext(), treeUri);
        String name = dir != null && dir.getName() != null ? dir.getName() : "";
        savePendingFolder(treeUri.toString(), name);
        if (call != null) {
            JSObject ret = new JSObject();
            ret.put("uri", treeUri.toString());
            ret.put("name", name);
            call.resolve(ret);
        }
    }

    // ── Незавершённый выбор папки (переживает смерть процесса) ───────────────

    private static final String PREFS = "SafFolderPlugin";
    private static final String PREF_PENDING_URI = "pendingUri";
    private static final String PREF_PENDING_NAME = "pendingName";

    private void savePendingFolder(String uri, String name) {
        // commit(), не apply(): процесс могли убить сразу после возврата из пикера —
        // синхронная запись гарантирует, что выбор доедет до диска.
        getContext().getSharedPreferences(PREFS, Activity.MODE_PRIVATE)
            .edit()
            .putString(PREF_PENDING_URI, uri)
            .putString(PREF_PENDING_NAME, name)
            .commit();
    }

    /** Последняя выбранная в пикере папка, ещё не подтверждённая JS-стороной. Пустой объект, если нет. */
    @PluginMethod
    public void getPendingFolder(PluginCall call) {
        SharedPreferences sp = getContext().getSharedPreferences(PREFS, Activity.MODE_PRIVATE);
        String uri = sp.getString(PREF_PENDING_URI, null);
        JSObject ret = new JSObject();
        if (uri != null) {
            ret.put("uri", uri);
            ret.put("name", sp.getString(PREF_PENDING_NAME, ""));
        }
        call.resolve(ret);
    }

    /** JS подтвердил (или отменил) подключение папки — маркер больше не нужен. */
    @PluginMethod
    public void clearPendingFolder(PluginCall call) {
        getContext().getSharedPreferences(PREFS, Activity.MODE_PRIVATE)
            .edit()
            .remove(PREF_PENDING_URI)
            .remove(PREF_PENDING_NAME)
            .commit();
        call.resolve();
    }

    // ── Запись / чтение / метаданные ──────────────────────────────────────────

    @PluginMethod
    public void writeFile(PluginCall call) {
        String treeUri = call.getString("treeUri");
        String name = call.getString("name");
        String data = call.getString("data");
        if (treeUri == null || name == null || data == null) {
            call.reject("treeUri, name and data are required");
            return;
        }
        DocumentFile dir = openDir(treeUri);
        if (dir == null || !dir.canWrite()) {
            call.reject("no-permission", "NO_PERMISSION");
            return;
        }
        try {
            DocumentFile file = dir.findFile(name);
            if (file == null) {
                file = dir.createFile(MIME_JSON, name);
            }
            if (file == null) {
                call.reject("Could not create file");
                return;
            }
            // "wt" — усечь и перезаписать, иначе остался бы хвост старого файла.
            try (OutputStream os = getContext().getContentResolver().openOutputStream(file.getUri(), "wt")) {
                if (os == null) {
                    call.reject("Could not open output stream");
                    return;
                }
                os.write(data.getBytes(StandardCharsets.UTF_8));
            }
            // Файл создан через SAF — MediaStore о нём не знает, и часть файловых
            // менеджеров (Samsung MyFiles и т.п.) не показывают его до следующей
            // перезаписи. Принудительно индексируем, чтобы файл был виден сразу.
            mediaScan(file.getUri());
            JSObject ret = new JSObject();
            ret.put("uri", file.getUri().toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("write-failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void readFile(PluginCall call) {
        String treeUri = call.getString("treeUri");
        String name = call.getString("name");
        if (treeUri == null || name == null) {
            call.reject("treeUri and name are required");
            return;
        }
        DocumentFile dir = openDir(treeUri);
        if (dir == null) {
            call.reject("no-permission", "NO_PERMISSION");
            return;
        }
        DocumentFile file = dir.findFile(name);
        if (file == null || !file.exists()) {
            call.reject("not-found", "NOT_FOUND");
            return;
        }
        try (InputStream is = getContext().getContentResolver().openInputStream(file.getUri())) {
            if (is == null) {
                call.reject("Could not open input stream");
                return;
            }
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int read;
            while ((read = is.read(chunk)) != -1) {
                buffer.write(chunk, 0, read);
            }
            JSObject ret = new JSObject();
            ret.put("data", buffer.toString("UTF-8"));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("read-failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stat(PluginCall call) {
        String treeUri = call.getString("treeUri");
        String name = call.getString("name");
        if (treeUri == null || name == null) {
            call.reject("treeUri and name are required");
            return;
        }
        DocumentFile dir = openDir(treeUri);
        if (dir == null) {
            call.reject("no-permission", "NO_PERMISSION");
            return;
        }
        DocumentFile file = dir.findFile(name);
        if (file == null || !file.exists()) {
            call.reject("not-found", "NOT_FOUND");
            return;
        }
        JSObject ret = new JSObject();
        ret.put("size", file.length());
        ret.put("mtime", file.lastModified());
        call.resolve(ret);
    }

    /** Проверяет, что persistable-доступ к папке ещё держится и доступен на запись. */
    @PluginMethod
    public void checkAccess(PluginCall call) {
        String treeUri = call.getString("treeUri");
        JSObject ret = new JSObject();
        if (treeUri == null) {
            ret.put("granted", false);
            call.resolve(ret);
            return;
        }
        boolean held = false;
        try {
            List<UriPermission> perms = getContext().getContentResolver().getPersistedUriPermissions();
            for (UriPermission p : perms) {
                if (p.getUri().toString().equals(treeUri) && p.isWritePermission()) {
                    held = true;
                    break;
                }
            }
        } catch (Exception ignored) { /* нет доступа — held остаётся false */ }
        if (held) {
            DocumentFile dir = openDir(treeUri);
            held = dir != null && dir.canWrite();
        }
        ret.put("granted", held);
        call.resolve(ret);
    }

    private DocumentFile openDir(String treeUri) {
        try {
            return DocumentFile.fromTreeUri(getContext(), Uri.parse(treeUri));
        } catch (Exception e) {
            return null;
        }
    }

    /** Регистрирует SAF-файл в MediaStore, чтобы он сразу появился в файловых менеджерах. */
    private void mediaScan(Uri fileUri) {
        try {
            String path = filePathFromDocumentUri(fileUri);
            if (path != null) {
                MediaScannerConnection.scanFile(getContext(), new String[]{ path }, null, null);
            }
        } catch (Exception ignored) { /* best-effort: провайдер без реального пути (Downloads/облако) */ }
    }

    /**
     * Восстанавливает реальный путь файловой системы из document Uri.
     * Работает для ExternalStorageProvider (внутренняя память / SD) и raw-путей;
     * для остальных провайдеров (Downloads, облако) пути нет → null (скан пропускаем).
     */
    private String filePathFromDocumentUri(Uri uri) {
        final String docId = DocumentsContract.getDocumentId(uri);
        if (docId.startsWith("raw:")) return docId.substring(4);
        final String[] split = docId.split(":", 2);
        if (split.length < 2) return null;
        final String volume = split[0];
        final String relative = split[1];
        if ("primary".equalsIgnoreCase(volume)) {
            return Environment.getExternalStorageDirectory() + "/" + relative;
        }
        // Вторичный том (SD-карта) — путь по конвенции /storage/<volume>/...
        return "/storage/" + volume + "/" + relative;
    }
}
