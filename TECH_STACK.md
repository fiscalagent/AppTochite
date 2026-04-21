# AppTochite — Технический стек

**Версия:** 0.3 · Апрель 2026  
**Тип:** PWA · Mobile-first · Android (90%)

---

## Стек

| Слой | Технология | Версия |
|---|---|---|
| Фреймворк | React | 18+ |
| Сборщик | Vite | 5+ |
| Язык | TypeScript | 5+ |
| Стилизация | CSS Modules | — |
| Навигация | React Router | 6+ |
| Хранилище | Dexie.js (IndexedDB) | 3+ |
| Офлайн / SW | Workbox (`vite-plugin-pwa`) | 0.17+ |
| Камера | Web Camera API | нативный браузерный API |
| Деплой | Vercel | — |

---

## Обоснование ключевых решений

### CSS Modules — вместо Tailwind
Дизайн-система AppTochite строится на CSS custom properties (`--bg-100`, `--accent`, `--status-done` и т.д.). Tailwind потребовал бы дублирования всех токенов в `tailwind.config.js` и постоянного использования arbitrary values (`bg-[#1E3A5F]`). CSS Modules дают полную изоляцию стилей по компонентам и прямой доступ к токенам через `var(--...)` без лишних абстракций.

### Dexie.js — вместо голого IndexedDB
IndexedDB API низкоуровневый и многословный. Dexie даёт Promise-based API, типизированные схемы через TypeScript, простые миграции версий БД. Критично для хранения фото в base64 (десятки МБ) и сложных запросов по справочникам.

### Workbox через vite-plugin-pwa
Автоматическая генерация Service Worker и PWA manifest из конфига Vite. Стратегии кэширования (cache-first для справочников, network-first для динамики) настраиваются декларативно.

---

## Структура проекта

```
apptochite/
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── main.tsx                  ← глобальный импорт токенов
│   ├── styles/
│   │   ├── tokens.css            ← все CSS custom properties
│   │   └── reset.css
│   ├── db/
│   │   ├── db.ts                 ← Dexie схема и инстанс
│   │   └── types.ts              ← TypeScript типы сущностей
│   ├── components/               ← переиспользуемые компоненты
│   │   ├── StatusPill/
│   │   │   ├── StatusPill.tsx
│   │   │   └── StatusPill.module.css
│   │   ├── Avatar/
│   │   ├── ClientCard/
│   │   ├── SharpeningRow/
│   │   └── BottomNav/
│   ├── screens/                  ← экраны из спецификации
│   │   ├── Clients/              ← C-1, C-2, C-3
│   │   ├── History/              ← H-1
│   │   ├── Sharpening/           ← Z-1, Z-2
│   │   └── Reference/            ← S-1..S-4
│   ├── modals/                   ← M-1..M-4
│   ├── hooks/                    ← useCamera, useClients, ...
│   └── router.tsx
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Схема БД (Dexie)

```ts
// src/db/db.ts
import Dexie, { Table } from 'dexie';

export interface Client {
  id?: number;
  name: string;
  phone?: string;
  telegram?: string;
  isMe: boolean; // нулевой клиент «Я»
  createdAt: Date;
}

export interface Sharpening {
  id?: number;
  clientId: number;
  knifeBrand: string;
  steel?: string;
  hrc?: number;
  knifeType?: string;
  condition?: string[];       // мультивыбор
  receivedAt: Date;
  angle?: number;
  stones?: SharpeningStone[];
  comment?: string;
  price?: number;
  status: 'accepted' | 'inwork' | 'done';
  doneAt?: Date;
  photoBefore?: string;       // base64
  photoAfter?: string;        // base64
}

export interface SharpeningStone {
  stoneId: number;
  order: number;
}

export interface Stone {
  id?: number;
  brand: string;
  grit: number;
  type: 'water' | 'oil' | 'diamond';
  description?: string;
  isCustom: boolean;
}

export interface Steel {
  id?: number;
  name: string;
  hrc?: number;
  recommendedAngle?: number;
  description?: string;
  isCustom: boolean;
}

export interface Knife {
  id?: number;
  brand: string;
  country?: string;
  steel?: string;
  recommendedAngle?: number;
  type?: string;
  description?: string;
  isCustom: boolean;
}

class AppTochiteDB extends Dexie {
  clients!: Table<Client>;
  sharpenings!: Table<Sharpening>;
  stones!: Table<Stone>;
  steels!: Table<Steel>;
  knives!: Table<Knife>;

  constructor() {
    super('AppTochiteDB');
    this.version(1).stores({
      clients:     '++id, name, isMe',
      sharpenings: '++id, clientId, status, receivedAt',
      stones:      '++id, brand, type, isCustom',
      steels:      '++id, name, isCustom',
      knives:      '++id, brand, isCustom',
    });
  }
}

export const db = new AppTochiteDB();
```

---

## PWA конфиг (vite.config.ts)

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'AppTochite',
        short_name: 'Заточка',
        description: 'Журнал заточника',
        theme_color: '#0F0F11',
        background_color: '#0F0F11',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'ru',
        icons: [
          { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
});
```

---

## Changelog

**v0.3** — первая версия. Стек зафиксирован: React + Vite + TypeScript + CSS Modules + Dexie.js + Workbox. Tailwind исключён в пользу CSS Modules для совместимости с дизайн-системой на CSS custom properties.
