# AppTochite — контекст для Claude Code

## Что это за проект

**AppTochite** — мобильное PWA-приложение для профессиональных заточников ножей.  
Версия: **2.6.1** · Платформа: Android (90%) · PWA (GitHub Pages) и off-store APK (Capacitor) · интерфейс на **русском и английском** (см. i18n ниже).

Два сегмента пользователей через единый интерфейс:
- Заточник как малый бизнес — клиенты, выручка, статусы
- Заточник «для себя» — личный журнал (представлен нулевым клиентом «Я»)

Спецификация: `docs/AppTochite_spec_v0.4.md`

---

## Стек

| Слой | Технология |
|---|---|
| Фреймворк | React 19 + TypeScript |
| Роутинг | React Router v7 (`createBrowserRouter`) |
| БД | Dexie.js (IndexedDB, локально на устройстве) |
| Стили | CSS Modules + design tokens (`tokens.css`) |
| Сборка | Vite |
| Платформа | PWA (Workbox) + off-store APK (Capacitor, `vite build --mode capacitor` → `cap sync android`) |
| Деплой | PWA: GitHub Pages (CI: GitHub Actions, Node 24). APK: GitHub Release (ручная сборка/публикация) |

`import.meta.env.MODE === 'capacitor'` (обычно алиас `IS_CAPACITOR`) — главный переключатель веток PWA/APK по всему коду; Rollup вырезает неиспользуемую ветку и её динамические импорты из соответствующего бандла (DCE), поэтому PWA не тянет Capacitor-плагины и наоборот.

---

## Структура файлов

```
src/
  router.tsx             # Все маршруты
  App.tsx / App.module.css
  main.tsx

  styles/
    reset.css
    tokens.css           # CSS-переменные (цвета, отступы, типографика)

  config/
    features.ts          # FEATURES: voiceInput (выкл. в APK-сборке), cloudBackup; isVoiceEnabled()/setVoiceEnabled() читают/пишут localStorage; isMigrationPromptEnabled() — баннер PWA→APK
    fontScale.ts         # Масштаб интерфейса (device-specific, localStorage, вне бэкапа) — CSS zoom на <body>

  contexts/
    AutoBackupContext.tsx # Единая точка автобэкапа: дебаунс + requestBackup(), веером пишет во все включённые слоты (OPFS, папка, облако)

  plugins/
    safFolder.ts          # Обёртка нативного Capacitor-плагина SafFolder (Android SAF) — папочный автобэкап в APK; регистрируется только в cap-ветке

  i18n/                  # Слой мультиязычности (см. docs/i18n-plan.md). ru — канонический источник формы, en.ts переведён полностью (Фазы 0–4 завершены: UI, справочники, голос, ченджлог, guide_en.html)
    locale.ts            # Тип Locale, чтение/запись языка в localStorage (вне бэкапа), <html lang>
    plural.ts            # Универсальный plural() на Intl.PluralRules (ru + en); plural.test.ts
    format.ts            # fmtDate/fmtDateTime/fmtMoney/fmtNumber на Intl
    enums.test.ts        # Тест структурного соответствия ru/en для всех enum-карт словаря
    dict/ru.ts           # Русский словарь — источник истины формы; Dict = typeof ru
    dict/en.ts           # Английский словарь — обязан содержать те же ключи (см. «Мультиязычность» ниже)
    dict/index.ts        # Карта dicts по локали
    LocaleProvider.tsx   # Провайдер + хуки useLocale/useT + тотальный enumLabel
    index.ts             # Barrel — единая точка импорта

  db/
    db.ts                # Dexie-схема (v11) и все TypeScript-типы
    instance.ts          # Экземпляр AppTochiteDB + реэкспорт типов
    seed.ts              # Предзаполненные справочники (101 камень, 219 сталей, 890 ножей)
    seed.test.ts         # Тесты seed-миграций (Vitest)
    preMigrationSnapshot.ts # Автоснимок данных перед апгрейдом схемы — страховка от битой миграции; preMigrationSnapshot.test.ts
    schemaIndexes.test.ts   # Тест: CURRENT_SCHEMA_VERSION совпадает с последней this.version(N) в конструкторе

  services/
    analytics.ts         # track()/trackOnce() — события в Google Sheet через Apps Script; офлайн-буфер (analyticsQueue); analytics.test.ts
    bugReport.ts         # collectDiagnostics/buildBugReportPayload/sendBugReport — «Сообщить об ошибке» в «О программе», очередь на офлайне; bugReport.test.ts

  components/            # Переиспользуемые UI-компоненты
    AppLogo/             # Двуцветная эмблема AppTochite (SVG)
    Autocomplete/        # Автодополнение для полей ввода; мульти-токенный поиск; поиск типа через *
    Avatar/              # Аватар клиента (с короной для нулевого клиента)
    BackupReminder/      # Напоминание о бэкапе с эскалацией: info (≥7д) / warn (≥14д или ≥10 новых записей) / critical (≥30д и ≥5 заточек — постоянная плашка над BottomNav)
    BottomNav/           # Нижняя навигация + FAB
    BrowserWarning/      # Предупреждение при открытии в Telegram и других встроенных браузерах
    BugReportSheet/      # Форма «Сообщить об ошибке»: текст + контакт + превью диагностики, работает офлайн (очередь)
    ConfirmModal/        # Модалка подтверждения удаления (M-1)
    DataLossAlert/       # Плашка «данные пропали» — sentinel (снимок счётчиков) не совпал с пустой БД, ведёт на восстановление
    DictationButton/     # Кнопка-тумблер диктовочного режима в шапке формы заточки
    DictationCandidates/ # Нумерованный список кандидатов для fuzzy-выбора голосом
    DictationIndicator/  # Индикатор «Слышу: ...» с последней распознанной фразой
    EasterEgg/           # Пасхалка: 7 тапов по номеру версии в «О программе» — анимация раскола вордмарка
    ErrorBoundary/       # Локальная граница ошибок для некритичных виджетов — падает только сам виджет, не всё приложение
    FolderBackupPrompt/  # Нудж подключить папочный автобэкап (File System Access), реshow через 90 дней при ≥10 заточках
    InstallNudge/        # Приглашения установить PWA: InstallBanner, InstallNudgeSheet, IosInstallSheet (ручная установка через Safari «Поделиться»)
    Layout/              # Обёртка экрана (шапка + контент)
    MicButton/           # Кнопка голосового ввода (активна/слушает/недоступна)
    MigrationPrompt/     # Миграция PWA→APK: MigrationBanner (за флагом isMigrationPromptEnabled), MigrationSheet (шаги), NativeUpdateBanner (новый APK-релиз, только в cap-сборке)
    OnboardingSheet/     # Welcome-экран при первом запуске
    PhotoLightbox/       # Просмотр фото на весь экран
    PhotoReport/         # Генерация фото-отчёта заточки (canvas + Web Share API)
    PhotoShare/          # Шаринг фото «до/после» с вотермарком @AppTochite
    PhotoSourceSheet/    # Bottom sheet выбора источника фото (камера / галерея)
    StatusPill/          # Бейдж статуса заточки
    StorageRiskAlert/    # Детектор вытесняемого хранилища (не WebAPK) — ведёт на установку или бэкап; не показывается в APK
    StorageWarning/      # Предупреждение о заполнении хранилища
    Toast/               # Всплывающие уведомления (ToastContext)

  hooks/
    useCamera.ts             # Хук для съёмки/выбора фото
    useDictationMode.ts      # Диктовочный режим: непрерывный SR с авто-перезапуском, парсинг команд, счётчик ошибок
    useHardwareBackButton.ts # APK: подписка на аппаратную кнопку «назад» → SPA-навигация вместо закрытия приложения
    useInstallPrompt.ts      # Реактивная обёртка над utils/installPrompt (canInstall + promptInstall)
    useTwoPhaseVoice.ts      # Двухфазный голосовой ввод: распознавание → список совпадений → довыбор
    useVersionCheck.ts       # Проверка обновлений через GitHub API (PWA) / GitHub Releases APK-ассет (cap)
    useVoiceInput.ts         # Базовый хук Web Speech API (isAvailable, isListening, start, stop)

  data/
    changelog.ts         # Записи ченджлога для экрана «О программе» (ru + changesEn)
    gritTable.ts          # Таблица соответствий гритности FEPA/JIS/ГОСТ/микроны, конвертеры from*()

  utils/
    backup.ts             # Экспорт/импорт JSON, mergeBackup, buildCSV, OPFS/папочный автобэкап, sentinel, steelNatKey/knifeNatKey
    backup.test.ts        # Тесты backup-утилит (Vitest)
    cloudAuthNative.ts    # Нативный Яндекс-OAuth для APK через @capacitor/inappbrowser (перехват redirect во встроенном WebView)
    cloudBackup.ts        # Облачный бэкап через Яндекс.Диск REST API: токен, дневной гейт, сигнатура данных, снимки по устройствам; cloudBackup.test.ts
    fileSystemAccess.ts   # Утилиты File System Access API для автобэкапа в папку (PWA)
    installPrompt.ts      # Тонкий слой над beforeinstallprompt (PWA-установка); слушатели вешаются при импорте из main.tsx
    knifeImport.ts        # Импорт ножей из xlsx/csv: readSpreadsheet (read-excel-file через динамический импорт), parseCsv, detectColumns, prepareImport
    knifeImport.test.ts   # Тесты импорта ножей (Vitest)
    mergeCrossDevice.test.ts # Тесты кросс-девайсного merge по guid (backup.ts)
    modalBlur.ts          # Утилита блюра фона (#root) при открытых диалогах
    nativeFolderBackup.ts # Папочный автобэкап в APK через Storage Access Framework (нативный пикер + persistable tree Uri)
    nativeShare.ts        # Нативный шаринг файлов в APK (@capacitor/share + @capacitor/filesystem, cache-подпапка с уникальным именем на каждый вызов — иначе принимающие приложения кэшируют старые байты по тому же content:// URI)
    openGuide.ts          # Открытие guide.html/guide_en.html: новая вкладка (PWA) или @capacitor/browser Custom Tab (APK)
    platform.ts           # Платформенные проверки установки PWA (isStandalone и т.п., включая iOS-специфику)
    refSync.ts            # Полная синхронизация справочников «Стали»/«Ножи» (экспорт CSV → правка в Excel → импорт с реальным add/update/delete по natural key steelNatKey/knifeNatKey из backup.ts). Камни не участвуют — их CSV-импорт остаётся только аддитивным
    refSync.test.ts       # Тесты refSync (Vitest)
    steelMatch.ts         # Матчинг марок стали при импорте: normSteel (визуальная свёртка х→x, а не фонетическая h) + exact/fuzzy/none. 95x18→95Х18, Д2→D2
    steelMatch.test.ts    # Тесты steelMatch (Vitest)
    storagePersistence.ts # navigator.storage.persist() + детектор вытесняемого хранилища (сигнал «WebAPK установлен некорректно»)
    trash.ts              # Soft-delete клиентов/заточек, корзина (batchId, TTL 3 дня), restoreBatch/purgeBatch/purgeExpired
    trash.test.ts         # Тесты корзины (Vitest)
    uuid.ts                # Генератор uuid с фолбэком для сред без crypto.randomUUID (guid записей, batchId корзины, имена файлов при шаринге)
    vcard.ts               # buildVCard(client) — vCard 3.0 для QR-кода цифровой визитки; vcard.test.ts
    voiceCommand.ts       # Парсер команд диктовочного режима (Command, FieldKey, CommandContext), ru + en
    voiceCommand.test.ts  # Тесты парсера команд (Vitest)
    voiceMatch.ts         # Fuzzy-матчинг для голосового ввода (транслитерация + bigram), ru + en
    voiceMatch.test.ts    # Тесты voiceMatch (Vitest)

  screens/
    About/
      AboutScreen.tsx     # A-1 — «О программе»: версия, проверка обновлений, ченджлог, настройки (голос, аналитика, язык, масштаб текста), «Сообщить об ошибке», пасхалка
    Backup/
      BackupScreen.tsx    # BK-1 — бэкап и восстановление: лесенка надёжности (браузер OPFS → папка → облако Яндекс.Диск), единый список копий для восстановления
      OAuthCallback.tsx   # Обработка редиректа Яндекс OAuth (PWA-ветка): токен из #fragment, мягкий редирект на / без активного flow
    BusinessCard/
      BusinessCardScreen.tsx # Цифровая визитка self-клиента «Я»: фото, компания/специализация/услуги/контакты, canvas-рендер карточки с QR (vCard), шаринг картинкой
    Clients/
      ClientList.tsx      # C-1 — список клиентов
      ClientCard.tsx      # C-2 — карточка клиента
      ClientForm.tsx      # C-3 — добавить/редактировать клиента
    Games/                # Игры-тренажёры (ссылка из ReferenceScreen); чистая логика вынесена из React-компонентов для юнит-тестов
      GamesHub.tsx           # Хаб игр, список строится из registry.ts
      registry.ts            # Реестр игр: id/path/title/subtitle/ready — единственное место, где добавлять новую игру
      ProgressionGame.tsx    # «Расставь камни» — тренажёр зернистости: drag&drop сортировка набора камней по микронам
      progressionLogic.ts    # Чистая логика: pickRound/isSolved/scaleVariety; progressionLogic.test.ts
      AngleGame.tsx          # «Верный угол» — тренажёр глазомера: угадать угол заточки на сторону по SVG-клину, хард-режим с наклоном фигуры
      angleLogic.ts          # Чистая логика: rndAngle/verdictOf/tiltForRound/wedgeAngles; angleLogic.test.ts
    History/
      HistoryFeed.tsx     # H-1 — лента заточек
    Reference/
      ReferenceScreen.tsx # S-1/2/3 — справочники (Камни / Стали / Ножи). Ножи: импорт из xlsx/csv с распознаванием стали (KnifeImportPreview), инлайн-редактирование ножа/камня по выделению. Стали и Ножи: отдельная пара «Экспорт CSV»/«Синхронизировать» (RefSyncPreviewDialog) — полная синхронизация с реальным удалением записей, которых нет в загруженном файле; отличается от аддитивного CSV-импорта камней
    Sharpening/
      SharpeningForm.tsx  # Z-1 — приёмка (клиент, нож, сталь, HRC, требуется, цена, фото «До»); диктовочный режим
      SharpeningDetail.tsx# Z-2 — экран заточки: инлайн-редактирование (угол, микроподвод, камни, комментарий, фото «После»), статус, удаление в корзину
    Trash/
      TrashScreen.tsx     # Корзина — список soft-deleted записей, восстановление batch'а, удаление навсегда
```

---

## База данных (Dexie)

Таблицы: `clients`, `sharpenings`, `stones`, `steels`, `knives`, `meta`, `settings`, `analyticsQueue`

Схема версионирована (текущая **v11**, `CURRENT_SCHEMA_VERSION` в `db.ts`). Новые изменения добавлять через `this.version(N)` **и** бампать `CURRENT_SCHEMA_VERSION` — иначе `preMigrationSnapshot` не сработает на новой миграции (проверяется `schemaIndexes.test.ts`).

**История версий схемы:**
- v1: начальная схема (clients, sharpenings, stones, steels, knives)
- v2: индекс grit на stones
- v3: таблица `meta` для seed-миграций
- v4: таблица `settings` — device-specific состояние, **не входит в бэкап**. `firstLaunchAt`, `lastBackupAt` перенесены из `meta`
- v5: `updatedAt` у всех сущностей — last-write-wins для merge-бэкапа
- v6: таблица `analyticsQueue` — офлайн-буфер событий аналитики, **не входит в бэкап**
- v7: четыре шкалы гритности (`gritFepa`, `gritJis`, `gritMicrons`, `gritMk`) хранятся явно; старые `grit`/`gritUnit` конвертируются через `GRIT_TABLE`
- v8: soft-delete для `clients` и `sharpenings` — 3 дня в корзине (`deletedAt`, `deletedBatchId`), индекс `deletedAt` для быстрого purge и листинга
- v9: `guid` у `clients`/`sharpenings` — кросс-устройственная идентичность записи. `id` — автоинкремент, у каждого устройства свой, поэтому merge чужого бэкапа сопоставляет по `guid`. Существующим записям guid присвоен миграцией; новые получают его при создании (`uuid()` из `utils/uuid.ts`)
- v10: составные индексы `[clientId+status]` (счётчики в C-1 без чтения фото) и `[clientId+knifeBrand]` (частота брендов ножей для подсказок в Z-1); чисто аддитивно, апгрейд-функция не нужна
- v11: составные индексы `[status+receivedAt]` и `[clientId+receivedAt]` — дают Dexie `.offset()/.limit()` в хронологическом порядке без чтения фото записей, которые не попадут на текущую страницу (HistoryFeed, ClientCard); чисто аддитивно

Поля, добавленные без бампа схемы (неиндексируемые, миграция Dexie не нужна): `Sharpening.microbevelAngle?: number` (микроподвод — второй, более тупой угол кромки) и `Client.company/specialization/services?: string` (цифровая визитка, заполняются только у self-клиента «Я»).

**Ключевые особенности схемы:**
- `clients.isSelf = true` — нулевой клиент «Я», создаётся при первом запуске, не удаляется
- `sharpenings.stones` — embedded JSON (`SharpeningStone[]`), **не отдельная таблица**. При реализации фильтрации по камням потребуется fullscan — учитывать при проектировании
- `Sharpening.status` — только два значения: `'accepted' | 'done'`; статуса `inwork` нет
- `Sharpening` — `doneAt` обязателен только при `status === 'done'`
- `Stone.type` — 9 значений: `'galvanic' | 'ao' | 'kk' | 'diamond' | 'elbor' | 'natural' | 'pritir' | 'ceramic' | 'other'`
- `Stone.coolant` — необязательное: `'water' | 'oil' | 'both'` (СОЖ). Поиск через `*вода` / `*масло`
- `meta` — служебная таблица (ключ-значение), хранит `seedVersion` для контроля seed-миграций
- `settings` — device-specific (firstLaunchAt, lastBackupAt, автобэкап), **не включается в JSON-бэкап и не восстанавливается при импорте**
- `analyticsQueue` — очередь событий аналитики для офлайн-буферизации; **не входит в бэкап**
- `deletedAt?: Date` + `deletedBatchId?: string` у `Client` и `Sharpening` — soft-delete. Удаление клиента помечает все его заточки тем же `deletedBatchId` для группового восстановления. Записи с `deletedAt` исключаются из всех списков и фильтруются в CSV-экспорте, но **остаются в JSON-бэкапе** (чтобы удаления распространялись через merge). Покидают БД через `purgeExpired` (TTL 3 дня) или вручную через корзину. **При merge tombstone устройства sticky**: если на устройстве запись в корзине, а файл несёт «живую» версию без `deletedAt`, файл игнорируется — иначе свежая правка на другом устройстве воскрешала бы запись до истечения окна корзины. Восстановление возможно только вручную через `TrashScreen`
- Фото хранятся как `base64[]` в полях `photosBefore` / `photosAfter`
- `updatedAt?: Date` — есть у всех сущностей (`Client`, `Sharpening`, `Stone`, `Steel`, `Knife`). Проставляется при каждом create/update. Используется в `mergeBackup` для last-write-wins разрешения конфликтов
- **Идентичность при merge** (`mergeBackup`): `clients`/`sharpenings` — по `guid`; «Я» всегда мапится на локального `isSelf`-клиента; файлы без guid (старые экспорты) — по `id` (прежнее поведение для restore на том же устройстве). Справочники — по natural key: стали `normSteel(name)`, ножи `brand+steel`, камни `brand+гритность`. Коллизия `id` (чужая запись с занятым id) разрешается вставкой под новым автоинкрементным id, `clientId` заточек ремапится. `restoreBackup` присваивает guid легаси-записям при восстановлении. Тесты — `mergeCrossDevice.test.ts`. `steelNatKey`/`knifeNatKey` экспортированы из `backup.ts` и переиспользуются в `refSync.ts` для полной синхронизации справочников — тот же natural key, что и при кросс-девайсном merge. **Известная проблема**: в сид-данных есть редкие дубли, схлопывающиеся в один natural key после нормализации (напр. «CPM CruWear»/«CPM-CruWear»); `refSync.ts` такие ключи помечает неоднозначными и не трогает вовсе — иначе значение одной записи тихо приписывалось бы другой

---

## Маршруты

| Путь | Экран |
|---|---|
| `/` | C-1 Список клиентов |
| `/clients/:id` | C-2 Карточка клиента |
| `/clients/new` | C-3 Добавить клиента |
| `/clients/:id/edit` | C-3 Редактировать клиента |
| `/business-card` | Цифровая визитка self-клиента «Я» |
| `/history` | H-1 Лента заточек |
| `/sharpenings/new?clientId=X` | Z-1 Приёмка (clientId предзаполняет клиента и скрывает поле). После «Принять в заточку» → Z-2 |
| `/sharpenings/:id` | Z-2 Экран заточки — инлайн-редактирование (угол, микроподвод, камни, комментарий, фото «После»), смена статуса |
| `/sharpenings/:id/edit` | Z-1 Редактирование приёмки |
| `/reference/:tab` | S-1/2/3 Справочники (tab: stones/steels/knives) |
| `/backup` | BK-1 Бэкап и восстановление данных |
| `/oauth/yandex/callback` | Обработка редиректа Яндекс OAuth (PWA-ветка облачного бэкапа) |
| `/about` | A-1 «О программе» (версия, обновления, ченджлог, настройки) |
| `/trash` | Корзина — soft-deleted клиенты и заточки (восстановление / удаление навсегда) |
| `/games`, `/games/progression`, `/games/angle` | Хаб игр-тренажёров и сами игры (см. `screens/Games/registry.ts`) |

PWA живёт на GitHub Pages под `/AppTochite/`, APK (cap-сборка) — на `https://localhost/`; `basename` роутера переключается по `import.meta.env.MODE === 'capacitor'`.

---

## UX-правила (соблюдать строго)

- Нулевой клиент «Я» (`isSelf: true`) — закреплён вверху C-1, **не удаляется**
- Удаление клиента удаляет все его заточки
- Удаление клиента и заточки — **только через карточку с подтверждением (M-1)**, без свайпа
- Кнопка «+ Заточка» доступна с любого экрана (bottom navigation)
- Статус `done` → автоматически проставляет `doneAt`
- Фото «До» — предлагается после сохранения шага 1 (Приёмка), можно пропустить
- Фото «После» — предлагается при переходе статуса в `done`, можно пропустить
- Поле «Финиш» **удалено** из формы заточки — не добавлять
- Голосовой ввод — opt-out: включён по умолчанию, пользователь может отключить в «О программе». В localStorage пишется только явное отключение (`voice_input_enabled = 'false'`), отсутствие ключа = включено. Один тумблер управляет и точечным голосом полей, и диктовочным режимом
- Диктовочный режим — на обоих экранах заточки: Z-1 (приёмка) диктует свои поля (`клиент`, `нож`, `сталь`, `твёрдость`, `требуется`, `цена`), Z-2 (заточка) — свои (`камень`, `угол`, `примечание`/`комментарий`). Strict-грамматика: каждая команда начинается с префикса поля. Команда чужого экрана игнорируется (тост-подсказка). Подробности и список команд — `docs/voice-input-plan.md`
- Один SpeechRecognition в каждый момент: при включении диктовки точечные mic-кнопки гасятся, и наоборот — две сессии конкурируют за микрофон
- Аналитика — opt-out: включена по умолчанию, пользователь может отключить в «О программе»
- Цифровая визитка (`/business-card`) — только для self-клиента «Я»; поля `company`/`specialization`/`services` не показываются и не редактируются для обычных клиентов
- Игры-тренажёры (`/games/*`) — самостоятельный, изолированный от основного сценария модуль (обучение глазомеру/зернистости); не пишут и не читают `clients`/`sharpenings`, рекорд хранится в `localStorage` (вне бэкапа, как язык интерфейса)
- Облачный бэкап (Яндекс.Диск) — opt-in по факту действия пользователя (подключение токена), не по флагу: `FEATURES.cloudBackup` включает саму возможность у всех, а не заводит бэкап автоматически. Льётся не чаще раза в сутки и только при изменении данных (сигнатура `count+maxUpdatedAt`) — не спамить API при каждом открытии приложения
- Баннер миграции PWA→APK (`MigrationBanner`) показывается только при `isMigrationPromptEnabled()` (вкл. с релиза 2.0.0) и никогда в самой APK-сборке — мигрировать там уже некуда

---

## Design System

Все цвета через CSS-переменные из `tokens.css`. Основные:

```css
--accent: #4A90D9
--status-accepted: #4A90D9   /* синий */
--status-done:     #3DB87A   /* зелёный */
--danger:          #E05555
```

Стили — CSS Modules (`ComponentName.module.css` рядом с компонентом).

---

## Мультиязычность (i18n) — в работе

Идёт поэтапный переход на мультиязычность (ru → ru/en). Полный план и статус: **`docs/i18n-plan.md`**.

**Главный принцип (соблюдать строго):** локализация — ТОЛЬКО на границе отображения, **хранимые
данные не мигрируются**. Каноническое значение в БД остаётся как есть; перевод через тотальные
функции `value → label[locale]` с фолбэком на `raw`. Поэтому схема БД, формат бэкапа, merge и restore
**не затрагиваются** — данные пользователя не страдают. Язык хранится в `localStorage` (вне бэкапа).

Практика:
- Текст в UI — через `useT()` (`import { useT } from '../i18n'`), а не хардкод-строкой
- enum-подписи (тип камня, СОЖ, status, condition, country) — через `enumLabel(t.enums.X, value)`;
  **дропдауны пишут в БД канонический ключ, а не подпись**
- Даты/деньги — через `fmtDate`/`fmtMoney` по локали (не `toLocaleDateString('ru')`)
- Словарь-эталон — `src/i18n/dict/ru.ts`; английский `src/i18n/dict/en.ts` **уже существует**
  (Фазы 0–4 завершены — UI, справочники, голос на двух языках, ченджлог и `guide_en.html`; см. `docs/i18n-plan.md`) и обязан содержать те же ключи — `Dict = Widened<typeof ru>`
  в `dict/index.ts` требует от `en` структурного соответствия. **Любой новый ключ в `ru.ts` нужно сразу
  дублировать в `en.ts`**, иначе `npm run build` (`tsc -b`) упадёт на несовпадении типов — `tsc --noEmit -p .`
  без `-b` это НЕ ловит, т.к. корневой `tsconfig.json` solution-style (`references`, без файлов)
- Решения по форме: `status` — везде строчными (`принят`/`готов`); тип камня/СОЖ — везде строчными;
  валюта en — USD ($), ru — RUB (₽). Подробности — в плане

---

## Бэклог (не реализовывать без явного запроса)

- Статистика по камням (fullscan sharpenings — учесть при проектировании)
- Финансовая аналитика — выручка за период, средний чек
- Drag-to-reorder камней в форме заточки (вне игры «Расставь камни» — там drag&drop уже есть, но это тренажёр, а не рабочая форма)
- Голосовая диктовка микроподвода (МП) на Z-2 — команда `микроподвод <число>` (см. `docs/voice-input-plan.md`); само поле `microbevelAngle` и ползунок уже реализованы, не хватает только голосовой команды
- Распознавание ножа по фото (Claude API)
- Push-уведомления клиенту
- Суммарная выручка в карточке клиента C-2
- Вынос фото заточек (`photosBefore`/`photosAfter`) в отдельную таблицу по `sharpeningId` — IndexedDB не умеет читать «часть» записи, поэтому любой списковый запрос по `sharpenings` (история, карточка клиента, heatmap камней) читает и разворачивает все фото, даже когда они не нужны для отображения. Актуально, если объём фото у активных пользователей продолжит расти — тогда сегодняшняя постраничная загрузка (см. `[status+receivedAt]`/`[clientId+receivedAt]` в схеме) перестанет быть достаточной. Важно: полный экспорт бэкапа всё равно обязан прочитать все фото — разделение таблиц не снижает стоимость бэкапа, только снимает нагрузку с обычного просмотра
