export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
  changesEn?: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.104.0',
    date: '2026-06-22',
    changes: [
      'Исправления и улучшения',
    ],
  },
  {
    version: '1.103.0',
    date: '2026-06-22',
    changes: [
      'Угол заточки и микроподвод теперь регулируются ползунком с шагом 0,1° и шкалой 10–45°',
      'Микроподвод по умолчанию ставится на 2° тупее основного угла',
    ],
  },
  {
    version: '1.102.0',
    date: '2026-06-22',
    changes: [
      'Добавлен угол микроподвода (МП) на экране заточки',
    ],
  },
  {
    version: '1.101.0',
    date: '2026-06-21',
    changes: [
      'Исправления и улучшения',
    ],
  },
  {
    version: '1.100.0',
    date: '2026-06-21',
    changes: [
      'Исправления и улучшения',
    ],
  },
  {
    version: '1.99.0',
    date: '2026-06-21',
    changes: [
      'Исправления и улучшения',
    ],
  },
  {
    version: '1.98.1',
    date: '2026-06-21',
    changes: [
      'Исправления и улучшения',
    ],
  },
  {
    version: '1.98.0',
    date: '2026-06-21',
    changes: [
      'Счётчик заточенных ножей в шапке экрана «История»',
      'Авто-бэкап больше не перезаписывает резервную копию пустой базой данных',
    ],
  },
  {
    version: '1.97.0',
    date: '2026-06-21',
    changes: [
      'Игра «Расставь камни» — тренажёр зернистости в справочнике',
    ],
  },
  {
    version: '1.96.0',
    date: '2026-06-11',
    changes: [
      'Ссылка на сайт приложения в экране «О программе»',
    ],
  },
  {
    version: '1.95.0',
    date: '2026-06-11',
    changes: [
      'Телефон и планшет хранят отдельные облачные бэкапы и больше не перетирают друг друга',
      'Объединение бэкапа с другого устройства больше не перемешивает клиентов',
      'Дата приёмки поздно вечером больше не сдвигается на вчерашний день',
      'Сбой сети больше не отменяет облачный авто-бэкап на весь день',
      'Открытие удалённой записи показывает понятное сообщение вместо пустого экрана',
    ],
  },
  {
    version: '1.94.0',
    date: '2026-06-10',
    changes: [
      'Авто-бэкап в облако загружается не чаще раза в сутки и только когда данные изменились',
    ],
  },
  {
    version: '1.93.1',
    date: '2026-06-10',
    changes: [
      'облачный бэкап через Яндекс.Диск REST API',
    ],
  },
  {
    version: '1.93.0',
    date: '2026-06-10',
    changes: [
      'Исправления и улучшения',
    ],
  },
  {
    version: '1.92.2',
    date: '2026-06-09',
    changes: [
      'на iOS использовать text/plain для CSV-вложения в Mail',
      'на iOS шарить бэкап как application/json, не text/plain',
    ],
  },
  {
    version: '1.92.1',
    date: '2026-06-09',
    changes: [
      'использовать downloadBlob для CSV на Android, share только на iOS',
      'добавить weekYear, fixGritMkColumn, fillWeekYearColumn в Apps Script',
    ],
  },
  {
    version: '1.92.0',
    date: '2026-06-09',
    changes: [
      'Исправления и улучшения',
    ],
  },
  {
    version: '1.91.4',
    date: '2026-06-09',
    changes: [
      'готовить CSV заранее, share() вызывать синхронно в обработчике клика',
    ],
  },
  {
    version: '1.91.3',
    date: '2026-06-09',
    changes: [
      'экспорт CSV через Web Share API вместо <a download>',
    ],
  },
  {
    version: '1.91.2',
    date: '2026-06-08',
    changes: [
      'добавить recoveryPoints в английский словарь',
    ],
  },
  {
    version: '1.91.1',
    date: '2026-06-08',
    changes: [
      'история версий приведена в порядок — убраны заглушки, уточнены описания',
    ],
  },
  {
    version: '1.91.0',
    date: '2026-06-08',
    changes: [
      'исправлено напоминание о бэкапе',
      'при старте проверяется целостность хранилища',
      'в разделе бэкапа виден предыдущий файл резервной копии',
    ],
  },
  {
    version: '1.90.0',
    date: '2026-06-08',
    changes: [
      'на экране бэкапа — статус защиты с датой последнего снимка',
      'при потере доступа к папке — подсказка перевыбрать',
      'синхронизация запускается при открытии раздела бэкапа',
      'промпт повторить выбор папки через 90 дней',
    ],
  },
  {
    version: '1.89.0',
    date: '2026-06-08',
    changes: [
      'перед восстановлением из файла автоматически сохраняется снапшот',
      'если папка бэкапа перемещена — приложение находит её само',
      'синхронизация файла выполняется в фоне',
    ],
  },
  {
    version: '1.88.0',
    date: '2026-06-08',
    changes: [
      'старые резервные копии в папке ротируются автоматически',
      'маркер целостности защищает от незаметной потери записей',
      'предупреждение при обнаружении расхождения в данных',
    ],
  },
  {
    version: '1.87.0',
    date: '2026-06-08',
    changes: [
      'бэкап сохраняется в выбранную папку автоматически — без подтверждения каждый раз',
      'защита от переполнения хранилища',
      'исправлено восстановление статистики аналитики после импорта',
    ],
  },
  {
    version: '1.86.1',
    date: '2026-06-05',
    changes: [
      'имя «Я» в выпадающем списке клиентов локализуется на Me',
    ],
  },
  {
    version: '1.86.0',
    date: '2026-06-05',
    changes: [
      'аватар клиента «Я» на английском интерфейсе показывает «Me»',
    ],
  },
  {
    version: '1.85.1',
    date: '2026-06-05',
    changes: [
      'исправлена самоссылка на английском — Me вместо I',
    ],
  },
  {
    version: '1.85.0',
    date: '2026-06-05',
    changes: [
      'клиент «Я» отображается как «I» на английском языке',
    ],
  },
  {
    version: '1.84.2',
    date: '2026-06-05',
    changes: [
      'синхронизация каталога камней при смене языка без перезагрузки',
    ],
  },
  {
    version: '1.84.1',
    date: '2026-06-05',
    changes: [
      'каталог камней меняется в обе стороны при смене языка',
    ],
  },
  {
    version: '1.84.0',
    date: '2026-06-04',
    changes: [
      'английский каталог камней — 80 позиций для новых EN-пользователей',
    ],
  },
  {
    version: '1.83.0',
    date: '2026-06-03',
    changes: [
      'переключатель языка вынесен на главный экран — ссылка ?lang=en',
      'пасхалка: при разрубании надписи звучит взмах клинка',
    ],
  },
  {
    version: '1.82.0',
    date: '2026-06-03',
    changes: [
      'переключатель языка перенесён в «Настройки» — раньше был в «О программе»',
      'английский гайд доступен по ссылке в «О программе» при выбранном языке EN',
    ],
    changesEn: [
      'language switcher moved to Settings — was previously in About',
      'English guide available via the link in About when EN language is selected',
    ],
  },
  {
    version: '1.81.2',
    date: '2026-06-03',
    changes: [
      'русский язык — по умолчанию для новых установок',
    ],
    changesEn: [
      'Russian is now the default language for new installs',
    ],
  },
  {
    version: '1.81.1',
    date: '2026-06-03',
    changes: [
      'устранена техническая ошибка в сборке — на работу приложения не влияла',
    ],
    changesEn: [
      'fixed a build error — did not affect app functionality',
    ],
  },
  {
    version: '1.81.0',
    date: '2026-06-02',
    changes: [
      'голосовой ввод работает на английском — диктовка, команды и подсказки на выбранном языке',
    ],
    changesEn: [
      'voice input works in English — dictation, commands and prompts follow the selected language',
    ],
  },
  {
    version: '1.80.0',
    date: '2026-06-02',
    changes: [
      'интерфейс можно переключить на английский язык — раздел «Настройки»',
    ],
    changesEn: [
      'the interface can be switched to English — Settings',
    ],
  },
  {
    version: '1.79.0',
    date: '2026-06-01',
    changes: [
      'голосовой ввод теперь включён по умолчанию — отключается в настройках',
    ],
    changesEn: [
      'voice input is now enabled by default — can be turned off in settings',
    ],
  },
  {
    version: '1.78.1',
    date: '2026-06-01',
    changes: [
      'краш при удалении из справочника после авто-перевода страницы браузером',
      'подсказка о формате файла под кнопкой импорта ножей',
    ],
    changesEn: [
      'crash when deleting from the reference after browser auto-translation',
      'hint about the file format below the knife import button',
    ],
  },
  {
    version: '1.78.0',
    date: '2026-06-01',
    changes: [
      'подсказка под кнопкой импорта ножей — какой формат файла загружать',
    ],
    changesEn: [
      'hint below the knife import button — which file format to upload',
    ],
  },
  {
    version: '1.77.1',
    date: '2026-06-01',
    changes: [
      'редактирование ножа в справочнике — кнопка «Изменить» при выделении',
    ],
    changesEn: [
      'knife editing in the reference — "Edit" button on selection',
    ],
  },
  {
    version: '1.77.0',
    date: '2026-06-01',
    changes: [
      'импорт ножей из файла xlsx/csv с автоматическим распознаванием стали',
    ],
    changesEn: [
      'knife import from xlsx/csv with automatic steel recognition',
    ],
  },
  {
    version: '1.76.0',
    date: '2026-06-01',
    changes: [
      'при выборе ножа подставляется его сталь, а нож сохраняется с учётом стали',
    ],
    changesEn: [
      'when a knife is selected its steel is filled in, and the knife is saved with steel information',
    ],
  },
  {
    version: '1.75.0',
    date: '2026-05-30',
    changes: [
      'исправлен чёрный экран, который мог появиться при первом запуске на новом устройстве',
      'спрятали небольшую пасхалку — найдёте сами 🙂',
    ],
    changesEn: [
      'fixed black screen that could appear on first launch on a new device',
      'added a small easter egg — find it yourself 🙂',
    ],
  },
  {
    version: '1.74.0',
    date: '2026-05-30',
    changes: [
      'поддержать развитие приложения теперь можно переводом на карту — блок с номером в «Настройках», нажатие копирует номер',
    ],
    changesEn: [
      'you can now support the app by card transfer — the number is in Settings, tap to copy',
    ],
  },
  {
    version: '1.72.0',
    date: '2026-05-30',
    changes: [
      'в справочнике камней — значение СОЖ «сухой» для камней без охлаждающей жидкости, находится по запросу *сухой',
    ],
    changesEn: [
      'in the stone reference — coolant value "dry" for stones without coolant, searchable via *dry',
    ],
  },
  {
    version: '1.71.0',
    date: '2026-05-30',
    changes: [
      'под кнопкой «Поделиться бэкапом» — пояснение, почему файл сохраняется с расширением .txt',
    ],
    changesEn: [
      'added a note below the Share Backup button explaining why the file is saved as .txt',
    ],
  },
  {
    version: '1.70.5',
    date: '2026-05-30',
    changes: [
      '«Поделиться бэкапом» — расширение .txt вместо .json (Chrome Android фильтрует по расширению), импорт принимает оба',
    ],
    changesEn: [
      '"Share Backup" — .txt extension instead of .json (Chrome Android filters by extension), import accepts both',
    ],
  },
  {
    version: '1.70.4',
    date: '2026-05-30',
    changes: [
      'убрана отладочная надпись об ошибке шаринга после стабилизации кнопки',
    ],
    changesEn: [
      'removed the debug share error toast after the button was stabilised',
    ],
  },
  {
    version: '1.70.3',
    date: '2026-05-30',
    changes: [
      'исправлена кнопка «Поделиться бэкапом» — теперь надёжно открывает системное меню «Поделиться»',
    ],
    changesEn: [
      'fixed the Share Backup button — now reliably opens the system share sheet',
    ],
  },
  {
    version: '1.70.2',
    date: '2026-05-30',
    changes: [
      'показывать настоящую ошибку шаринга в тосте — для диагностики',
    ],
    changesEn: [
      'show the real share error in a toast — for diagnostics',
    ],
  },
  {
    version: '1.70.1',
    date: '2026-05-30',
    changes: [
      'кнопка «Поделиться бэкапом» — отправка через системное меню (Telegram, почта, облако)',
    ],
    changesEn: [
      '"Share Backup" button — send via system share sheet (Telegram, email, cloud)',
    ],
  },
  {
    version: '1.70.0',
    date: '2026-05-30',
    changes: [
      'улучшен экран бэкапа: подсказки под кнопками и переработанный порядок действий',
    ],
    changesEn: [
      'improved backup screen: hints below buttons and revised action order',
    ],
  },
  {
    version: '1.69.0',
    date: '2026-05-30',
    changes: [
      'напоминание о бэкапе теперь нарастает: чем дольше не было бэкапа, тем заметнее подсказка — вплоть до постоянной плашки внизу экрана',
    ],
    changesEn: [
      'backup reminder now escalates: the longer since last backup, the more prominent the hint — up to a persistent banner at the bottom of the screen',
    ],
  },
  {
    version: '1.68.0',
    date: '2026-05-30',
    changes: [
      'перед обновлением структуры базы приложение делает резервный снимок данных — страховка на случай сбоя',
      'улучшена надёжность авто-бэкапа и работа корзины',
    ],
    changesEn: [
      'before a database upgrade the app saves a safety snapshot — protection against failed migration',
      'improved auto-backup reliability and trash behavior',
    ],
  },
  {
    version: '1.67.1',
    date: '2026-05-30',
    changes: [
      'объединение бэкапа больше не воскрешает удалённых клиентов и заточки из корзины',
      'удалённые клиенты и заточки попадают в корзину — можно восстановить в течение 3 дней',
      'автобэкап теперь хранит снимок за прошлый день — на случай если свежий бэкап испорчен',
      'форма заточки разделена на два экрана — приёмка и заточка с инлайн-редактированием',
    ],
    changesEn: [
      'merge backup no longer resurrects deleted clients and sharpenings from the trash',
      'deleted clients and sharpenings go to the trash — can be restored within 3 days',
      'auto-backup now keeps a snapshot from the previous day — in case the latest backup is corrupted',
      'sharpening form split into two screens — intake and sharpening with inline editing',
    ],
  },
  {
    version: '1.67.0',
    date: '2026-05-30',
    changes: [
      'удалённые клиенты и заточки теперь попадают в корзину — можно восстановить в течение 3 дней. Корзина — в разделе «О программе»',
    ],
    changesEn: [
      'deleted clients and sharpenings now go to the trash — can be restored within 3 days. Trash is in the About section',
    ],
  },
  {
    version: '1.66.0',
    date: '2026-05-29',
    changes: [
      'правки экранов приёмки и заточки после их разделения на два шага',
    ],
    changesEn: [
      'polish of intake and sharpening screens following the two-step split',
    ],
  },
  {
    version: '1.65.0',
    date: '2026-05-27',
    changes: [
      'форма заточки разделена на два экрана — приёмка и заточка с редактированием прямо в списке',
    ],
    changesEn: [
      'sharpening form split into two screens — intake and sharpening with inline editing',
    ],
  },
  {
    version: '1.64.5',
    date: '2026-05-27',
    changes: [
      'исправлен сбой при фотографировании на Android',
    ],
    changesEn: [
      'fixed a crash when taking photos on Android',
    ],
  },
  {
    version: '1.64.4',
    date: '2026-05-26',
    changes: [
      'кнопка «назад» — выход из приложения за 1-2 нажатия',
    ],
    changesEn: [
      '"back" button — exit the app in 1–2 taps',
    ],
  },
  {
    version: '1.64.3',
    date: '2026-05-21',
    changes: [
      'на шаге заточки — кнопки «Принято» и «Готово» вместо переключателя статуса',
    ],
    changesEn: [
      'on the sharpening step — "Accepted" and "Done" buttons instead of a status toggle',
    ],
  },
  {
    version: '1.64.2',
    date: '2026-05-21',
    changes: [
      'кнопка «ЗАТОЧИТЬ» открывает шаг заточки',
    ],
    changesEn: [
      '"SHARPEN" button opens the sharpening step',
    ],
  },
  {
    version: '1.64.1',
    date: '2026-05-21',
    changes: [
      'экспорт и импорт справочника камней в формате CSV',
      'добавлена шкала гритности ГОСТ в справочнике камней',
      'корректное восстановление камней из старых бэкапов',
    ],
    changesEn: [
      'export and import of stone reference in CSV format',
      'added GOST grit scale in the stone reference',
      'correct restoration of stones from old backups',
    ],
  },
  {
    version: '1.64.0',
    date: '2026-05-21',
    changes: [
      'кнопка «ЗАТОЧИТЬ» и статусные кнопки на экране заточки — первая версия',
    ],
    changesEn: [
      'SHARPEN button and status buttons on the sharpening screen — initial version',
    ],
  },
  {
    version: '1.63.0',
    date: '2026-05-21',
    changes: [
      'работа над разделением формы заточки на шаг приёмки и шаг заточки',
    ],
    changesEn: [
      'work on splitting the sharpening form into intake and sharpening steps',
    ],
  },
  {
    version: '1.62.2',
    date: '2026-05-21',
    changes: [
      'сортировка А-Я включает все камни, не только пользовательские',
    ],
    changesEn: [
      'A–Z sort includes all stones, not just user-added ones',
    ],
  },
  {
    version: '1.62.1',
    date: '2026-05-20',
    changes: [
      'уведомления о сохранении показываются только при голосовом вводе',
      'после «Готово» — возврат к списку клиентов',
    ],
    changesEn: [
      'save notifications shown only during voice input',
      'after "Done" — return to the client list',
    ],
  },
  {
    version: '1.62.0',
    date: '2026-05-20',
    changes: [
      'доработки сортировки и отображения камней после добавления импорта из CSV',
    ],
    changesEn: [
      'stone sorting and display fixes following the CSV import addition',
    ],
  },
  {
    version: '1.61.1',
    date: '2026-05-20',
    changes: [
      'кнопки шапки недоступны на iPhone в портретной ориентации',
      'импорт камней из CSV и скачивание шаблона в справочнике',
      'сортировка камней по алфавиту (А-Я) в справочнике',
    ],
    changesEn: [
      'header buttons unavailable on iPhone in portrait orientation',
      'stone import from CSV and template download in the reference',
      'alphabetical stone sorting (A–Z) in the reference',
    ],
  },
  {
    version: '1.61.0',
    date: '2026-05-20',
    changes: [
      'подготовка к импорту камней: шаблон CSV и обработка дублей при загрузке',
    ],
    changesEn: [
      'groundwork for stone import: CSV template and duplicate handling on upload',
    ],
  },
  {
    version: '1.60.0',
    date: '2026-05-20',
    changes: [
      'стабилизация автобэкапа при работе в фоне и переключении между экранами',
    ],
    changesEn: [
      'auto-backup stability improvements when running in the background and switching screens',
    ],
  },
  {
    version: '1.59.1',
    date: '2026-05-20',
    changes: [
      'автобэкап запускается при старте приложения, а не только при возврате',
      'автобэкап больше не запрашивает разрешения',
    ],
    changesEn: [
      'auto-backup runs on app start, not only on return',
      'auto-backup no longer asks for permissions',
    ],
  },
  {
    version: '1.59.0',
    date: '2026-05-20',
    changes: [
      'доработки автобэкапа: расписание, обработка ошибок записи',
    ],
    changesEn: [
      'auto-backup refinements: scheduling and write error handling',
    ],
  },
  {
    version: '1.58.4',
    date: '2026-05-20',
    changes: [
      'исправлено поведение баннера бэкапа; ежедневный бэкап при восстановлении связи',
    ],
    changesEn: [
      'fixed backup banner behavior; daily backup on network reconnect',
    ],
  },
  {
    version: '1.58.3',
    date: '2026-05-20',
    changes: [
      'автобэкап без лишних запросов разрешений; ошибка записи показывает уведомление',
    ],
    changesEn: [
      'auto-backup without unnecessary permission prompts; write error shows a notification',
    ],
  },
  {
    version: '1.58.2',
    date: '2026-05-20',
    changes: [
      'автобэкап запускается при возврате в приложение, а не при сворачивании',
    ],
    changesEn: [
      'auto-backup runs on app resume, not on minimise',
    ],
  },
  {
    version: '1.58.1',
    date: '2026-05-19',
    changes: [
      'автобэкап не требует лишних разрешений',
      'кнопка «Сохранить как принятый» на шаге приёмки',
      'подсказки на полях формы при активной диктовке',
      'подсказка ввода твёрдости стала понятнее',
    ],
    changesEn: [
      'auto-backup without extra permission prompts',
      '"Save as accepted" button on the intake step',
      'field hints while dictation is active',
      'hardness input hint made clearer',
    ],
  },
  {
    version: '1.58.0',
    date: '2026-05-19',
    changes: [
      'автобэкап в выбранную папку — первая рабочая версия',
    ],
    changesEn: [
      'auto-backup to a chosen folder — first working version',
    ],
  },
  {
    version: '1.57.0',
    date: '2026-05-18',
    changes: [
      'стабилизация диктовочного режима: меньше ложных срабатываний и зависаний микрофона',
    ],
    changesEn: [
      'dictation mode stability: fewer false triggers and microphone hang-ups',
    ],
  },
  {
    version: '1.56.3',
    date: '2026-05-18',
    changes: [
      'диктовка показывает список совпадений, когда их несколько (раньше применяла первое)',
    ],
    changesEn: [
      'dictation shows a match list when there are multiple matches (previously applied the first one)',
    ],
  },
  {
    version: '1.56.2',
    date: '2026-05-18',
    changes: [
      'курсор сразу в поле клиента; серый цвет подсказки в выпадающем списке',
    ],
    changesEn: [
      'cursor auto-focuses the client field; grey placeholder color in the dropdown',
    ],
  },
  {
    version: '1.56.1',
    date: '2026-05-18',
    changes: [
      'диктовка распознаёт поля «твёрдость», «камни», «комментарий»',
      'поиск находит названия и на русском, и на латинице — «Grinderman» и «Гриндерман»',
    ],
    changesEn: [
      'dictation recognises "hardness", "stones", "comment" fields',
      'search finds names in both Russian and Latin script — "Grinderman" and "Гриндерман"',
    ],
  },
  {
    version: '1.56.0',
    date: '2026-05-18',
    changes: [
      'улучшения голосового поиска: транслитерация и точность матчинга названий',
    ],
    changesEn: [
      'voice search improvements: transliteration and name matching accuracy',
    ],
  },
  {
    version: '1.55.2',
    date: '2026-05-18',
    changes: [
      'список клиентов открывается быстрее',
    ],
    changesEn: [
      'client list opens faster',
    ],
  },
  {
    version: '1.55.1',
    date: '2026-05-18',
    changes: [
      'диктовочный режим в форме заточки — кнопка-тумблер и индикатор «слышу» в шапке',
      'непрерывное распознавание речи, работает вместе с голосовым вводом отдельных полей',
      'голосовые команды для приёмки и заточки, добавление камня, выбор из списка совпадений',
      'коррекции: очистить поле, удалить последний камень, стоп, повтори',
      'навигация, сохранение и подтверждение отмены голосом',
    ],
    changesEn: [
      'dictation mode in the sharpening form — toggle button and "I hear" indicator in the header',
      'continuous speech recognition, works alongside per-field voice input',
      'voice commands for intake and sharpening, adding stones, selecting from match list',
      'corrections: clear field, delete last stone, stop, repeat',
      'navigation, saving and cancellation by voice',
    ],
  },
  {
    version: '1.54.1',
    date: '2026-05-17',
    changes: [
      'исправлена работа аналитики',
      'голосовой довыбор сужает список и слушает продолжение — grinderman → 120 → FEPA',
    ],
    changesEn: [
      'fixed analytics',
      'voice narrowing narrows the list and keeps listening — grinderman → 120 → FEPA',
    ],
  },
  {
    version: '1.53.2',
    date: '2026-05-17',
    changes: [
      'автодополнение ножа дополняет историю клиента полным справочником, а не заменяет его',
    ],
    changesEn: [
      'knife autocomplete merges the client\'s history with the full reference instead of replacing it',
    ],
  },
  {
    version: '1.53.1',
    date: '2026-05-17',
    changes: [
      'довыбор из списка совпадений голосом — «8» выбирает AUS-8',
      'после списка микрофон сам слушает уточнение, не закрываясь между поиском и довыбором',
    ],
    changesEn: [
      'voice selection from a match list — "8" selects AUS-8',
      'after the list the mic keeps listening for a refinement without closing between search and selection',
    ],
  },
  {
    version: '1.51.1',
    date: '2026-05-17',
    changes: [
      'голосовой поиск через отдельный список совпадений под полем',
      'голосовой ввод клиента и твёрдости, лучше распознаёт русское произношение',
      'список совпадений выбирается нажатием',
    ],
    changesEn: [
      'voice search via a separate match list below the field',
      'voice input for client and hardness, better Russian pronunciation recognition',
      'match list items selectable by tap',
    ],
  },
  {
    version: '1.49.1',
    date: '2026-05-17',
    changes: [
      'голосовой ввод сталей, ножей и камней — выбор из справочника',
      'распознаёт неточно произнесённые названия',
    ],
    changesEn: [
      'voice input for steels, knives and stones — select from reference',
      'recognises imprecisely pronounced names',
    ],
  },
  {
    version: '1.47.1',
    date: '2026-05-16',
    changes: [
      'голосовой ввод полей формы заточки (бета, включается в настройках)',
      'два автобэкапа — при закрытии и ежедневный с датой в имени файла',
    ],
    changesEn: [
      'voice input for sharpening form fields (beta, enable in settings)',
      'two auto-backups — on close and daily with date in the file name',
    ],
  },
  {
    version: '1.45.7',
    date: '2026-05-16',
    changes: [
      'формы добавления камня, стали и ножа — по центру экрана с затемнением фона',
      'аналитика работает офлайн — данные отправляются при восстановлении сети',
    ],
    changesEn: [
      'stone, steel and knife add forms — centered on screen with background dimming',
      'analytics works offline — data is sent when the network is restored',
    ],
  },
  {
    version: '1.44.1',
    date: '2026-05-15',
    changes: [
      'выравнивание пунктов в секции «Настройки» в «О программе»',
      'подсказки похожих названий при добавлении камня',
    ],
    changesEn: [
      'alignment of items in the Settings section in About',
      'similar-name hints when adding a stone',
    ],
  },
  {
    version: '1.43.5',
    date: '2026-05-15',
    changes: [
      'пробел между гритностью и единицей измерения (1000 FEPA, 2000 JIS)',
    ],
    changesEn: [
      'space between grit value and unit (1000 FEPA, 2000 JIS)',
    ],
  },
  {
    version: '1.43.3',
    date: '2026-05-15',
    changes: [
      'точный поиск по пробелу — «120 » больше не находит 1200',
    ],
    changesEn: [
      'exact search with a trailing space — "120 " no longer finds 1200',
    ],
  },
  {
    version: '1.43.1',
    date: '2026-05-15',
    changes: [
      'приветственный экран при первом запуске и ссылка на инструкцию в «О программе»',
      'поиск по нескольким словам — «GRIN 120» находит Grinderman OA CLR 120',
      'слияние бэкапов при импорте, тип камня «другой»',
      'аналитика использования (можно отключить в «О программе»)',
      'единая кнопка «Поделиться» с выбором источника',
    ],
    changesEn: [
      'welcome screen on first launch and link to guide in About',
      'multi-word search — "GRIN 120" finds Grinderman OA CLR 120',
      'backup merge on import, "other" stone type',
      'usage analytics (can be disabled in About)',
      'unified Share button with source selection',
    ],
  },
  {
    version: '1.39.1',
    date: '2026-05-15',
    changes: [
      'поле СОЖ (вода/масло) для камней + поиск *вода / *масло',
      'тепловая карта камней — шире колонка названия',
      'справочник камней расширен до 101 позиции',
    ],
    changesEn: [
      'coolant field (water/oil) for stones + search *water / *oil',
      'stone heatmap — wider name column',
      'stone reference expanded to 101 entries',
    ],
  },
  {
    version: '1.37.1',
    date: '2026-05-14',
    changes: [
      'поделиться фото «до/после» с водяным знаком @AppTochite',
    ],
    changesEn: [
      'share before/after photo with @AppTochite watermark',
    ],
  },
  {
    version: '1.36.5',
    date: '2026-05-14',
    changes: [
      'имя заказчика вынесено под название ножа на экране заточки',
    ],
    changesEn: [
      'customer name shown below the knife name on the sharpening screen',
    ],
  },
  {
    version: '1.36.4',
    date: '2026-05-14',
    changes: [
      'иконка тепловой карты — график вместо сетки',
    ],
    changesEn: [
      'heatmap icon — chart instead of grid',
    ],
  },
  {
    version: '1.36.3',
    date: '2026-05-14',
    changes: [
      'тепловая карта показывает число использований вместо процентов',
    ],
    changesEn: [
      'heatmap shows usage count instead of percentages',
    ],
  },
  {
    version: '1.36.1',
    date: '2026-05-13',
    changes: [
      'автобэкап в выбранную папку',
      'кнопка «Включить автобэкап» прямо в напоминалке о бэкапе',
    ],
    changesEn: [
      'auto-backup to a chosen folder',
      '"Enable auto-backup" button directly in the backup reminder',
    ],
  },
  {
    version: '1.34.4',
    date: '2026-05-13',
    changes: [
      'выбор ножа, стали и камня в форме заточки — одно нажатие, прокрутка списка не приводит к случайному выбору',
      'название ножа подстраивается по ширине угла',
    ],
    changesEn: [
      'knife, steel and stone selection in the sharpening form — single tap, scrolling the list does not trigger accidental selection',
      'knife name adjusts to the width of the angle',
    ],
  },
  {
    version: '1.34.2',
    date: '2026-05-13',
    changes: [
      'камни оборачиваются в пределах тёмного угла, правое выравнивание для правого тёмного угла',
    ],
    changesEn: [
      'stones wrap within the dark angle area, right-aligned for the right dark angle',
    ],
  },
  {
    version: '1.34.1',
    date: '2026-05-13',
    changes: [
      'фото-отчёт — угол заточки в верхнем правом углу',
      'аккуратное размещение текста и тонкий шрифт в фото-отчёте',
      'градиент фото-отчёта затемняет оба верхних угла',
    ],
    changesEn: [
      'photo report — sharpening angle in the top right corner',
      'neat text layout and thin font in the photo report',
      'photo report gradient dims both top corners',
    ],
  },
  {
    version: '1.32.1',
    date: '2026-05-12',
    changes: [
      'превью фото-отчёта не обрезает нижний блок камней на портретных фото',
      'убрана кнопка отправки заточки клиенту в Telegram',
    ],
    changesEn: [
      'photo report preview does not crop the bottom stone block on portrait photos',
      'removed the button to send a sharpening to the client via Telegram',
    ],
  },
  {
    version: '1.31.2',
    date: '2026-05-12',
    changes: [
      'фото-отчёт — финишный камень не обрезается',
    ],
    changesEn: [
      'photo report — finish stone no longer cropped',
    ],
  },
  {
    version: '1.31.1',
    date: '2026-05-12',
    changes: [
      'фото-отчёт заточки с подписями камней и стали',
      'отправка заточки клиенту в Telegram из карточки записи',
    ],
    changesEn: [
      'sharpening photo report with stone and steel labels',
      'send sharpening to client via Telegram from the record card',
    ],
  },
  {
    version: '1.29.6',
    date: '2026-05-11',
    changes: [
      'двойной тап для выбора из выпадающего списка в форме заточки',
    ],
    changesEn: [
      'double-tap to select from the dropdown in the sharpening form',
    ],
  },
  {
    version: '1.29.5',
    date: '2026-05-08',
    changes: [
      'конвертер гритностей — удобнее на ПК, шкала мкм, прокрутка колёсиком и касанием',
    ],
    changesEn: [
      'grit converter — better on desktop, µm scale, scroll wheel and touch',
    ],
  },
  {
    version: '1.29.0',
    date: '2026-05-07',
    changes: [
      'ссылки на Telegram-группу и Boosty в разделе «Настройки»',
    ],
    changesEn: [
      'links to Telegram group and Boosty in the Settings section',
    ],
  },
  {
    version: '1.28.0',
    date: '2026-05-07',
    changes: [
      'аватарки клиентов — фото из камеры или галереи',
    ],
    changesEn: [
      'client avatars — photo from camera or gallery',
    ],
  },
  {
    version: '1.27.3',
    date: '2026-05-06',
    changes: [
      'в справочнике камней — бейдж «Мой» при редактировании стандартного камня',
    ],
    changesEn: [
      'in the stone reference — "Mine" badge when editing a standard stone',
    ],
  },
  {
    version: '1.27.0',
    date: '2026-05-06',
    changes: [
      'двуцветная эмблема AppTochite на основных экранах',
    ],
    changesEn: [
      'two-colour AppTochite logo on main screens',
    ],
  },
  {
    version: '1.26.8',
    date: '2026-05-06',
    changes: [
      'таблица гритностей обновлена: 33 строки с микронами, добавлены FEPA 90 и 180',
    ],
    changesEn: [
      'grit table updated: 33 rows with microns, added FEPA 90 and 180',
    ],
  },
  {
    version: '1.26.0',
    date: '2026-05-05',
    changes: [
      'в конвертере гритностей добавлена шкала мкм (D50)',
    ],
    changesEn: [
      'µm (D50) scale added to the grit converter',
    ],
  },
  {
    version: '1.25.6',
    date: '2026-05-05',
    changes: [
      'таблица гритностей дополнена: JIS 320 / 1200 / 6000 с соответствиями FEPA и ГОСТ',
    ],
    changesEn: [
      'grit table extended: JIS 320 / 1200 / 6000 with FEPA and GOST equivalents',
    ],
  },
  {
    version: '1.25.0',
    date: '2026-05-05',
    changes: [
      'конвертер гритностей в справочнике камней: барабаны FEPA / JIS / мкм',
    ],
    changesEn: [
      'grit converter in the stone reference: FEPA / JIS / µm drums',
    ],
  },
  {
    version: '1.24.0',
    date: '2026-05-05',
    changes: [
      'в списке камней — ближайшие значения гритности выше и ниже основного',
    ],
    changesEn: [
      'in the stone list — nearest grit values above and below the main one',
    ],
  },
  {
    version: '1.23.0',
    date: '2026-05-05',
    changes: [
      'в форме редактирования камня — ручное переопределение гритности в каждой шкале отдельно',
    ],
    changesEn: [
      'in the stone edit form — manual grit override for each scale separately',
    ],
  },
  {
    version: '1.22.0',
    date: '2026-05-05',
    changes: [
      'при смене шкалы гритности в форме редактирования — значение конвертируется автоматически',
    ],
    changesEn: [
      'when changing the grit scale in the edit form — value is converted automatically',
    ],
  },
  {
    version: '1.21.0',
    date: '2026-05-05',
    changes: [
      'в справочнике камней — конвертер гритности: переключение между FEPA, JIS и ГОСТ',
      'личные камни идут первыми и сортируются по выбранной шкале',
    ],
    changesEn: [
      'in the stone reference — grit converter: switch between FEPA, JIS and GOST',
      'personal stones listed first, sorted by the selected scale',
    ],
  },
  {
    version: '1.20.0',
    date: '2026-05-03',
    changes: [
      'в форме заточки — поле «Нож» подсказывает ножи из истории клиента',
    ],
    changesEn: [
      'in the sharpening form — the Knife field suggests knives from the client\'s history',
    ],
  },
  {
    version: '1.19.0',
    date: '2026-05-03',
    changes: [
      'в справочнике камней — редактирование записи: выберите камень и нажмите «Изменить»',
    ],
    changesEn: [
      'in the stone reference — record editing: select a stone and press "Edit"',
    ],
  },
  {
    version: '1.18.0',
    date: '2026-05-03',
    changes: [
      'подсказки ножей в форме заточки сортируются по частоте использования',
    ],
    changesEn: [
      'knife suggestions in the sharpening form sorted by usage frequency',
    ],
  },
  {
    version: '1.17.0',
    date: '2026-05-03',
    changes: [
      'в справочнике камней — поиск по типу абразива через * (например, *алмаз)',
      'исправлен тип абразива у камня TSPROF Alpha (был «гальваника», стал «алмаз»)',
    ],
    changesEn: [
      'in the stone reference — search by abrasive type via * (e.g. *diamond)',
      'fixed the abrasive type of TSPROF Alpha stone (was "galvanic", now "diamond")',
    ],
  },
  {
    version: '1.16.0',
    date: '2026-05-03',
    changes: [
      'в справочнике сталей убран рекомендуемый угол заточки',
    ],
    changesEn: [
      'removed the recommended sharpening angle from the steel reference',
    ],
  },
  {
    version: '1.15.0',
    date: '2026-04-29',
    changes: [
      'на экране заточки фото ножа выделено как обложка',
    ],
    changesEn: [
      'on the sharpening screen the knife photo is shown as a cover image',
    ],
  },
  {
    version: '1.14.0',
    date: '2026-04-29',
    changes: [
      'в карточке клиента заточки разбиты на страницы по 10',
    ],
    changesEn: [
      'client card shows sharpenings paginated by 10',
    ],
  },
  {
    version: '1.13.1',
    date: '2026-04-29',
    changes: [
      'кнопка «Повторить заточку» в карточке клиента',
      'добавлены камни из каталога TSPROF',
    ],
    changesEn: [
      '"Repeat sharpening" button in the client card',
      'added stones from the TSPROF catalogue',
    ],
  },
  {
    version: '1.12.0',
    date: '2026-04-29',
    changes: [
      'финишный камень — плашка FIN и учёт в тепловой карте',
    ],
    changesEn: [
      'finishing stone — FIN label and counted in the heatmap',
    ],
  },
  {
    version: '1.10.0',
    date: '2026-04-29',
    changes: [
      'в ленте заточек — фото ножа на карточке',
      'в карточке клиента — фильтр по ножу (появляется при двух и более разных ножах)',
      'в справочнике ножей — поле «Сталь» с автодополнением',
    ],
    changesEn: [
      'in the history feed — knife photo on the card',
      'in the client card — filter by knife (appears when there are two or more different knives)',
      'in the knife reference — Steel field with autocomplete',
    ],
  },
  {
    version: '1.9.1',
    date: '2026-04-29',
    changes: [
      'прогресс-бар занятого хранилища в настройках',
    ],
    changesEn: [
      'storage usage progress bar in settings',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-04-28',
    changes: [
      'справочники расширены: 890 ножей, 219 сталей, 450+ камней',
      'добавлен тип абразива «керамика»',
    ],
    changesEn: [
      'references expanded: 890 knives, 219 steels, 450+ stones',
      'added "ceramic" abrasive type',
    ],
  },
  {
    version: '1.6.0',
    date: '2026-04-27',
    changes: [
      'тепловая карта камней перенесена в иконку в шапке, открывается отдельным экраном',
      'лимит при импорте бэкапа увеличен с 50 до 200 МБ',
    ],
    changesEn: [
      'stone heatmap moved to the header icon, opens as a separate screen',
      'backup import limit increased from 50 to 200 MB',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-04-27',
    changes: [
      'в справочнике камней — тепловая карта: наглядно видно, какие камни используются чаще',
    ],
    changesEn: [
      'in the stone reference — heatmap: visually shows which stones are used most',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-04-27',
    changes: [
      'поиск по комментарию в истории — в строке видно фрагмент с найденным словом',
    ],
    changesEn: [
      'search by comment in history — the matching fragment is shown in the row',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-04-26',
    changes: [
      'добавлен тип абразива «иное»',
    ],
    changesEn: [
      'added abrasive type "other"',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-04-26',
    changes: [
      'предупреждение при открытии в Telegram и других встроенных браузерах',
    ],
    changesEn: [
      'warning when opening in Telegram and other in-app browsers',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-04-26',
    changes: [
      'первый публичный релиз',
      'учёт клиентов и заточек с фото «До» и «После»',
      'выбор фото из галереи или камеры, лимит 5 фото на заточку',
      'просмотр фото на весь экран',
      'статусы заточки: Принят / Готов',
      'справочники: камни, стали, ножи (более 300 позиций)',
      'единицы гритности: FEPA / JIS / мкм, необязательное поле',
      'тип абразива: 7 значений вместо свободного поля',
      'тип работы в форме приёмки',
      'создание нового камня прямо из формы заточки',
      'мультиселект и удаление в справочниках, кнопка «Выбрать все»',
      'поиск клиентов и истории, кликабельные контакты',
      'счётчики статусов в списке клиентов',
      'напоминание о бэкапе раз в 7 дней',
      'предупреждение при заполнении хранилища',
      'экспорт бэкапа в JSON и CSV, восстановление из файла',
      'экран «О программе» с версией и ченджлогом',
    ],
    changesEn: [
      'first public release',
      'client and sharpening log with before/after photos',
      'select photo from gallery or camera, limit of 5 photos per sharpening',
      'full-screen photo viewer',
      'sharpening statuses: Accepted / Done',
      'references: stones, steels, knives (300+ entries)',
      'grit units: FEPA / JIS / µm, optional field',
      'abrasive type: 7 values instead of a free-text field',
      'job type in the intake form',
      'add a new stone directly from the sharpening form',
      'multi-select and delete in references, "Select all" button',
      'search clients and history, clickable contacts',
      'status counters in the client list',
      'backup reminder every 7 days',
      'storage warning when full',
      'backup export to JSON and CSV, restore from file',
      'About screen with version and changelog',
    ],
  },
]
