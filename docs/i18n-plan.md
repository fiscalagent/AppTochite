# Мультиязычность (i18n) — план и статус

Живой документ. Отмечать прогресс прямо здесь: ✅ сделано · 🔜 следующее · ⏳ позже · ⚠️ требует решения.

## Главный принцип безопасности

**Локализация происходит ТОЛЬКО на границе отображения. Хранимые данные не мигрируются.**
Каноническое значение в БД остаётся ровно таким, как сегодня; перевод — через тотальные
функции `value → label[locale]` с фолбэком на `raw`. Поэтому схема БД, формат бэкапа, merge и
restore **не затрагиваются**, и данные пользователя не могут пострадать. Язык интерфейса хранится
в `localStorage` (вне бэкапа), а не в БД.

Обоснование и разбор всех путей данных (export/restore/merge/OPFS/cross-version) — в истории
обсуждения; ключевые правила: тотальные нормализаторы, дропдауны пишут **канонический ключ**, а не
подпись.

## Архитектура слоя (`src/i18n/`)

| Файл | Назначение |
|---|---|
| `locale.ts` | тип `Locale`, чтение/запись языка в localStorage, `<html lang>`, дефолт по `navigator.language` |
| `plural.ts` | универсальный `plural()` на `Intl.PluralRules` (ru + en) |
| `format.ts` | `fmtDate` / `fmtDateTime` / `fmtMoney` / `fmtNumber` на `Intl` |
| `dict/ru.ts` | русский словарь — **источник истины формы**; `Dict = typeof ru` |
| `dict/index.ts` | карта `dicts` по локали (пока только `ru`) |
| `LocaleProvider.tsx` | провайдер, хуки `useLocale` / `useT`, тотальный `enumLabel` |
| `index.ts` | barrel — единая точка импорта |

Подход: **лёгкая своя обёртка**, не react-i18next (минимализм проекта, 2 языка, 1 разработчик).
Триггер сменить на react-i18next: 3-й+ язык или внешние переводчики.

---

## Фаза 0 — Фундамент ✅

- ✅ i18n-слой (locale/plural/format/dict-ru/Provider/useT/enumLabel) + тесты — `56ca0f1`
- ✅ `LocaleProvider` подключён в дерево App. Поведение не изменилось.

## Фаза 1 — Перенос на словарь (ru остаётся, поведение не меняется)

Безопасно по данным. Дробится на маленькие коммиты.

### 1.1 enum-швы (запись канонического ключа, подпись из словаря)

- ✅ **Камни: тип абразива / СОЖ** — `fcef64e`. Карты выведены из `ru.enums`, обратный разбор
  через `invertLabels`, дропдауны уже писали ключи.
- ✅ **country (ножи)** — отображение через `enumLabel(t.enums.country, …)`. ru-карта пустая → raw,
  zero-change. En-карта появится в Фазе 2.
- ✅ **condition (приёмка Z-1)** — список из `Object.keys(ru.enums.condition)`, подпись через
  `enumLabel`. Хранимое значение = канонический ключ (= русская строка), zero-change.
- ✅ **status** — решение: **везде строчными** (`принят`/`готов`). Плашка без изменений, CSV-экспорт
  переведён со «Готово/Принят» на «готов/принят» через `ru.enums.status`. StatusPill → `enumLabel`.
- ✅ **Дропдауны Reference (тип/СОЖ)** — решение: **везде строчными**. `<option>` рендерятся из
  словаря (`Object.entries(t.enums.stoneType/coolant)`), подписи строчные как в списке.
- ❎ **Категории сталей/ножей** — `category` нигде не отображается как подпись, шов не требуется.

### 1.2 Текстовые UI-строки → `useT()` (пачками по экранам)

- ✅ common / навигация — `nav.*` в словаре, BottomNav на `useT()`. Layout строк не содержит.
- ✅ Clients (C-1/C-2/C-3) — `clients.*`; даты по локали, цена через `fmtMoney`, онбординг-разметка по сегментам
- ✅ Sharpening: Z-1 (приёмка) + Z-2 (заточка) — `sharpening.*` видимый текст, дропдаун типа камня
  из словаря, даты/деньги по локали. Диктовочные тосты + `fieldLabel` → Фаза 3 (голос).
  Остаток: placeholder «выберите тип абразива» (как в Reference, в текстовом хвосте)
- ✅ History (H-1) — `history.*`; фильтры из словаря, месяц/день и цена по локали
- ✅ Reference (S-1/2/3) — `reference.*`; камни/стали/ножи, все диалоги, импорт ножей,
   панели выбора, конвертер/heatmap. Остаток: единицы гритности «мк/мкм» и CSV-формат (русские
   заголовки/парсинг) — намеренно не трогаем
- ✅ Backup (BK-1) — `backup.*`; все тосты, секции, даты по локали, merge-превью
- ✅ About (A-1) — `about.*` в словаре; дата проверки через `localeTag`. Ченджлог не переводим.
- ✅ Trash — `trash.*` в словаре; даты через `localeTag`, плюрал через `units.sharpenings`
- ✅ Компоненты — `components.*`: ConfirmModal, OnboardingSheet, PhotoSourceSheet,
  PhotoLightbox, StorageWarning, BrowserWarning, BackupCriticalBanner,
  BackupReminderModal, PhotoReportSheet, PhotoShareSheet, EasterEgg.
  Пропущено намеренно (Фаза 3/голос): DictationButton, DictationCandidates,
  DictationIndicator, MicButton.

### 1.3 Форматирование ✅

- ✅ Добавлены именованные хелперы в `format.ts`: `fmtDateShort`, `fmtDateLong`, `fmtDateDayMonth`,
  `fmtDateMonthYear`, `fmtDateTimeLong`, `fmtCurrencySymbol`. Все экспортированы через `index.ts`.
- ✅ Все `toLocaleDateString`/`toLocaleString` в экранах заменены именованными функциями
  (Trash, About, ClientCard, Backup, HistoryFeed, SharpeningDetail). `localeTag` убран из
  компонентных импортов там, где использовался только для форматирования дат.
- ✅ **Валюта** — `priceLabel: 'Цена, ₽'` → `'Цена'` в словаре; в Z-1 лейбл составной:
  `{t.sharpening.priceLabel}, {fmtCurrencySymbol(locale)}`. При добавлении en будет автоматически
  показывать «Price, $».
- ✅ `buildSharpeningCSV` (backup.ts) — намеренно оставлен с `'ru'`; CSV-формат русскоязычный.

### 1.4 Документ-уровень

- ✅ `<html lang>` выставляется провайдером
- ⏳ manifest / meta description (витрина PWA) — при необходимости

## Фаза 2 — Английский язык ✅

- ✅ `dict/en.ts` — полный перевод, satisfies `Dict = typeof ru`. Карты `country` (62 страны
  ru→en), `condition` ('заточка'→'Sharpening', 'правка РК'→'Edge touch-up', 'ремонт'→'Repair'),
  `stoneType` (AlOx/SiC/CBN/...), plural('en', ...) для всех plural-функций.
- ✅ `AVAILABLE_LOCALES = ['ru', 'en']`; `dicts` пополнен `en`; `detectDefaultLocale` уже
  возвращает 'en' для не-ru браузеров.
- ✅ Переключатель языка (сегментный контрол RU/EN) в About → Settings.
  `languageLabel` добавлен в оба словаря.
- ⏳ QA на обоих языках (UI, CSV, бэкап/восстановление, смена языка на лету)

## Фаза 3 — Голос (отдельный крупный этап, опционально/позже)

Английский выпускается в Фазе 2 **без голоса** (он opt-in, по умолчанию выключен).

- ⏳ Языковой профиль голоса: грамматика команд, числительные, fuzzy-матчинг — англ. вариант
- ⏳ `recognition.lang` по локали (`useVoiceInput`)
- ⏳ condition-парсер возвращает канонический ключ, а не русскую строку

## Фаза 4 — Контент и витрина ✅ (частично)

- ✅ changelog — поле `changesEn?: string[]` в `ChangelogEntry`; все 58 записей переведены.
  `AboutScreen` показывает `changesEn` при `locale === 'en'`, `changes` иначе.
- ✅ `docs/guide_en.html` — полный перевод гайда на английский (2 страницы A4, та же структура).
  Ссылка в About адаптирована: `guide_en.html` для EN, `guide.html` для RU.
- ⏳ `presentation/*.html`, `onepager.html` — при необходимости
- ⏳ store-листинги
