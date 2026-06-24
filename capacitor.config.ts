import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.apptochite',
  appName: 'AppTochite',
  webDir: 'dist',
  // Бандлим веб локально (без server.url / live-reload) — офлайн и готовность к стору.
  // androidScheme 'https' → origin внутри WebView = https://localhost
  // (учитывать при OAuth R1: redirect_uri/перехват токена).
  android: {
    androidScheme: 'https',
  },
};

export default config;
