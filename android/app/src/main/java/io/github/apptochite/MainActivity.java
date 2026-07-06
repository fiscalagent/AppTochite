package io.github.apptochite;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Локальный плагин SAF-папки — регистрируем до super.onCreate,
        // иначе мост не найдёт его при инициализации.
        registerPlugin(SafFolderPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
