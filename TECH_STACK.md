# AppTochite — Технический стек

**Версия:** 0.6 · Июль 2026  
**Тип:** PWA (GitHub Pages) + off-store APK (Capacitor) · Mobile-first · Android (90%)

---

## Стек

| Слой | Технология | Версия |
|---|---|---|
| Фреймворк | React | 19+ |
| Сборщик | Vite | 8+ |
| Язык | TypeScript | 6+ |
| Стилизация | CSS Modules | — |
| Навигация | React Router | 7+ |
| Хранилище | Dexie.js (IndexedDB) | 4+ |
| Офлайн / SW | Workbox (`vite-plugin-pwa`) | 1+ |
| Нативная обёртка | Capacitor (Android APK, off-store) | 8+ |
| QR-код | `qrcode` (цифровая визитка) | 1.5+ |
| Импорт таблиц | `read-excel-file` (xlsx/csv справочников) | 9+ |
| Камера | Web Camera API (PWA) / `@capacitor/camera` (APK) | — |
| Деплой | PWA: GitHub Pages (CI через GitHub Actions, Node 24). APK: GitHub Release, сборка вручную (`npm run build:cap`) | — |

Два билд-режима из одной кодовой базы: `vite build` (PWA, PWA-манифест + Workbox) и `vite build --mode capacitor` (APK, `base: './'`, без Service Worker, `cap sync android`). Ветки различаются по `import.meta.env.MODE === 'capacitor'`; Rollup вырезает из каждого бандла код чужой ветки (динамические импорты Capacitor-плагинов не попадают в PWA, Workbox-настройка не попадает в APK).

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

Полное дерево `src/` с однострочным описанием каждого файла — в `CLAUDE.md` («Структура файлов»), там оно поддерживается в актуальном состоянии при каждом изменении кода. Здесь — верхнеуровневая карта:

```
apptochite/
├── public/
│   ├── manifest.json
│   ├── guide.html / guide_en.html ← инструкция для пользователей (открывается из приложения)
│   ├── cleaner.html          ← страница сброса данных (только dev)
│   └── icons/
├── android/                  ← нативный Android-проект (Capacitor), под APK-сборку
├── docs/                     ← документация проекта + guide.html/guide_en.html «копии для печати»
├── presentation/             ← промо-материалы (лендинг-видео, one-pager)
├── src/
│   ├── main.tsx
│   ├── router.tsx            ← все маршруты (createBrowserRouter)
│   ├── version.ts            ← APP_VERSION — единый источник версии (генерируется релизом)
│   ├── styles/                ← tokens.css (design tokens), reset.css
│   ├── config/                 ← feature flags (voiceInput, cloudBackup), масштаб текста
│   ├── contexts/                ← AutoBackupContext — единая точка автобэкапа
│   ├── plugins/                  ← обёртки нативных Capacitor-плагинов (SAF-папка)
│   ├── i18n/                      ← слой мультиязычности ru/en (см. docs/i18n-plan.md)
│   ├── db/                        ← Dexie-схема (v11), типы, seed, preMigrationSnapshot
│   ├── data/                       ← changelog.ts, gritTable.ts
│   ├── services/                    ← analytics.ts, bugReport.ts
│   ├── components/                   ← переиспользуемые UI-компоненты (30+)
│   ├── screens/                       ← About, Backup, BusinessCard, Clients, Games, History, Reference, Sharpening, Trash
│   ├── hooks/                          ← useCamera, useDictationMode, useVoiceInput, useInstallPrompt, …
│   └── utils/                           ← backup/cloudBackup/refSync/voiceMatch/voiceCommand/trash/vcard + тесты
├── vite.config.ts
├── capacitor.config.ts       ← appId io.github.apptochite, androidScheme https
├── tsconfig.json
└── package.json
```

---

## Схема БД (Dexie, текущая версия v11)

Таблицы: `clients`, `sharpenings`, `stones`, `steels`, `knives`, `meta`, `settings`, `analyticsQueue`.
`updatedAt` есть у всех сущностей (last-write-wins для merge-бэкапа). `settings` и `analyticsQueue` — device-specific, **не входят в JSON-бэкап**. `guid` — кросс-устройственная идентичность `clients`/`sharpenings` (merge сопоставляет по нему, не по автоинкрементному `id`).

```ts
// src/db/db.ts

export interface Client {
  id?: number
  guid?: string          // кросс-устройственная идентичность (v9); id — автоинкремент, свой на каждом устройстве
  name: string
  phone?: string
  telegram?: string
  avatar?: string       // base64, фото из камеры/галереи
  isSelf: boolean       // нулевой клиент «Я»
  createdAt: Date
  updatedAt?: Date
  deletedAt?: Date      // soft-delete: запись в корзине (TTL 3 дня)
  deletedBatchId?: string // группа для восстановления (клиент + его заточки)
  // Цифровая визитка — заполняются только у self-клиента «Я». Неиндексируемые,
  // добавлены без бампа схемы (тот же приём, что у Sharpening.microbevelAngle).
  company?: string
  specialization?: string
  services?: string
}

export type SharpeningStatus = 'accepted' | 'done'

export interface SharpeningStone {
  name: string
  order: number         // порядок в последовательности; последний = финишный (FIN)
}

export interface Sharpening {
  id?: number
  guid?: string          // см. Client.guid
  clientId: number
  knifeBrand: string
  steel?: string
  hrc?: number
  condition?: string[]  // тип работы: заточка / правка РК / ремонт
  receivedAt: Date
  angle?: number
  microbevelAngle?: number // микроподвод (МП); наличие значения = есть МП. Добавлено без бампа схемы
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

// Версии схемы (CURRENT_SCHEMA_VERSION = 11):
// v1 — initial: clients, sharpenings, stones, steels, knives
// v2 — grit index on stones
// v3 — meta table (seedVersion)
// v4 — settings table; firstLaunchAt/lastBackupAt вынесены из meta (вне бэкапа)
// v5 — updatedAt у всех сущностей (last-write-wins для merge)
// v6 — analyticsQueue (офлайн-буфер аналитики)
// v7 — четыре явные шкалы гритности (grit/gritUnit → конвертация через GRIT_TABLE)
// v8 — soft-delete (deletedAt/deletedBatchId) для clients и sharpenings — корзина, TTL 3 дня
// v9 — guid у clients/sharpenings — кросс-устройственная идентичность для merge
// v10 — составные индексы [clientId+status], [clientId+knifeBrand] (дешёвые key-only подсчёты)
// v11 — составные индексы [status+receivedAt], [clientId+receivedAt] (постраничная загрузка без фото)
```

---

## Changelog

**v0.6 (июль 2026)** — синхронизация со схемой БД v11 (приложение v2.6.2):
- Схема БД: v8 → v11 (`guid` для кросс-устройственного merge, составные индексы под постраничную загрузку без фото); `Client` и `Sharpening` получили поля без бампа схемы (`company`/`specialization`/`services`, `microbevelAngle`)
- Стек: React 18 → 19, Vite 5 → 8, TypeScript 5 → 6, React Router 6 → 7, Dexie 3 → 4, vite-plugin-pwa 0.17 → 1
- Второй билд-таргет: off-store APK через Capacitor (`android/`, `capacitor.config.ts`, `vite build --mode capacitor`) — PWA остаётся основным, APK собирается из той же кодовой базы
- Новые сквозные слои: `contexts/AutoBackupContext` (единая точка автобэкапа), `services/` (analytics, bugReport), `plugins/safFolder` (нативный SAF для APK)
- Крупные фичи с прошлой сверки: голосовая диктовка (итерация 2), полная мультиязычность ru/en (UI, справочники, голос, ченджлог, инструкция), корзина (soft-delete), автоснимок перед миграцией схемы, папочный и облачный (Яндекс.Диск) автобэкап с эскалацией напоминаний, синхронизация справочников «Стали»/«Ножи» через CSV, игры-тренажёры, цифровая визитка

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
