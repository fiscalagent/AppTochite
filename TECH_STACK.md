# AppTochite — Технический стек

**Версия:** 0.5 · Май 2026  
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
| Деплой | GitHub Pages (CI через GitHub Actions, Node 24) | — |

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
│   ├── guide.html            ← печатная инструкция для пользователей
│   ├── cleaner.html          ← страница сброса данных (только dev)
│   └── icons/
├── src/
│   ├── main.tsx
│   ├── version.ts            ← APP_VERSION — единый источник версии
│   ├── styles/
│   │   ├── tokens.css        ← все CSS custom properties
│   │   └── reset.css
│   ├── db/
│   │   ├── db.ts             ← Dexie-схема, TypeScript-типы, утилиты
│   │   ├── instance.ts       ← экземпляр AppTochiteDB
│   │   └── seed.ts           ← предзаполненные справочники
│   ├── data/
│   │   └── changelog.ts      ← записи ченджлога для экрана «О программе»
│   ├── components/
│   │   ├── Autocomplete/
│   │   ├── Avatar/
│   │   ├── BackupReminder/
│   │   ├── BottomNav/
│   │   ├── ClientCard/
│   │   ├── ConfirmModal/
│   │   ├── Layout/
│   │   ├── PhotoLightbox/
│   │   ├── PhotoReport/      ← canvas-отчёт заточки + шаринг
│   │   ├── PhotoSourceSheet/
│   │   ├── SharpeningRow/
│   │   ├── StatusPill/
│   │   ├── StorageWarning/
│   │   └── Toast/
│   ├── screens/
│   │   ├── About/            ← A-1
│   │   ├── Backup/           ← BK-1
│   │   ├── Clients/          ← C-1, C-2, C-3
│   │   ├── History/          ← H-1
│   │   ├── Reference/        ← S-1/2/3
│   │   └── Sharpening/       ← Z-1, Z-2
│   ├── hooks/
│   │   ├── useCamera.ts
│   │   └── useVersionCheck.ts
│   └── utils/
│       ├── backup.ts
│       └── backup.test.ts
├── docs/                     ← документация проекта
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Схема БД (Dexie, текущая версия v8)

Таблицы: `clients`, `sharpenings`, `stones`, `steels`, `knives`, `meta`, `settings`, `analyticsQueue`.
`updatedAt` есть у всех сущностей (last-write-wins для merge-бэкапа). `settings` и `analyticsQueue` — device-specific, **не входят в JSON-бэкап**.

```ts
// src/db/db.ts

export interface Client {
  id?: number
  name: string
  phone?: string
  telegram?: string
  avatar?: string       // base64, фото из камеры/галереи
  isSelf: boolean       // нулевой клиент «Я»
  createdAt: Date
  updatedAt?: Date
  deletedAt?: Date      // soft-delete: запись в корзине (TTL 3 дня)
  deletedBatchId?: string // группа для восстановления (клиент + его заточки)
}

export type SharpeningStatus = 'accepted' | 'done'

export interface SharpeningStone {
  name: string
  order: number         // порядок в последовательности; последний = финишный (FIN)
}

export interface Sharpening {
  id?: number
  clientId: number
  knifeBrand: string
  steel?: string
  hrc?: number
  condition?: string[]  // тип работы: заточка / правка РК / ремонт
  receivedAt: Date
  angle?: number
  stones?: SharpeningStone[]  // embedded JSON, не отдельная таблица
  comment?: string
  price?: number
  status: SharpeningStatus
  doneAt?: Date
  photosBefore?: string[]     // base64[], до 5 фото
  photosAfter?: string[]      // base64[], до 5 фото
  updatedAt?: Date
  deletedAt?: Date            // soft-delete (корзина)
  deletedBatchId?: string
}

// В какой шкале камень был введён (для режима «Своя» в UI)
export type GritSource = 'fepa' | 'jis' | 'mk' | 'microns'
export type StoneCoolant = 'water' | 'oil' | 'both' | 'dry'  // СОЖ; 'dry' = сухой

export interface Stone {
  id?: number
  brand: string
  gritFepa?: number     // четыре шкалы гритности хранятся явно
  gritJis?: number
  gritMicrons?: number
  gritMk?: string       // значение для мкм (формат '315/250')
  gritSource?: GritSource
  type?: 'galvanic' | 'ao' | 'kk' | 'diamond' | 'elbor' | 'natural' | 'pritir' | 'ceramic' | 'other'
  coolant?: StoneCoolant
  category?: string
  description?: string
  isCustom: boolean
  updatedAt?: Date
}

export interface Steel {
  id?: number
  name: string
  hrc?: number
  recommendedAngle?: number
  category?: string
  description?: string
  isCustom: boolean
  updatedAt?: Date
}

export interface Knife {
  id?: number
  brand: string
  country?: string
  steel?: string
  recommendedAngle?: number
  type?: string
  category?: string
  description?: string
  isCustom: boolean
  updatedAt?: Date
}

export interface Meta {        // служебная: seedVersion и т.п.
  key: string
  value: number | string | boolean
}

export interface Setting {     // device-specific, вне бэкапа
  key: string
  value: unknown
}

export interface AnalyticsQueueItem { // офлайн-буфер аналитики, вне бэкапа
  id?: number
  payload: string
  queuedAt: Date
}

// Версии схемы (CURRENT_SCHEMA_VERSION = 8):
// v1 — initial: clients, sharpenings, stones, steels, knives
// v2 — grit index on stones
// v3 — meta table (seedVersion)
// v4 — settings table; firstLaunchAt/lastBackupAt вынесены из meta (вне бэкапа)
// v5 — updatedAt у всех сущностей (last-write-wins для merge)
// v6 — analyticsQueue (офлайн-буфер аналитики)
// v7 — четыре явные шкалы гритности (grit/gritUnit → конвертация через GRIT_TABLE)
// v8 — soft-delete (deletedAt/deletedBatchId) для clients и sharpenings — корзина, TTL 3 дня
```

---

## Changelog

**v0.5 (май 2026)** — синхронизация со схемой БД v8 (приложение v1.75):
- Схема БД: v3 → v8 (settings, analyticsQueue, `updatedAt` у всех сущностей, четыре явные шкалы гритности, soft-delete/корзина)
- `Stone`: поля `grit`/`gritUnit` заменены на `gritFepa`/`gritJis`/`gritMicrons`/`gritMk` + `gritSource`; добавлены `coolant` (СОЖ, вкл. «сухой») и тип `other`
- Корзина (soft-delete клиентов и заточек, TTL 3 дня)
- Удалён устаревший `docs/instruction.html` (Альфа 0.1); единственная пользовательская инструкция — `public/guide.html`

**v0.4 (май 2026)** — обновление по итогам v1.15–v1.32:
- Деплой: Vercel → GitHub Pages
- Схема БД: добавлены `Client.avatar`, `Stone.gritUnit`, `Stone.gritMk`; убраны устаревшие поля (`isMe`, `photoBefore`/`photoAfter` → массивы, `Sharpening.sentAt`)
- Добавлен компонент `PhotoReport/`
- Структура: `src/db/instance.ts` выделен из `db.ts`

**v0.3 (апрель 2026)** — первая версия. Стек зафиксирован: React + Vite + TypeScript + CSS Modules + Dexie.js + Workbox. Tailwind исключён в пользу CSS Modules для совместимости с дизайн-системой на CSS custom properties.
