# AppTochite — Технический стек

**Версия:** 0.4 · Май 2026  
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

## Схема БД (Dexie, текущая версия v3)

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
}

export type GritUnit = 'fepa' | 'jis' | 'mk'

export interface Stone {
  id?: number
  brand: string
  grit?: number
  gritUnit?: GritUnit   // единица зернистости
  gritMk?: string       // значение для мкм (формат '315/250')
  type?: 'galvanic' | 'ao' | 'kk' | 'diamond' | 'elbor' | 'natural' | 'pritir' | 'ceramic'
  category?: string
  description?: string
  isCustom: boolean
}

export interface Steel {
  id?: number
  name: string
  hrc?: number
  recommendedAngle?: number
  category?: string
  description?: string
  isCustom: boolean
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
}

export interface Meta {
  key: string
  value: number | string | boolean
}

// Версии схемы:
// v1 — initial: clients, sharpenings, stones, steels, knives
// v2 — grit index on stones
// v3 — meta table (seedVersion)
```

---

## Changelog

**v0.4 (май 2026)** — обновление по итогам v1.15–v1.32:
- Деплой: Vercel → GitHub Pages
- Схема БД: добавлены `Client.avatar`, `Stone.gritUnit`, `Stone.gritMk`; убраны устаревшие поля (`isMe`, `photoBefore`/`photoAfter` → массивы, `Sharpening.sentAt`)
- Добавлен компонент `PhotoReport/`
- Структура: `src/db/instance.ts` выделен из `db.ts`

**v0.3 (апрель 2026)** — первая версия. Стек зафиксирован: React + Vite + TypeScript + CSS Modules + Dexie.js + Workbox. Tailwind исключён в пользу CSS Modules для совместимости с дизайн-системой на CSS custom properties.
