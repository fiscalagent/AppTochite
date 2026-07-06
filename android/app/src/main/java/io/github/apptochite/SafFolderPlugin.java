package io.github.apptochite;

import android.app.Activity;
import android.content.Intent;
import android.content.UriPermission;
import android.net.Uri;

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

    @ActivityCallback
    private void pickFolderResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("cancelled", "CANCELLED");
            return;
        }
        Uri treeUri = result.getData().getData();
        if (treeUri == null) {
            call.reject("cancelled", "CANCELLED");
            return;
        }
        try {
            final int flags = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
            getContext().getContentResolver().takePersistableUriPermission(treeUri, flags);
        } catch (Exception e) {
            call.reject("Failed to persist folder access: " + e.getMessage());
            return;
        }
        DocumentFile dir = DocumentFile.fromTreeUri(getContext(), treeUri);
        JSObject ret = new JSObject();
        ret.put("uri", treeUri.toString());
        ret.put("name", dir != null && dir.getName() != null ? dir.getName() : "");
        call.resolve(ret);
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
}
