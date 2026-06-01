# AppTochite — контекст для Claude Code

## Что это за проект

**AppTochite** — мобильное PWA-приложение для профессиональных заточников ножей.  
Версия: **1.78.0** · Платформа: Android (90%), интерфейс полностью на **русском языке**.

Два сегмента пользователей через единый интерфейс:
- Заточник как малый бизнес — клиенты, выручка, статусы
- Заточник «для себя» — личный журнал (представлен нулевым клиентом «Я»)

Спецификация: `docs/AppTochite_spec_v0.4.md`

---

## Стек

| Слой | Технология |
|---|---|
| Фреймворк | React 18 + TypeScript |
| Роутинг | React Router v6 (`createBrowserRouter`) |
| БД | Dexie.js (IndexedDB, локально на устройстве) |
| Стили | CSS Modules + design tokens (`tokens.css`) |
| Сборка | Vite |
| Платформа | PWA (Workbox) |
| Деплой | GitHub Pages (CI: GitHub Actions, Node 24) |

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
    features.ts          # Feature flags: voiceInput (мастер-выключатель); isVoiceEnabled() читает localStorage

  db/
    db.ts                # Dexie-схема (v8) и все TypeScript-типы
    seed.ts              # Предзаполненные справочники (101 камень, 219 сталей, 890 ножей)
    seed.test.ts         # Тесты seed-миграций (Vitest)

  components/            # Переиспользуемые UI-компоненты
    AppLogo/             # Двуцветная эмблема AppTochite (SVG)
    Autocomplete/        # Автодополнение для полей ввода; мульти-токенный поиск; поиск типа через *
    Avatar/              # Аватар клиента (с короной для нулевого клиента)
    BackupReminder/      # Напоминание о бэкапе с эскалацией: info (≥7д) / warn (≥14д или ≥10 новых записей) / critical (≥30д и ≥5 заточек — постоянная плашка над BottomNav)
    BottomNav/           # Нижняя навигация + FAB
    BrowserWarning/      # Предупреждение при открытии в Telegram и других встроенных браузерах
    ClientCard/          # Переиспользуемая строка клиента (используется в C-1)
    ConfirmModal/        # Модалка подтверждения удаления (M-1)
    DictationButton/     # Кнопка-тумблер диктовочного режима в шапке формы заточки
    DictationCandidates/ # Нумерованный список кандидатов для fuzzy-выбора голосом
    DictationIndicator/  # Индикатор «Слышу: ...» с последней распознанной фразой
    Layout/              # Обёртка экрана (шапка + контент)
    MicButton/           # Кнопка голосового ввода (активна/слушает/недоступна)
    OnboardingSheet/     # Welcome-экран при первом запуске
    PhotoLightbox/       # Просмотр фото на весь экран
    PhotoReport/         # Генерация фото-отчёта заточки (canvas + Web Share API)
    PhotoShare/          # Шаринг фото «до/после» с вотермарком @AppTochite
    PhotoSourceSheet/    # Bottom sheet выбора источника фото (камера / галерея)
    SharpeningRow/       # Переиспользуемая строка заточки (используется в C-2 и H-1)
    StatusPill/          # Бейдж статуса заточки
    StorageWarning/      # Предупреждение о заполнении хранилища
    Toast/               # Всплывающие уведомления (ToastContext)

  hooks/
    useCamera.ts         # Хук для съёмки/выбора фото
    useDictationMode.ts  # Диктовочный режим: непрерывный SR с авто-перезапуском, парсинг команд, счётчик ошибок
    useTwoPhaseVoice.ts  # Двухфазный голосовой ввод: распознавание → список совпадений → довыбор
    useVersionCheck.ts   # Проверка обновлений через GitHub API
    useVoiceInput.ts     # Базовый хук Web Speech API (isAvailable, isListening, start, stop)

  data/
    changelog.ts         # Записи ченджлога для экрана «О программе»

  utils/
    backup.ts            # Экспорт/импорт JSON, mergeBackup, buildCSV
    backup.test.ts       # Тесты backup-утилит (Vitest)
    fileSystemAccess.ts  # Утилиты File System Access API для автобэкапа в папку
    modalBlur.ts         # Утилита блюра фона (#root) при открытых диалогах
    voiceCommand.ts      # Парсер команд диктовочного режима (Command, FieldKey, CommandContext)
    voiceCommand.test.ts # Тесты парсера команд (Vitest, 67 кейсов)
    voiceMatch.ts        # Fuzzy-матчинг для голосового ввода (транслитерация + bigram)
    voiceMatch.test.ts   # Тесты voiceMatch (Vitest)
    steelMatch.ts        # Матчинг марок стали при импорте: normSteel (визуальная свёртка х→x, а не фонетическая h) + exact/fuzzy/none. 95x18→95Х18, Д2→D2
    steelMatch.test.ts   # Тесты steelMatch (Vitest)
    knifeImport.ts       # Импорт ножей из xlsx/csv: readSpreadsheet (read-excel-file через динамический импорт), parseCsv, detectColumns, prepareImport
    knifeImport.test.ts  # Тесты импорта ножей (Vitest)
    trash.ts             # Soft-delete клиентов/заточек, корзина (batchId, TTL 3 дня), restoreBatch/purgeBatch/purgeExpired
    trash.test.ts        # Тесты корзины (Vitest)

  screens/
    About/
      AboutScreen.tsx     # A-1 — «О программе»: версия, проверка обновлений, ченджлог, настройки (голос, аналитика)
    Backup/
      BackupScreen.tsx    # BK-1 — бэкап и восстановление; автобэкап через File System Access API
    Clients/
      ClientList.tsx      # C-1 — список клиентов
      ClientCard.tsx      # C-2 — карточка клиента
      ClientForm.tsx      # C-3 — добавить/редактировать клиента
    History/
      HistoryFeed.tsx     # H-1 — лента заточек
    Sharpening/
      SharpeningForm.tsx  # Z-1 — приёмка (клиент, нож, сталь, HRC, требуется, цена, фото «До»); диктовочный режим
      SharpeningDetail.tsx# Z-2 — экран заточки: инлайн-редактирование (угол, камни, комментарий, фото «После»), статус, удаление в корзину
    Reference/
      ReferenceScreen.tsx # S-1/2/3 — справочники (Камни / Стали / Ножи). Ножи: импорт из xlsx/csv с распознаванием стали (KnifeImportPreview), инлайн-редактирование ножа/камня по выделению
    Trash/
      TrashScreen.tsx     # Корзина — список soft-deleted записей, восстановление batch'а, удаление навсегда
```

---

## База данных (Dexie)

Таблицы: `clients`, `sharpenings`, `stones`, `steels`, `knives`, `meta`, `settings`, `analyticsQueue`

Схема версионирована (текущая **v8**). Новые изменения добавлять через `this.version(N)`.

**История версий схемы:**
- v1: начальная схема (clients, sharpenings, stones, steels, knives)
- v2: индекс grit на stones
- v3: таблица `meta` для seed-миграций
- v4: таблица `settings` — device-specific состояние, **не входит в бэкап**. `firstLaunchAt`, `lastBackupAt` перенесены из `meta`
- v5: `updatedAt` у всех сущностей — last-write-wins для merge-бэкапа
- v6: таблица `analyticsQueue` — офлайн-буфер событий аналитики, **не входит в бэкап**
- v7: четыре шкалы гритности (`gritFepa`, `gritJis`, `gritMicrons`, `gritMk`) хранятся явно; старые `grit`/`gritUnit` конвертируются через `GRIT_TABLE`
- v8: soft-delete для `clients` и `sharpenings` — 3 дня в корзине (`deletedAt`, `deletedBatchId`), индекс `deletedAt` для быстрого purge и листинга

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

---

## Маршруты

| Путь | Экран |
|---|---|
| `/` | C-1 Список клиентов |
| `/clients/:id` | C-2 Карточка клиента |
| `/clients/new` | C-3 Добавить клиента |
| `/clients/:id/edit` | C-3 Редактировать клиента |
| `/history` | H-1 Лента заточек |
| `/sharpenings/new?clientId=X` | Z-1 Приёмка (clientId предзаполняет клиента и скрывает поле). После «Принять в заточку» → Z-2 |
| `/sharpenings/:id` | Z-2 Экран заточки — инлайн-редактирование (угол, камни, комментарий, фото «После»), смена статуса |
| `/sharpenings/:id/edit` | Z-1 Редактирование приёмки |
| `/reference/:tab` | S-1/2/3 Справочники (tab: stones/steels/knives) |
| `/backup` | BK-1 Бэкап и восстановление данных |
| `/about` | A-1 «О программе» (версия, обновления, ченджлог, настройки) |
| `/trash` | Корзина — soft-deleted клиенты и заточки (восстановление / удаление навсегда) |

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

## Бэклог (не реализовывать без явного запроса)

- Статистика по камням (fullscan sharpenings — учесть при проектировании)
- Финансовая аналитика — выручка за период, средний чек
- Drag-to-reorder камней в форме заточки
- Распознавание ножа по фото (Claude API)
- Облачная синхронизация
- Push-уведомления клиенту
- Суммарная выручка в карточке клиента C-2
