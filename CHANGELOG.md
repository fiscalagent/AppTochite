# [1.98.0](https://github.com/fiscalagent/AppTochite/compare/v1.97.0...v1.98.0) (2026-06-21)


### feat

* счётчик заточенных ножей в шапке экрана «История» ([](https://github.com/fiscalagent/AppTochite/commit/63c0a3f039b6180b56485b38a4beacad1fea48dc))


### fix

* автобэкап не перезаписывает файл пустой базой данных ([](https://github.com/fiscalagent/AppTochite/commit/f400d2b94475ee97b2b7e9f5dd830a03842fc13a))

# [1.97.0](https://github.com/fiscalagent/AppTochite/compare/v1.96.0...v1.97.0) (2026-06-21)


### feat

* игра «Расставь камни» — тренажёр зернистости в справочнике ([](https://github.com/fiscalagent/AppTochite/commit/ae9d3b1a62ec554057990e699c924cf8fdcdc1cf))

# [1.96.0](https://github.com/fiscalagent/AppTochite/compare/v1.95.0...v1.96.0) (2026-06-11)


### feat

* ссылка «Сайт приложения» в экране «О программе» ([](https://github.com/fiscalagent/AppTochite/commit/f3bb45cbd585ebc9465542da49791aeba89ffabe))

# [1.95.0](https://github.com/fiscalagent/AppTochite/compare/v1.94.0...v1.95.0) (2026-06-11)


### feat

* merge бэкапа другого устройства без перемешивания клиентов — записи сопоставляются по guid ([](https://github.com/fiscalagent/AppTochite/commit/460933b32cd47eebae6d9c6538ea8498c55d4862))
* облачные снапшоты по устройствам — телефон и планшет не перетирают бэкапы друг друга ([](https://github.com/fiscalagent/AppTochite/commit/46fb9c46b357d31ab852d5d458e2dc871bfb1cf7))


### fix

* дата приёмки ночью больше не сдвигается на вчерашний день ([](https://github.com/fiscalagent/AppTochite/commit/99fd0104ed8880b1b5a6842d997af7a5117191b9))
* открытие удалённой записи показывает «не найдено» вместо пустого экрана ([](https://github.com/fiscalagent/AppTochite/commit/a9ff9d0632727e8fe9d748c4e2848bb759d0a110))
* сбой сети больше не отменяет облачный авто-бэкап на весь день ([](https://github.com/fiscalagent/AppTochite/commit/61fd1f9717d237121139b6fc8e9d401a18da18ce))

# [1.94.0](https://github.com/fiscalagent/AppTochite/compare/v1.93.1...v1.94.0) (2026-06-10)


### feat

* дневной гейт и сигнатура данных для авто-бэкапа в облако ([](https://github.com/fiscalagent/AppTochite/commit/977430f5e7b7e272ffacb5e1bc1aeeebf312e01b))

## [1.93.1](https://github.com/fiscalagent/AppTochite/compare/v1.93.0...v1.93.1) (2026-06-10)

# [1.93.0](https://github.com/fiscalagent/AppTochite/compare/v1.92.2...v1.93.0) (2026-06-10)


### feat

* облачный бэкап через Яндекс.Диск REST API ([](https://github.com/fiscalagent/AppTochite/commit/676db4b495c7b89f0da62925df1fb4c55894cfe5))

## [1.92.2](https://github.com/fiscalagent/AppTochite/compare/v1.92.1...v1.92.2) (2026-06-09)


### fix

* на iOS использовать text/plain для CSV-вложения в Mail ([](https://github.com/fiscalagent/AppTochite/commit/d87d4fd949e63efb3c1b54a7413592173c0d32f8))
* на iOS шарить бэкап как application/json, не text/plain ([](https://github.com/fiscalagent/AppTochite/commit/3602d8b3fe761b9df9487b9a46265b9b4189733c))

## [1.92.1](https://github.com/fiscalagent/AppTochite/compare/v1.92.0...v1.92.1) (2026-06-09)


### fix

* использовать downloadBlob для CSV на Android, share только на iOS ([](https://github.com/fiscalagent/AppTochite/commit/43097b4210e218108254a4f6029b99617f8e5a71))

# [1.92.0](https://github.com/fiscalagent/AppTochite/compare/v1.91.4...v1.92.0) (2026-06-09)


### feat

* добавить weekYear, fixGritMkColumn, fillWeekYearColumn в Apps Script ([](https://github.com/fiscalagent/AppTochite/commit/a35422a9515f5150cc4f04cdb1320312947bc7fa))

## [1.91.4](https://github.com/fiscalagent/AppTochite/compare/v1.91.3...v1.91.4) (2026-06-09)


### fix

* готовить CSV заранее, share() вызывать синхронно в обработчике клика ([](https://github.com/fiscalagent/AppTochite/commit/5f4e2ad5739df5a85f14c86c6de5fde355749096))

## [1.91.3](https://github.com/fiscalagent/AppTochite/compare/v1.91.2...v1.91.3) (2026-06-09)


### fix

* экспорт CSV через Web Share API вместо <a download> ([](https://github.com/fiscalagent/AppTochite/commit/3c4a18c9abc52e729109fd298d7594f00f8460b8))

## [1.91.2](https://github.com/fiscalagent/AppTochite/compare/v1.91.1...v1.91.2) (2026-06-08)


### fix

* добавить recoveryPoints в английский словарь ([](https://github.com/fiscalagent/AppTochite/commit/6746d3aa58065d07a8b2c2946cf6a981c5c9495f))

## [1.91.1](https://github.com/fiscalagent/AppTochite/compare/v1.91.0...v1.91.1) (2026-06-08)


### fix

* BackupReminder, sentinel на старте, prev-файл в BK-1 ([](https://github.com/fiscalagent/AppTochite/commit/df67bebd68c42a3fb6f2f6c43bbc564cd64d543b))

# [1.91.0](https://github.com/fiscalagent/AppTochite/compare/v1.90.0...v1.91.0) (2026-06-08)


### feat

* статус защиты, folder hint при потере, авто-sync, 90д-промпт ([](https://github.com/fiscalagent/AppTochite/commit/2eb55f5e7488ead33a763cd49bd5a0aa18de6085))

# [1.90.0](https://github.com/fiscalagent/AppTochite/compare/v1.89.0...v1.90.0) (2026-06-08)


### feat

* надёжность бэкапа — снапшот перед restore, heal folder, fon. sync, цвет ([](https://github.com/fiscalagent/AppTochite/commit/0e18f4c565825cbff1fee2168fc7a069c5dde839))

# [1.89.0](https://github.com/fiscalagent/AppTochite/compare/v1.88.0...v1.89.0) (2026-06-08)


### feat

* надёжность бэкапа — ротация prev, sentinel, alert при потере данных ([](https://github.com/fiscalagent/AppTochite/commit/d8a51b93a4c71eb07baa225d81d7620d8fb6d7c2))

# [1.88.0](https://github.com/fiscalagent/AppTochite/compare/v1.87.0...v1.88.0) (2026-06-08)


### feat

* напоминание выбрать папку для бэкапа при первом открытии ([](https://github.com/fiscalagent/AppTochite/commit/5c1536b58d1974e525b0bdbc38028cedbf7f8c0d))

# [1.87.0](https://github.com/fiscalagent/AppTochite/compare/v1.86.1...v1.87.0) (2026-06-08)


### feat

* бэкап в папку на устройстве + защита хранилища + восстановление аналитики ([](https://github.com/fiscalagent/AppTochite/commit/ddb36288a7d34664d589d3c809d2dcf93adbd8e2))

## [1.86.1](https://github.com/fiscalagent/AppTochite/compare/v1.86.0...v1.86.1) (2026-06-05)


### fix

* имя «Я» в выпадающем списке клиентов локализуется на Me ([](https://github.com/fiscalagent/AppTochite/commit/94bff0d075c4949974844ac9a3db8d043f9d03fa))

# [1.86.0](https://github.com/fiscalagent/AppTochite/compare/v1.85.1...v1.86.0) (2026-06-05)


### feat

* аватар Me отображает полный текст на английском ([](https://github.com/fiscalagent/AppTochite/commit/3974954e326c54d972d218ca5961f38261d67374))

## [1.85.1](https://github.com/fiscalagent/AppTochite/compare/v1.85.0...v1.85.1) (2026-06-05)


### fix

* самоссылка на английском — Me вместо I ([](https://github.com/fiscalagent/AppTochite/commit/ea4ac30c4a353806a9a3cf497b458a3e46fb5536))

# [1.85.0](https://github.com/fiscalagent/AppTochite/compare/v1.84.2...v1.85.0) (2026-06-05)


### feat

* клиент «Я» отображается как «I» на английском языке ([](https://github.com/fiscalagent/AppTochite/commit/ade3398c02d09744d7929025495217d03ea371e0))

## [1.84.2](https://github.com/fiscalagent/AppTochite/compare/v1.84.1...v1.84.2) (2026-06-05)


### fix

* синхронизация каталога камней при смене языка без перезагрузки ([](https://github.com/fiscalagent/AppTochite/commit/d4e441fb7f11d8d68ce7c34aaa77093dee364d7b))

## [1.84.1](https://github.com/fiscalagent/AppTochite/compare/v1.84.0...v1.84.1) (2026-06-05)


### fix

* каталог камней меняется в обе стороны при смене языка ([](https://github.com/fiscalagent/AppTochite/commit/380a9e9a352edac5386586cb6437c83f8641c3ed))

# [1.84.0](https://github.com/fiscalagent/AppTochite/compare/v1.83.0...v1.84.0) (2026-06-04)


### feat

* английский каталог камней — 80 камней для новых EN-пользователей ([](https://github.com/fiscalagent/AppTochite/commit/33cb889ce629ca2b119ea9f59c2e5f86ec4ca187))

# [1.83.0](https://github.com/fiscalagent/AppTochite/compare/v1.82.0...v1.83.0) (2026-06-03)


### feat

* переключатель языка на главном экране, ссылка ?lang=en ([](https://github.com/fiscalagent/AppTochite/commit/b962ff07d15cabb88af4ae84ed2d650e0e807459))

# [1.82.0](https://github.com/fiscalagent/AppTochite/compare/v1.81.2...v1.82.0) (2026-06-03)


### feat

* переключатель языка перенесён из «О программе» в «Настройки» ([](https://github.com/fiscalagent/AppTochite/commit/3296e1683763e2477becc68d6354b227cbb3c567))

## [1.81.2](https://github.com/fiscalagent/AppTochite/compare/v1.81.1...v1.81.2) (2026-06-03)


### fix

* русский язык по умолчанию; fieldLabel('hrc') вместо хардкода ([](https://github.com/fiscalagent/AppTochite/commit/05c2ce3b10c0cc4db4f2227b541589acc5042830))

## [1.81.1](https://github.com/fiscalagent/AppTochite/compare/v1.81.0...v1.81.1) (2026-06-03)


### fix

* Widened<T> в Dict — убирает конфликт literal-типов между ru и en ([](https://github.com/fiscalagent/AppTochite/commit/2ae4717c68c22e71a9b1c4ae12a39bcda8660346))

# [1.81.0](https://github.com/fiscalagent/AppTochite/compare/v1.80.0...v1.81.0) (2026-06-02)


### feat

* Фаза 3 i18n — голосовой ввод на двух языках ([](https://github.com/fiscalagent/AppTochite/commit/e92b3f3b6400366c29ba37a1b57090783995e7ea))

# [1.80.0](https://github.com/fiscalagent/AppTochite/compare/v1.79.0...v1.80.0) (2026-06-02)


### feat

* i18n фаза 2 — английский язык (en.ts) и переключатель языка ([](https://github.com/fiscalagent/AppTochite/commit/098b8e75dd62017c4d780ac473c3403a7f0e258f))

# [1.79.0](https://github.com/fiscalagent/AppTochite/compare/v1.78.1...v1.79.0) (2026-06-01)


### feat

* голосовой ввод включён по умолчанию — отключается в настройках ([](https://github.com/fiscalagent/AppTochite/commit/1c7694fdbc3d0afad082b8e6a7c5d1f9c7f3afa7))

## [1.78.1](https://github.com/fiscalagent/AppTochite/compare/v1.78.0...v1.78.1) (2026-06-01)


### fix

* краш при удалении из справочника после авто-перевода страницы браузером ([](https://github.com/fiscalagent/AppTochite/commit/5b020ac6e8d90c5d05c1422df073fa5f976a90a8))

# [1.78.0](https://github.com/fiscalagent/AppTochite/compare/v1.77.1...v1.78.0) (2026-06-01)


### feat

* подсказка о формате файла под кнопкой импорта ножей ([](https://github.com/fiscalagent/AppTochite/commit/3b79fd7fc90432da12e5930a4ac5a3f0da241d08))

## [1.77.1](https://github.com/fiscalagent/AppTochite/compare/v1.77.0...v1.77.1) (2026-06-01)


### fix

* редактирование ножа в справочнике — кнопка «Изменить» при выделении ([](https://github.com/fiscalagent/AppTochite/commit/f009f7a82c85de4ac35174e8805e970035a99c32))

# [1.77.0](https://github.com/fiscalagent/AppTochite/compare/v1.76.0...v1.77.0) (2026-06-01)


### feat

* импорт ножей из файла xlsx/csv с автоматическим распознаванием стали ([](https://github.com/fiscalagent/AppTochite/commit/52ec802d336f7cf2967856417863338f4e0771fb))

# [1.76.0](https://github.com/fiscalagent/AppTochite/compare/v1.75.0...v1.76.0) (2026-06-01)


### feat

* при выборе ножа подставляется его сталь, а нож сохраняется с учётом стали ([](https://github.com/fiscalagent/AppTochite/commit/3b6d8a19f06d1a5e98b1b8581b9445de5ecf2c3f))

# [1.75.0](https://github.com/fiscalagent/AppTochite/compare/v1.74.0...v1.75.0) (2026-05-30)


### feat

* добавили небольшую пасхалку для внимательных ([](https://github.com/fiscalagent/AppTochite/commit/93bf942056866c5ace6da6c92fc42059a3123005))


### fix

* исправлен чёрный экран при первом запуске на чистом устройстве ([](https://github.com/fiscalagent/AppTochite/commit/c4d6ffe10b44480624456ff6a00fcd30a36888f7))

# [1.74.0](https://github.com/fiscalagent/AppTochite/compare/v1.73.0...v1.74.0) (2026-05-30)


### feat

* поддержать развитие — блок с номером карты на экране «Настройки», копирование по нажатию ([](https://github.com/fiscalagent/AppTochite/commit/314433602057825e357d489489e56ebf6fad72f0))

# [1.73.0](https://github.com/fiscalagent/AppTochite/compare/v1.72.0...v1.73.0) (2026-05-30)


### feat

* поддержать развитие — вместо ссылки на Boosty номер карты с копированием по тапу ([](https://github.com/fiscalagent/AppTochite/commit/37333d6fbf8c53f864913ec81b65be73d557c42e))

# [1.72.0](https://github.com/fiscalagent/AppTochite/compare/v1.71.0...v1.72.0) (2026-05-30)


### feat

* справочник СОЖ — новое значение «сухой» (камни без СОЖ), ищется через *сухой и попадает в *вода/*масло с тегом ([](https://github.com/fiscalagent/AppTochite/commit/c48c0a4be5ecd33f90302eeed0390e514ef54922))

# [1.71.0](https://github.com/fiscalagent/AppTochite/compare/v1.70.5...v1.71.0) (2026-05-30)


### feat

* подсказка под кнопкой шаринга — объяснение про расширение .txt ([](https://github.com/fiscalagent/AppTochite/commit/7a065ff00528bce4f93409f6524c825a52004ee6))

## [1.70.5](https://github.com/fiscalagent/AppTochite/compare/v1.70.4...v1.70.5) (2026-05-30)


### fix

* «Поделиться бэкапом» — расширение .txt вместо .json (Chrome Android фильтрует по расширению), импорт принимает оба ([](https://github.com/fiscalagent/AppTochite/commit/76158025f86dbf99085a79f883a47eccfdd0e6a1))

## [1.70.4](https://github.com/fiscalagent/AppTochite/compare/v1.70.3...v1.70.4) (2026-05-30)

## [1.70.3](https://github.com/fiscalagent/AppTochite/compare/v1.70.2...v1.70.3) (2026-05-30)


### fix

* «Поделиться бэкапом» — готовим файл заранее, в клике только share() (Chrome требует transient activation) ([](https://github.com/fiscalagent/AppTochite/commit/ab62f93440a9eee044ec054d33d15b5c5e6bbc80))

## [1.70.2](https://github.com/fiscalagent/AppTochite/compare/v1.70.1...v1.70.2) (2026-05-30)


### fix

* показывать настоящую ошибку шаринга в тосте — для диагностики ([](https://github.com/fiscalagent/AppTochite/commit/c914196620f1f49e655bd1a86606ab6c1728f829))

## [1.70.1](https://github.com/fiscalagent/AppTochite/compare/v1.70.0...v1.70.1) (2026-05-30)


### fix

* «Поделиться бэкапом» — text/plain вместо application/json (Chrome Android не пускает JSON в share sheet) ([](https://github.com/fiscalagent/AppTochite/commit/df96efabd73679767ad6e407903cc25fa4950d6c))

# [1.70.0](https://github.com/fiscalagent/AppTochite/compare/v1.69.0...v1.70.0) (2026-05-30)


### feat

* кнопка «Поделиться бэкапом» — отправка JSON через системный share sheet (Telegram, почта, облако) ([](https://github.com/fiscalagent/AppTochite/commit/1af378878280ed504b36b2b8ddecf7990d8567d5))

# [1.69.0](https://github.com/fiscalagent/AppTochite/compare/v1.68.0...v1.69.0) (2026-05-30)


### feat

* эскалация напоминания о бэкапе — три уровня info/warn/critical ([](https://github.com/fiscalagent/AppTochite/commit/96c8776bbb6ba459ffb083e6edce5a4d3697aa31))

# [1.68.0](https://github.com/fiscalagent/AppTochite/compare/v1.67.1...v1.68.0) (2026-05-30)


### feat

* автоматический снимок данных перед обновлением структуры базы — страховка на случай ошибок миграции ([](https://github.com/fiscalagent/AppTochite/commit/d5f0308bf53bd195b407745a92dd31d0eb576db1))

## [1.67.1](https://github.com/fiscalagent/AppTochite/compare/v1.67.0...v1.67.1) (2026-05-30)


### fix

* объединение бэкапа больше не воскрешает удалённых клиентов и заточки из корзины ([](https://github.com/fiscalagent/AppTochite/commit/300c2645f6be51a003236458ff910c35a0825b9b))

# [1.67.0](https://github.com/fiscalagent/AppTochite/compare/v1.66.0...v1.67.0) (2026-05-29)


### feat

* удалённые клиенты и заточки попадают в корзину — можно восстановить в течение 3 дней ([](https://github.com/fiscalagent/AppTochite/commit/b6bbc1e7412f43e1d00e14e406bd11176b5ed76f))

# [1.66.0](https://github.com/fiscalagent/AppTochite/compare/v1.65.0...v1.66.0) (2026-05-29)


### feat

* автобэкап теперь хранит снимок за прошлый день — на случай если свежий бэкап испорчен ([](https://github.com/fiscalagent/AppTochite/commit/638b9ab6696b8465123291e7f29f6fecfd1f99cf))

# [1.65.0](https://github.com/fiscalagent/AppTochite/compare/v1.64.5...v1.65.0) (2026-05-27)


### feat

* форма заточки разделена на два экрана — приёмка и заточка с инлайн-редактированием ([](https://github.com/fiscalagent/AppTochite/commit/efb1d88aae5e6e8b84f24f704ba0d80143916f92))

## [1.64.5](https://github.com/fiscalagent/AppTochite/compare/v1.64.4...v1.64.5) (2026-05-27)


### fix

* краш Android WebView при фотографировании — input добавляется в DOM перед click() ([](https://github.com/fiscalagent/AppTochite/commit/df2889a4e5fd8f5899810d8cac54160320c42329))

## [1.64.4](https://github.com/fiscalagent/AppTochite/compare/v1.64.3...v1.64.4) (2026-05-26)


### fix

* кнопка «назад» — переключение вкладок больше не копит историю, выход из приложения за 1-2 нажатия ([](https://github.com/fiscalagent/AppTochite/commit/7a0dc74e65acc915ee89e53dcce95c9f0879ce78))

## [1.64.3](https://github.com/fiscalagent/AppTochite/compare/v1.64.2...v1.64.3) (2026-05-21)


### fix

* шаг 2 формы — кнопки «Принято» и «Готово» вместо чипов статуса ([](https://github.com/fiscalagent/AppTochite/commit/087173c74e0c430c081248b48a4838246a31e37f))

## [1.64.2](https://github.com/fiscalagent/AppTochite/compare/v1.64.1...v1.64.2) (2026-05-21)


### fix

* кнопка «ЗАТОЧИТЬ» ведёт на шаг 2 формы; удалён мёртвый код handleMarkDone ([](https://github.com/fiscalagent/AppTochite/commit/c2ac2ca1840889c8a83d2593055b45aa2373e0b5))

## [1.64.1](https://github.com/fiscalagent/AppTochite/compare/v1.64.0...v1.64.1) (2026-05-21)

# [1.64.0](https://github.com/fiscalagent/AppTochite/compare/v1.63.0...v1.64.0) (2026-05-21)


### feat

* все 4 поля гритности в базе + импорт/экспорт камней CSV ([](https://github.com/fiscalagent/AppTochite/commit/9ed14584cb6c01d8e37ea9b93bba5abd866dda7f))


### fix

* CSV экспорт с кавычками; дедупликация по нативной шкале ([](https://github.com/fiscalagent/AppTochite/commit/6419b2f06be2f24b4d9d37f640b9bf5d74b6835d))
* fromJis/fromFepa заполняют gritMicrons через nearest-neighbour; кнопка ГОСТ ([](https://github.com/fiscalagent/AppTochite/commit/782c70cf1c4d72e15ec9ff928c0b0132fafe7f08))
* импорт CSV камней — кодировки UTF-8/UTF-16/Win-1251, кавычки и BOM в заголовках; мкм в parseStoneName; тост и try/catch при добавлении нового камня ([](https://github.com/fiscalagent/AppTochite/commit/fb18051f9bc8b375e0ee999c2b6e4dd7a0f71ab1))
* нормализация камней при восстановлении старого бэкапа ([](https://github.com/fiscalagent/AppTochite/commit/d3f8fee888271cd377549b6fe73f73ac06ae6e4d))

# [1.63.0](https://github.com/fiscalagent/AppTochite/compare/v1.62.2...v1.63.0) (2026-05-21)


### feat

* экспорт всего справочника камней в CSV вместо шаблона ([](https://github.com/fiscalagent/AppTochite/commit/94653a6a551a5f6bbc054e0a7ede70edc6cf92a7))

## [1.62.2](https://github.com/fiscalagent/AppTochite/compare/v1.62.1...v1.62.2) (2026-05-21)


### fix

* сортировка А-Я включает все камни, не только пользовательские ([](https://github.com/fiscalagent/AppTochite/commit/d1598976013c476f28f1da1d3bb31697fdcf59db))

## [1.62.1](https://github.com/fiscalagent/AppTochite/compare/v1.62.0...v1.62.1) (2026-05-20)


### fix

* тосты сохранения только при голосовом вводе; выход в клиенты после готово ([](https://github.com/fiscalagent/AppTochite/commit/5b0bd43ca5103a0e6b1cec4c2874b4d50b5aa218))

# [1.62.0](https://github.com/fiscalagent/AppTochite/compare/v1.61.1...v1.62.0) (2026-05-20)


### feat

* тосты сохранения только при голосовом вводе; позиция тоста выше при диктовке ([](https://github.com/fiscalagent/AppTochite/commit/0d39237d1b77f1a7cce07ba213ca2bfd599dbe4e))

## [1.61.1](https://github.com/fiscalagent/AppTochite/compare/v1.61.0...v1.61.1) (2026-05-20)


### fix

* кнопки шапки недоступны на iPhone в портретной ориентации ([](https://github.com/fiscalagent/AppTochite/commit/d89d9d9851fe05fdb05c5ecbf2a3974b49f00219))

# [1.61.0](https://github.com/fiscalagent/AppTochite/compare/v1.60.0...v1.61.0) (2026-05-20)


### feat

* импорт камней из CSV и скачивание шаблона в справочнике ([](https://github.com/fiscalagent/AppTochite/commit/2ebf8734f976ef5fff28190fd8b17b3e5060d33d))

# [1.60.0](https://github.com/fiscalagent/AppTochite/compare/v1.59.1...v1.60.0) (2026-05-20)


### feat

* сортировка камней по алфавиту (А-Я) в справочнике ([](https://github.com/fiscalagent/AppTochite/commit/c7afc777e6a1bba357d65344d4b211ec2c40fb47))

## [1.59.1](https://github.com/fiscalagent/AppTochite/compare/v1.59.0...v1.59.1) (2026-05-20)


### fix

* автобэкап запускается при старте приложения, а не только при возврате ([](https://github.com/fiscalagent/AppTochite/commit/0e9ac39c28454ee435b6356366da8efe79a893cb))

# [1.59.0](https://github.com/fiscalagent/AppTochite/compare/v1.58.4...v1.59.0) (2026-05-20)


### feat

* автобэкап переведён на OPFS — без диалогов разрешений ([](https://github.com/fiscalagent/AppTochite/commit/2eb7def728f4ca7ec56a496887e9b1ce968451c5))

## [1.58.4](https://github.com/fiscalagent/AppTochite/compare/v1.58.3...v1.58.4) (2026-05-20)


### fix

* устранён race condition баннера и добавлен daily бэкап при reconnect ([](https://github.com/fiscalagent/AppTochite/commit/7a1fd1190e37421bf9df73de1d67a4c6934711de))

## [1.58.3](https://github.com/fiscalagent/AppTochite/compare/v1.58.2...v1.58.3) (2026-05-20)


### fix

* автобэкап без queryPermission-гейта, ошибки записи показывают тост ([](https://github.com/fiscalagent/AppTochite/commit/81b8bd54ad947f1a023cfbacf06cd457fa0862f1))

## [1.58.2](https://github.com/fiscalagent/AppTochite/compare/v1.58.1...v1.58.2) (2026-05-20)


### fix

* автобэкап запускается при возврате в приложение, а не при сворачивании ([](https://github.com/fiscalagent/AppTochite/commit/0ee9a40e161722af5bffaa9fae43cd0d4a0f6948))

## [1.58.1](https://github.com/fiscalagent/AppTochite/compare/v1.58.0...v1.58.1) (2026-05-19)


### fix

* автобэкап не требует queryPermission — пробуем запись напрямую ([](https://github.com/fiscalagent/AppTochite/commit/9352d44c3125965d3d9c43e4b50ad88593735a8f))

# [1.58.0](https://github.com/fiscalagent/AppTochite/compare/v1.57.0...v1.58.0) (2026-05-19)


### feat

* кнопка «Сохранить как принятый» на шаге приёмки ([](https://github.com/fiscalagent/AppTochite/commit/d0406813b109248240b25579aff4c1daea2ed38a))

# [1.57.0](https://github.com/fiscalagent/AppTochite/compare/v1.56.3...v1.57.0) (2026-05-18)


### feat

* подсказки-префиксы на полях формы при активной диктовке ([](https://github.com/fiscalagent/AppTochite/commit/8b5a9b5a9751a9c7581b5b371803427deee5b415))


### fix

* подсказка HRC изменена на «твёрдость ...» ([](https://github.com/fiscalagent/AppTochite/commit/7770ccef7d73bfa0ea744357e5bbd5927863308e))

## [1.56.3](https://github.com/fiscalagent/AppTochite/compare/v1.56.2...v1.56.3) (2026-05-18)


### fix

* диктовка показывает список кандидатов, когда их несколько (раньше всегда применяла первый) ([](https://github.com/fiscalagent/AppTochite/commit/1f9cb2658ae09cdd04084bf851b5f62bce8bf40d))

## [1.56.2](https://github.com/fiscalagent/AppTochite/compare/v1.56.1...v1.56.2) (2026-05-18)


### fix

* фокус на поле клиента и серый цвет placeholder в select ([](https://github.com/fiscalagent/AppTochite/commit/aca81abc5d4aff27081332e9bff27eb443c264e6))

## [1.56.1](https://github.com/fiscalagent/AppTochite/compare/v1.56.0...v1.56.1) (2026-05-18)


### fix

* убран неиспользуемый параметр vLow в scoreCandidate — падение CI ([](https://github.com/fiscalagent/AppTochite/commit/2898b687917fab01baecf974af40227eaabe2859))

# [1.56.0](https://github.com/fiscalagent/AppTochite/compare/v1.55.2...v1.56.0) (2026-05-18)


### feat

* диктовка — поля «твёрдость/HRC/ХРЦ», синонимы «камни», «комментарий/комментарии» ([](https://github.com/fiscalagent/AppTochite/commit/929bea38a75d989617bff98275112362911e546b))


### fix

* fuzzy-поиск равноправен для кириллицы и латиницы — Grinderman 1000 и Гриндерман 120 оба в списке ([](https://github.com/fiscalagent/AppTochite/commit/1b6274247b664dd191d54a53d83f1c792f807d3a))

## [1.55.2](https://github.com/fiscalagent/AppTochite/compare/v1.55.1...v1.55.2) (2026-05-18)


### fix

* HistoryFeed сбрасывает страницу без лишнего эффекта ([](https://github.com/fiscalagent/AppTochite/commit/b728e7dcd65d2a23052e9d544bd57e5f0e96f0ab))
* атомарность БД-операций — транзакции при удалении клиента и updatedAt у аватара ([](https://github.com/fiscalagent/AppTochite/commit/a717c9fd0a64e36d2ff17cfdd64580c3abe0ac13))
* блюр модалок устойчив к наложению — переход на токены вместо глобального счётчика ([](https://github.com/fiscalagent/AppTochite/commit/46fffe3c43f0b62853cc52bd7722447273815a7d))
* список клиентов открывается быстрее — один запрос вместо N+1 ([](https://github.com/fiscalagent/AppTochite/commit/138d0f249c80dd9d14c92c5b2b8443f0299d1169))

## [1.55.1](https://github.com/fiscalagent/AppTochite/compare/v1.55.0...v1.55.1) (2026-05-18)


### fix

* тип handleSave стал несовместим с onClick — обернул в стрелку ([](https://github.com/fiscalagent/AppTochite/commit/bec1ecd7458d97ded0ef518cd71ba447bc256422))

# [1.55.0](https://github.com/fiscalagent/AppTochite/compare/v1.54.1...v1.55.0) (2026-05-18)


### feat

* голосовая диктовка — диспетчер команд с поддержкой стоп и повтори ([](https://github.com/fiscalagent/AppTochite/commit/34e8fa2600c781d886598fa0f7fcdd888951d345))
* голосовая диктовка — кнопка-тумблер и индикатор «слышу» в шапке формы заточки ([](https://github.com/fiscalagent/AppTochite/commit/4a9ead3833ef1921c6cd76ec81ddbab2bf063e4a))
* голосовая диктовка — команды Заточки и добавление камня в список ([](https://github.com/fiscalagent/AppTochite/commit/e321acfbf4e45851af6dd6fbfa3804bb3ba4b594))
* голосовая диктовка — команды Приёмки и список кандидатов для fuzzy-выбора ([](https://github.com/fiscalagent/AppTochite/commit/40eb0372b8cb20b59f946ca0f3689a9c4c2fee69))
* голосовая диктовка — коррекции: очистить поле и удалить последний камень ([](https://github.com/fiscalagent/AppTochite/commit/dc9b6229a2879361748c3146ef66010eaf4b197c))
* голосовая диктовка — навигация, сохранение и подтверждение отмены ([](https://github.com/fiscalagent/AppTochite/commit/b733a6c2c8b686cc5f6de078cd662aea5acdd5c8))
* голосовая диктовка — хук непрерывного слушания с авто-перезапуском ([](https://github.com/fiscalagent/AppTochite/commit/0e4ffacbd63176189638774092b81844747121ce))


### fix

* голосовая диктовка — устранены stale closure в колбэках и конфликт двух SR-сессий ([](https://github.com/fiscalagent/AppTochite/commit/c7d5672f1feee8fd3bf89285cf760e9e294f6e72))

## [1.54.1](https://github.com/fiscalagent/AppTochite/compare/v1.54.0...v1.54.1) (2026-05-17)


### fix

* пробрасывать VITE_ANALYTICS_URL в прод-сборку — аналитика не работала у пользователей ([](https://github.com/fiscalagent/AppTochite/commit/9d8c436bc675a7bb3c304102b8cb734bbe41e988))

# [1.54.0](https://github.com/fiscalagent/AppTochite/compare/v1.53.2...v1.54.0) (2026-05-17)


### feat

* голосовой довыбор сужает список и слушает продолжение — grinderman → 120 → FEPA ([](https://github.com/fiscalagent/AppTochite/commit/5657bd8e53f53f2728b987e4a90e3b0026e07e5f))

## [1.53.2](https://github.com/fiscalagent/AppTochite/compare/v1.53.1...v1.53.2) (2026-05-17)


### fix

* автодополнение ножа дополняет историю клиента полным справочником, а не заменяет его ([](https://github.com/fiscalagent/AppTochite/commit/4c6c7cd32a2497f25466bed7258b3df828088279))

## [1.53.1](https://github.com/fiscalagent/AppTochite/compare/v1.53.0...v1.53.1) (2026-05-17)


### fix

* микрофон не закрывается между поиском и довыбором — слушает 1000 мс подряд ([](https://github.com/fiscalagent/AppTochite/commit/3893e4b4e88e02d1be49b37df2be2518c486361a))

# [1.53.0](https://github.com/fiscalagent/AppTochite/compare/v1.52.0...v1.53.0) (2026-05-17)


### feat

* автоматический довыбор голосом — после списка микрофон сам слушает уточнение ([](https://github.com/fiscalagent/AppTochite/commit/29e831a4204296e964c1780c6e74ac66f14e3164))

# [1.52.0](https://github.com/fiscalagent/AppTochite/compare/v1.51.1...v1.52.0) (2026-05-17)


### feat

* довыбор из списка совпадений голосом — "8" выбирает AUS-8 ([](https://github.com/fiscalagent/AppTochite/commit/aa57766c174ca3c0ca58adc1fe7b072441b4959f))

## [1.51.1](https://github.com/fiscalagent/AppTochite/compare/v1.51.0...v1.51.1) (2026-05-17)


### fix

* голосовой ввод — убрать авто-перезапуск, список совпадений всегда тапается ([](https://github.com/fiscalagent/AppTochite/commit/9cd5a19639522b7c48883e76831a4ec879130f33))

# [1.51.0](https://github.com/fiscalagent/AppTochite/compare/v1.50.0...v1.51.0) (2026-05-17)


### feat

* голосовой ввод клиента и HRC, щадящий матчинг для русского произношения и фолбэк на произнесённый текст ([](https://github.com/fiscalagent/AppTochite/commit/29b1ff50575af0110412b05dc087df26bfb18d98))

# [1.50.0](https://github.com/fiscalagent/AppTochite/compare/v1.49.1...v1.50.0) (2026-05-17)


### feat

* голосовой поиск через отдельный список совпадений под полем ([](https://github.com/fiscalagent/AppTochite/commit/dd6c7fb1d60fe2af638567ee5aea7da10c186345))

## [1.49.1](https://github.com/fiscalagent/AppTochite/compare/v1.49.0...v1.49.1) (2026-05-17)


### fix

* двухфазовый голосовой ввод — дропдаун и только справочник ([](https://github.com/fiscalagent/AppTochite/commit/a32dbe8c2cffdb818b84ca9b4bd70a8e58981c0c))

# [1.49.0](https://github.com/fiscalagent/AppTochite/compare/v1.48.0...v1.49.0) (2026-05-17)


### feat

* двухфазовый голосовой ввод для сталей, ножей и камней ([](https://github.com/fiscalagent/AppTochite/commit/52260cfe2611395ad75fcd549bf1c7460aa9e4ff))

# [1.48.0](https://github.com/fiscalagent/AppTochite/compare/v1.47.1...v1.48.0) (2026-05-17)


### feat

* нечёткое распознавание камней по голосу — транслитерация и bigram-сходство ([](https://github.com/fiscalagent/AppTochite/commit/c293e5650edbad18734d32cf75ac242c11906374))
* нечёткое распознавание ножа и стали по голосу — транслитерация и bigram-сходство ([](https://github.com/fiscalagent/AppTochite/commit/27b88128be9e6dd5fd153aec16621df24f200533))

## [1.47.1](https://github.com/fiscalagent/AppTochite/compare/v1.47.0...v1.47.1) (2026-05-16)


### fix

* типы Web Speech API — убрать зависимость от глобального SpeechRecognition ([](https://github.com/fiscalagent/AppTochite/commit/06ec5fbd840e48db7ee1f44689b6bf19624e1a86))

# [1.47.0](https://github.com/fiscalagent/AppTochite/compare/v1.46.0...v1.47.0) (2026-05-16)


### feat

* голосовой ввод полей формы заточки (бета, opt-in в настройках) ([](https://github.com/fiscalagent/AppTochite/commit/849e528e7e55021e6ac93c6d9c9d120fc2ecede9))

# [1.46.0](https://github.com/fiscalagent/AppTochite/compare/v1.45.7...v1.46.0) (2026-05-16)


### feat

* два слота автобэкапа — при закрытии и ежедневный с датой в имени ([](https://github.com/fiscalagent/AppTochite/commit/f6d5b8ee45c9246f430518bc73153f717cf89316))

## [1.45.7](https://github.com/fiscalagent/AppTochite/compare/v1.45.6...v1.45.7) (2026-05-16)


### fix

* формы добавления камня, стали и ножа как центрированный диалог с блюром ([](https://github.com/fiscalagent/AppTochite/commit/d5fd8fff67c5557c0884894f33f82795204ee80c))

## [1.45.6](https://github.com/fiscalagent/AppTochite/compare/v1.45.5...v1.45.6) (2026-05-16)


### fix

* форма нового камня по центру экрана вместо bottom sheet ([](https://github.com/fiscalagent/AppTochite/commit/5908be17dccacc598874518d86d0a6e41d97b1b3))

## [1.45.5](https://github.com/fiscalagent/AppTochite/compare/v1.45.4...v1.45.5) (2026-05-16)


### fix

* убрать двойной фон в bottom sheet добавления камня из формы заточки ([](https://github.com/fiscalagent/AppTochite/commit/29ea1274e55e8d12bee655a6bdcf452b153b462e))

## [1.45.4](https://github.com/fiscalagent/AppTochite/compare/v1.45.3...v1.45.4) (2026-05-16)


### fix

* блюр фона при добавлении камня из формы заточки ([](https://github.com/fiscalagent/AppTochite/commit/8f1c0e492d021bda866bf829e244d2b9d2db33b6))

## [1.45.3](https://github.com/fiscalagent/AppTochite/compare/v1.45.2...v1.45.3) (2026-05-16)


### fix

* блюр через прямой style на #root вместо CSS-класса (обход кэша SW) ([](https://github.com/fiscalagent/AppTochite/commit/13ba4dfc8ffd2f159f302acbcc1b43d4130815d6)), closes [#root](https://github.com/fiscalagent/AppTochite/issues/root)

## [1.45.2](https://github.com/fiscalagent/AppTochite/compare/v1.45.1...v1.45.2) (2026-05-16)


### fix

* блюр фона при добавлении/редактировании камня — форма через портал с оверлеем ([](https://github.com/fiscalagent/AppTochite/commit/3b826b77ce63a045573af13d340b4c5c3f7c390b))

## [1.45.1](https://github.com/fiscalagent/AppTochite/compare/v1.45.0...v1.45.1) (2026-05-16)


### fix

* блюр фона через filter на #root вместо backdrop-filter ([](https://github.com/fiscalagent/AppTochite/commit/22547cfda99e9fc719b2fc0a96d56dfa98a6bcfa)), closes [#root](https://github.com/fiscalagent/AppTochite/issues/root) [#root](https://github.com/fiscalagent/AppTochite/issues/root)

# [1.45.0](https://github.com/fiscalagent/AppTochite/compare/v1.44.1...v1.45.0) (2026-05-16)


### feat

* офлайн-буфер аналитики — события сохраняются в очередь и отправляются при восстановлении сети ([](https://github.com/fiscalagent/AppTochite/commit/77317c8692b4810c57bac218ec68e7b2d4f6a72f))


### fix

* добавить -webkit-backdrop-filter для блюра на Android ([](https://github.com/fiscalagent/AppTochite/commit/5ee30a3b525ef0ecc556b9877a5302e363d3ad6e))

## [1.44.1](https://github.com/fiscalagent/AppTochite/compare/v1.44.0...v1.44.1) (2026-05-15)


### fix

* выравнивание пунктов в секции Настройки в «О программе» ([](https://github.com/fiscalagent/AppTochite/commit/c9f945cf19bc920beff42602189daeeb57d5fa6a))

# [1.44.0](https://github.com/fiscalagent/AppTochite/compare/v1.43.5...v1.44.0) (2026-05-15)


### feat

* блюр фона под модалками + fuzzy-подсказки при добавлении камня ([](https://github.com/fiscalagent/AppTochite/commit/f24bada55ee9c59c5584c9eac3a6a3350dbec815))

## [1.43.5](https://github.com/fiscalagent/AppTochite/compare/v1.43.4...v1.43.5) (2026-05-15)


### fix

* пробел между гритностью и единицей измерения (1000 FEPA, 2000 JIS) ([](https://github.com/fiscalagent/AppTochite/commit/e6478967f095f7b35885c57d8009718eb13b82ab))

## [1.43.4](https://github.com/fiscalagent/AppTochite/compare/v1.43.3...v1.43.4) (2026-05-15)

## [1.43.3](https://github.com/fiscalagent/AppTochite/compare/v1.43.2...v1.43.3) (2026-05-15)


### fix

* точный поиск последнего токена по пробелу — 120 пробел не находит 1200 ([](https://github.com/fiscalagent/AppTochite/commit/1eb6f4c6efed902d9e4487c4f0119c115ad723c9))

## [1.43.2](https://github.com/fiscalagent/AppTochite/compare/v1.43.1...v1.43.2) (2026-05-15)


### fix

* добавить analytics.ts в git, убрать неиспользуемый импорт isAnalyticsEnabled ([](https://github.com/fiscalagent/AppTochite/commit/aa7cb14c6f3836c50429885079cb2355a4111f9b))

## [1.43.1](https://github.com/fiscalagent/AppTochite/compare/v1.43.0...v1.43.1) (2026-05-15)


### fix

* правильный импорт db в OnboardingSheet, аналитика в форме и детали заточки, тогл opt-out в «О программе» ([](https://github.com/fiscalagent/AppTochite/commit/a626cde0624a80794aa693cacae5e2d03ef47ce4))

# [1.43.0](https://github.com/fiscalagent/AppTochite/compare/v1.42.0...v1.43.0) (2026-05-15)


### feat

* мульти-токенный поиск в автодополнении — GRIN 120 находит Grinderman OA CLR 120 ([](https://github.com/fiscalagent/AppTochite/commit/5b726e38e3dc1a59758af18ee3273c9e59c9a2c8))

# [1.42.0](https://github.com/fiscalagent/AppTochite/compare/v1.41.0...v1.42.0) (2026-05-15)


### feat

* онбординг — welcome sheet при первом запуске и ссылка на инструкцию в «О программе» ([](https://github.com/fiscalagent/AppTochite/commit/ddb5e87dbf58387178ba5ba8f583c5f93d20790c))

# [1.41.0](https://github.com/fiscalagent/AppTochite/compare/v1.40.0...v1.41.0) (2026-05-15)


### feat

* слияние бэкапов, тип камня «другой», updatedAt везде ([](https://github.com/fiscalagent/AppTochite/commit/645b85beeed34c3da101bc1d95f8a1823a655ff1))

# [1.40.0](https://github.com/fiscalagent/AppTochite/compare/v1.39.1...v1.40.0) (2026-05-15)


### feat

* объединить кнопки шаринга в одну с bottom sheet выбора ([](https://github.com/fiscalagent/AppTochite/commit/f2871b84c15e65d3c77c2eb2ca26befa7ac92714))

## [1.39.1](https://github.com/fiscalagent/AppTochite/compare/v1.39.0...v1.39.1) (2026-05-15)


### fix

* **reference:** тепловая карта — шире колонка камня, адаптивный шрифт ([](https://github.com/fiscalagent/AppTochite/commit/78ca7b9f31890edc616dcf5e7d973e81fbcfc1f6))

# [1.39.0](https://github.com/fiscalagent/AppTochite/compare/v1.38.0...v1.39.0) (2026-05-14)


### feat

* **seed:** заменить справочник камней на 101 камень из таблицы (хэш-подход) ([](https://github.com/fiscalagent/AppTochite/commit/a05d4a083c76a8c215051b8e3adb4b40140c71cd))

# [1.38.0](https://github.com/fiscalagent/AppTochite/compare/v1.37.1...v1.38.0) (2026-05-14)


### feat

* поле СОЖ (вода/масло) для камней + поиск *вода/*масло ([](https://github.com/fiscalagent/AppTochite/commit/f2ae56526a1479ec370867615ee031dad327e70e))

## [1.37.1](https://github.com/fiscalagent/AppTochite/compare/v1.37.0...v1.37.1) (2026-05-14)


### fix

* updatedAt в типах Stone, Steel, Knife + миграция v5 ([](https://github.com/fiscalagent/AppTochite/commit/70ee2d2ef6aeea8c49fd3dfad1caecae0529c060))

# [1.37.0](https://github.com/fiscalagent/AppTochite/compare/v1.36.5...v1.37.0) (2026-05-14)


### feat

* поделиться фото до/после с вотермарком @AppTochite ([](https://github.com/fiscalagent/AppTochite/commit/0ce76aa551b1c07c93cd90bcbe17715259512c4a))

## [1.36.5](https://github.com/fiscalagent/AppTochite/compare/v1.36.4...v1.36.5) (2026-05-14)


### fix

* имя заказчика — вынесено под название ножа на экране Z-2 ([](https://github.com/fiscalagent/AppTochite/commit/cfdae025a44173b209f70032d8fda44fac249986))

## [1.36.4](https://github.com/fiscalagent/AppTochite/compare/v1.36.3...v1.36.4) (2026-05-14)


### fix

* **reference:** иконка тепловой карты — график вместо сетки ([](https://github.com/fiscalagent/AppTochite/commit/cb28eb2979f55dfd87534b906d675c15f8944e58))

## [1.36.3](https://github.com/fiscalagent/AppTochite/compare/v1.36.2...v1.36.3) (2026-05-14)


### fix

* **reference:** тепловая карта — показываем число использований вместо % ([](https://github.com/fiscalagent/AppTochite/commit/34bd8e31fb9eebfd841e79ea7e3098ee2419738e))

## [1.36.2](https://github.com/fiscalagent/AppTochite/compare/v1.36.1...v1.36.2) (2026-05-13)


### fix

* типы File System Access API через отдельный .ts файл с декларациями ([](https://github.com/fiscalagent/AppTochite/commit/a9c44d4bd350d756ee6560e61f32bcc1de88084c))

## [1.36.1](https://github.com/fiscalagent/AppTochite/compare/v1.36.0...v1.36.1) (2026-05-13)


### fix

* исправлены ошибки сборки в AutoBackupContext ([](https://github.com/fiscalagent/AppTochite/commit/88bedcdec2ddf6c217345b70002182bbf5a1123c))

# [1.36.0](https://github.com/fiscalagent/AppTochite/compare/v1.35.0...v1.36.0) (2026-05-13)


### feat

* кнопка «Включить автобэкап» прямо в напоминалке о бэкапе ([](https://github.com/fiscalagent/AppTochite/commit/94282fca19147a7b94fd0a475329c7e10320d3c8))

# [1.35.0](https://github.com/fiscalagent/AppTochite/compare/v1.34.4...v1.35.0) (2026-05-13)


### feat

* автобэкап в папку через File System Access API ([](https://github.com/fiscalagent/AppTochite/commit/2f67b3b1c350edb2e116f7133218d088746607e2))

## [1.34.4](https://github.com/fiscalagent/AppTochite/compare/v1.34.3...v1.34.4) (2026-05-13)


### fix

* одиночный тап без ложного выбора при скролле списка ножей, сталей и камней ([](https://github.com/fiscalagent/AppTochite/commit/aa0d579e2511593d29aa9082baf34f83dc35d9b0))

## [1.34.3](https://github.com/fiscalagent/AppTochite/compare/v1.34.2...v1.34.3) (2026-05-13)


### fix

* ширина названия ножа вычисляется по реальной ширине текста угла ([](https://github.com/fiscalagent/AppTochite/commit/aaca63773aa13c8af3879ca704c4bdbcc3471e2c))

## [1.34.2](https://github.com/fiscalagent/AppTochite/compare/v1.34.1...v1.34.2) (2026-05-13)


### fix

* камни оборачиваются в пределах тёмного угла, правое выравнивание для правого тёмного угла ([](https://github.com/fiscalagent/AppTochite/commit/6b227c379cd16666f3e646e34333e4dba59dbb66))

## [1.34.1](https://github.com/fiscalagent/AppTochite/compare/v1.34.0...v1.34.1) (2026-05-13)


### fix

* градиент фото-отчёта затемняет оба верхних угла по более светлому ([](https://github.com/fiscalagent/AppTochite/commit/5339cdff30c9ac4e93398362ce8678ba0487a778))

# [1.34.0](https://github.com/fiscalagent/AppTochite/compare/v1.33.0...v1.34.0) (2026-05-13)


### feat

* адаптивное размещение текста и тонкий шрифт в фото-отчёте ([](https://github.com/fiscalagent/AppTochite/commit/c5bff2e3c58473eefaa949484ce2dc0ce03d09bf))

# [1.33.0](https://github.com/fiscalagent/AppTochite/compare/v1.32.2...v1.33.0) (2026-05-13)


### feat

* угол заточки в верхнем правом углу фото-отчёта ([](https://github.com/fiscalagent/AppTochite/commit/ede21b54e4126dc2a15dba15586290fbcc634b9d))

## [1.32.2](https://github.com/fiscalagent/AppTochite/compare/v1.32.1...v1.32.2) (2026-05-12)


### fix

* исправить TS-ошибки в SharpeningDetail — падение деплоя #129-131 ([](https://github.com/fiscalagent/AppTochite/commit/b441dfc48f6a89d864b1dd246821950937d3170b)), closes [#129-131](https://github.com/fiscalagent/AppTochite/issues/129-131)

## [1.32.1](https://github.com/fiscalagent/AppTochite/compare/v1.32.0...v1.32.1) (2026-05-12)


### fix

* превью фото-отчёта обрезало нижний блок камней на портретных фото ([](https://github.com/fiscalagent/AppTochite/commit/2b94ebb645902278eb3536184ff87c7e78d8c047))

# [1.32.0](https://github.com/fiscalagent/AppTochite/compare/v1.31.2...v1.32.0) (2026-05-12)


### feat

* удалена кнопка отправки заточки клиенту в Telegram ([](https://github.com/fiscalagent/AppTochite/commit/7642f5ed39ced397cfb283133e7f6299b71e5647))

## [1.31.2](https://github.com/fiscalagent/AppTochite/compare/v1.31.1...v1.31.2) (2026-05-12)


### fix

* фото-отчёт — финишный камень не обрезается, корректный isFinish ([](https://github.com/fiscalagent/AppTochite/commit/806778dbfcc23f59e6a6e8007886d926635c47bf))

## [1.31.1](https://github.com/fiscalagent/AppTochite/compare/v1.31.0...v1.31.1) (2026-05-12)


### fix

* фото-отчёт — нож наверху, корректный перенос камней ([](https://github.com/fiscalagent/AppTochite/commit/22da14a637e5a6490ddd90b8e3066d3569f0edd9))

# [1.31.0](https://github.com/fiscalagent/AppTochite/compare/v1.30.0...v1.31.0) (2026-05-12)


### feat

* фото-отчёт заточки с подписями камней и стали ([](https://github.com/fiscalagent/AppTochite/commit/1174eb19bb9e9c06bf30b2f3d9a2a86f398b5e57))

# [1.30.0](https://github.com/fiscalagent/AppTochite/compare/v1.29.6...v1.30.0) (2026-05-11)


### feat

* отправка заточки клиенту в Telegram из карточки записи ([](https://github.com/fiscalagent/AppTochite/commit/2d8fd097e37eacc0593dc45649fd120ec6c1741a))


### fix

* двойной тап для выбора из выпадающего списка в форме заточки ([](https://github.com/fiscalagent/AppTochite/commit/6a36f50ab3e681fedae419e28944e0dfc066193c))

## [1.29.6](https://github.com/fiscalagent/AppTochite/compare/v1.29.5...v1.29.6) (2026-05-11)


### fix

* двойной тап для выбора из выпадающего списка в форме заточки ([](https://github.com/fiscalagent/AppTochite/commit/36a153b9c77c5674eccbb748aebe9ebc40a21be4))

## [1.29.5](https://github.com/fiscalagent/AppTochite/compare/v1.29.4...v1.29.5) (2026-05-08)


### fix

* барабаны конвертера — быстрый wheel и touch поверх settling ([](https://github.com/fiscalagent/AppTochite/commit/0da3654a0cd395f1aaa2c0b2929af3b12e737a65))

## [1.29.4](https://github.com/fiscalagent/AppTochite/compare/v1.29.3...v1.29.4) (2026-05-08)


### fix

* конвертер — синхронизация барабанов при высоте 308px на ПК ([](https://github.com/fiscalagent/AppTochite/commit/391132c01666b865d43f6551c7e694f03ed6189a))

## [1.29.3](https://github.com/fiscalagent/AppTochite/compare/v1.29.2...v1.29.3) (2026-05-08)

## [1.29.2](https://github.com/fiscalagent/AppTochite/compare/v1.29.1...v1.29.2) (2026-05-08)


### fix

* конвертер гритностей — адаптив на ПК, µm и скролл колёсиком ([](https://github.com/fiscalagent/AppTochite/commit/9ba9a55598fd9ef14bab431054495e0683e99f79))

## [1.29.1](https://github.com/fiscalagent/AppTochite/compare/v1.29.0...v1.29.1) (2026-05-07)


### fix

* исправить регулярку в sync-version — убирать пустые ссылки ([](url)) из ченджлога ([](https://github.com/fiscalagent/AppTochite/commit/73fb67048a8ae9098f25419301362e06fefa453f))

# [1.29.0](https://github.com/fiscalagent/AppTochite/compare/v1.28.0...v1.29.0) (2026-05-07)


### feat

* ссылки на Telegram-группу и Boosty в разделе «Настройки» ([](https://github.com/fiscalagent/AppTochite/commit/81e030ddd00a73f9cc54653fb3f731c3605e3995))

# [1.28.0](https://github.com/fiscalagent/AppTochite/compare/v1.27.3...v1.28.0) (2026-05-07)


### feat

* **клиенты:** аватарки клиентов из камеры или галереи ([](https://github.com/fiscalagent/AppTochite/commit/5b21e4ad204f0d1c5f3286d1cd63f4109cb312ed))

## [1.27.3](https://github.com/fiscalagent/AppTochite/compare/v1.27.2...v1.27.3) (2026-05-06)


### fix

* **справочник:** бейдж «мой» при редактировании стандартного камня ([](https://github.com/fiscalagent/AppTochite/commit/78edf997e469bbd070edca9b54a2bd84b0674fca))

## [1.27.2](https://github.com/fiscalagent/AppTochite/compare/v1.27.1...v1.27.2) (2026-05-06)


### fix

* **эмблема:** APP и TOCHITE слитно без пробела ([](https://github.com/fiscalagent/AppTochite/commit/f172f6bda288c04f2143da1a5e4b59c4b7fdecd8))

## [1.27.1](https://github.com/fiscalagent/AppTochite/compare/v1.27.0...v1.27.1) (2026-05-06)


### fix

* **конвертер:** вернуть Bebas Neue для меток барабанов, ГОСТ → GOST ([](https://github.com/fiscalagent/AppTochite/commit/bbd0614a4c416287588d2abfadb90de627d8e8ec))

# [1.27.0](https://github.com/fiscalagent/AppTochite/compare/v1.26.10...v1.27.0) (2026-05-06)


### feat

* **брендинг:** добавить двуцветную эмблему AppTochite на 4 основных экрана ([](https://github.com/fiscalagent/AppTochite/commit/b3548363d4a3a6f975f034c275e78b4d1333c7ea))

## [1.26.10](https://github.com/fiscalagent/AppTochite/compare/v1.26.9...v1.26.10) (2026-05-06)


### fix

* **конвертер:** увеличить высоту bottom sheet с 80vh до 92vh ([](https://github.com/fiscalagent/AppTochite/commit/43ccce23ebc273c1cadc4d164127d3a620381d08))

## [1.26.9](https://github.com/fiscalagent/AppTochite/compare/v1.26.8...v1.26.9) (2026-05-06)


### fix

* **конвертер:** метки барабанов — Golos Text вместо Bebas Neue для корректного рендера кириллицы ([](https://github.com/fiscalagent/AppTochite/commit/15370f7937692358308d7f2c62d6e1f9d0e7cec8))

## [1.26.8](https://github.com/fiscalagent/AppTochite/compare/v1.26.7...v1.26.8) (2026-05-06)


### fix

* **таблица гритностей:** полная замена таблицы — 33 строки с микронами, FEPA 90/180 добавлены ([](https://github.com/fiscalagent/AppTochite/commit/116070b362cc80a7f050e916dab52b41520bd5ac))

## [1.26.7](https://github.com/fiscalagent/AppTochite/compare/v1.26.6...v1.26.7) (2026-05-05)


### fix

* **таблица гритностей:** добавить строку JIS 320 / FEPA 280 / ГОСТ 50/40 ([](https://github.com/fiscalagent/AppTochite/commit/d43d32e9f362b991f74b071071ac74e2a6630193))

## [1.26.6](https://github.com/fiscalagent/AppTochite/compare/v1.26.5...v1.26.6) (2026-05-05)


### fix

* **таблица гритностей:** убрать дублирующуюся строку FEPA 280 / JIS 360 / 40/28 ([](https://github.com/fiscalagent/AppTochite/commit/e36e1def67707a9da31019a512d36dc2b4f4b10b))

## [1.26.5](https://github.com/fiscalagent/AppTochite/compare/v1.26.4...v1.26.5) (2026-05-05)


### fix

* **таблица гритностей:** исправить строку JIS 600/ГОСТ 20/14 — FEPA 600 → FEPA 400 ([](https://github.com/fiscalagent/AppTochite/commit/014f423a9b4928f42606aa8ebfc4c3e7835b46fe))

## [1.26.4](https://github.com/fiscalagent/AppTochite/compare/v1.26.3...v1.26.4) (2026-05-05)


### fix

* **таблица гритностей:** добавить строки JIS 600/FEPA 600/ГОСТ 20/14 и JIS 800/FEPA 500/ГОСТ 14/10 ([](https://github.com/fiscalagent/AppTochite/commit/97b00d82a1791ba51224f6f179339c6f9dfd98c9))

## [1.26.3](https://github.com/fiscalagent/AppTochite/compare/v1.26.2...v1.26.3) (2026-05-05)


### fix

* **таблица гритностей:** добавить строку JIS 400 / FEPA 320 / ГОСТ 40/28 ([](https://github.com/fiscalagent/AppTochite/commit/ecd83c59a797dbf21364dea6a683674d120fa90e))

## [1.26.2](https://github.com/fiscalagent/AppTochite/compare/v1.26.1...v1.26.2) (2026-05-05)


### fix

* **таблица гритностей:** добавить строку JIS 2000 / FEPA 800 / ГОСТ 7/5 ([](https://github.com/fiscalagent/AppTochite/commit/7a935d4bef878f5dc985360d87e9d147fbb3507d))

## [1.26.1](https://github.com/fiscalagent/AppTochite/compare/v1.26.0...v1.26.1) (2026-05-05)


### fix

* **таблица гритностей:** исправить строку 40/28 — JIS 320/FEPA 320 → JIS 360/FEPA 280 ([](https://github.com/fiscalagent/AppTochite/commit/54b53c8368f05beb579957e6f44bd5def668b220))

# [1.26.0](https://github.com/fiscalagent/AppTochite/compare/v1.25.6...v1.26.0) (2026-05-05)


### feat

* **конвертер:** добавить четвёртое колёсико µm (микроны D50 по New JIS R 6001) ([](https://github.com/fiscalagent/AppTochite/commit/1acb4455199da3d6b812c047f2fd9f37e4c3e694))

## [1.25.6](https://github.com/fiscalagent/AppTochite/compare/v1.25.5...v1.25.6) (2026-05-05)


### fix

* **таблица гритностей:** добавить строку JIS 6000 / FEPA 1500 / ГОСТ 2/1 ([](https://github.com/fiscalagent/AppTochite/commit/a3ec539679e13bef5c9989f4f115df06baf459b5))

## [1.25.5](https://github.com/fiscalagent/AppTochite/compare/v1.25.4...v1.25.5) (2026-05-05)


### fix

* **таблица гритностей:** добавить строку JIS 320 / FEPA 320 / ГОСТ 40/28 ([](https://github.com/fiscalagent/AppTochite/commit/e123221649cdc776b2824cf76a89c678d2b92675))

## [1.25.4](https://github.com/fiscalagent/AppTochite/compare/v1.25.3...v1.25.4) (2026-05-05)


### fix

* **таблица гритностей:** добавить строку JIS 1200 / FEPA 600 / ГОСТ 10/7 ([](https://github.com/fiscalagent/AppTochite/commit/8e7743eab998202a9b3d87fd5c93975d9e3bcb88))

## [1.25.3](https://github.com/fiscalagent/AppTochite/compare/v1.25.2...v1.25.3) (2026-05-05)


### fix

* **конвертер гритностей:** крупные белые заголовки шкал, мк → ГОСТ (мк) ([](https://github.com/fiscalagent/AppTochite/commit/72b511925d0e76ac2dcaccb0a2f769f00fb530be))

## [1.25.2](https://github.com/fiscalagent/AppTochite/compare/v1.25.1...v1.25.2) (2026-05-05)


### fix

* **конвертер:** заменить ReturnType<setTimeout> на number для совместимости с CI ([](https://github.com/fiscalagent/AppTochite/commit/353b5dc91c5d6ee150ef77d02a7558c8432fdc0b))

## [1.25.1](https://github.com/fiscalagent/AppTochite/compare/v1.25.0...v1.25.1) (2026-05-05)


### fix

* **конвертер:** исправить ошибку типа useRef<setTimeout> в Drum ([](https://github.com/fiscalagent/AppTochite/commit/cbfad104da29d7bf0397c9f681ce556829c722b0))

# [1.25.0](https://github.com/fiscalagent/AppTochite/compare/v1.24.0...v1.25.0) (2026-05-05)


### feat

* **справочник камней:** конвертер гритностей — три барабана FEPA/JIS/мк + обновить таблицу соответствий ([](https://github.com/fiscalagent/AppTochite/commit/0abd90b47026512c28ce748af50282ae024a4233))


### fix

* **справочник камней:** убрать кнопку «нет» из выбора шкалы гритности ([](https://github.com/fiscalagent/AppTochite/commit/5c4626f15041ae0c0defcf5cb05dca40a790779e))

# [1.24.0](https://github.com/fiscalagent/AppTochite/compare/v1.23.1...v1.24.0) (2026-05-05)


### feat

* **справочник камней:** показывать альтернативные гритности выше и ниже основной в списке камней ([](https://github.com/fiscalagent/AppTochite/commit/8214c8a2b6b8c07c62aa1bbd19d56582f57ad464))

## [1.23.1](https://github.com/fiscalagent/AppTochite/compare/v1.23.0...v1.23.1) (2026-05-05)


### fix

* накопленные правки по ревью кода ([](https://github.com/fiscalagent/AppTochite/commit/1553334c8f81e6adfea30a26615695450111e929))

# [1.23.0](https://github.com/fiscalagent/AppTochite/compare/v1.22.0...v1.23.0) (2026-05-05)


### feat

* **справочник камней:** ручное переопределение гритности в других шкалах через форму Изменить ([](https://github.com/fiscalagent/AppTochite/commit/476b8e81d027da5b221e5a7cfa1ae87310e8a691))

# [1.22.0](https://github.com/fiscalagent/AppTochite/compare/v1.21.0...v1.22.0) (2026-05-05)


### feat

* селектор шкалы гритности и сортировка в справочнике камней ([](https://github.com/fiscalagent/AppTochite/commit/47da1279cb28e92718d4332bc18ae8d85b6fd3c9))
* **справочник камней:** конвертация гритности при смене шкалы в форме редактирования ([](https://github.com/fiscalagent/AppTochite/commit/757afd3b9e3adfbc7dcc2669aeecdcfee0ba61a2))

# [1.21.0](https://github.com/fiscalagent/AppTochite/compare/v1.20.0...v1.21.0) (2026-05-05)


### feat

* конвертер гритности FEPA/JIS/ГОСТ в справочнике и форме заточки ([](https://github.com/fiscalagent/AppTochite/commit/5ca6258f6f2ef9b8f45260a64eee653f4bf9b42d))

# [1.20.0](https://github.com/fiscalagent/AppTochite/compare/v1.19.0...v1.20.0) (2026-05-03)


### feat

* **sharpening:** динамический placeholder ножа из истории клиента ([](https://github.com/fiscalagent/AppTochite/commit/3f70237349a404aff815ffda61cde5d44f6af9c0))

# [1.19.0](https://github.com/fiscalagent/AppTochite/compare/v1.18.0...v1.19.0) (2026-05-03)


### feat

* редактирование камня в справочнике ([](https://github.com/fiscalagent/AppTochite/commit/82c18a21f915efb515fedd29d61f33bda6371d87))

# [1.18.0](https://github.com/fiscalagent/AppTochite/compare/v1.17.0...v1.18.0) (2026-05-03)


### feat

* **sharpening:** подсказки ножей из истории клиента по частоте ([](https://github.com/fiscalagent/AppTochite/commit/25fb9ac2a7f8ec38122f4cd6860fad05acc21073))

# [1.17.0](https://github.com/fiscalagent/AppTochite/compare/v1.16.1...v1.17.0) (2026-05-03)


### feat

* **reference:** поиск камней по типу абразива через *алмаз ([](https://github.com/fiscalagent/AppTochite/commit/8a8f80f18ff3bb09e6f3e6ff074f4b86beb0aec0))

## [1.16.1](https://github.com/fiscalagent/AppTochite/compare/v1.16.0...v1.16.1) (2026-05-03)


### fix

* **seed:** исправить тип TSPROF Alpha с galvanic на diamond ([](https://github.com/fiscalagent/AppTochite/commit/f1c58ca755dd7b60970796a5be785464f4f07c89))

# [1.16.0](https://github.com/fiscalagent/AppTochite/compare/v1.15.0...v1.16.0) (2026-05-03)


### feat

* **reference:** убрать рекомендуемый угол из карточек сталей ([](https://github.com/fiscalagent/AppTochite/commit/919d65949b892a3751ac994951b90265155535e6))

# [1.15.0](https://github.com/fiscalagent/AppTochite/compare/v1.14.0...v1.15.0) (2026-04-29)


### feat

* **sharpening-detail:** подсветка фото-обложки на экране заточки ([](https://github.com/fiscalagent/AppTochite/commit/49e0187841ce5ac40ef09731ca58472313271c6a))

# [1.14.0](https://github.com/fiscalagent/AppTochite/compare/v1.13.1...v1.14.0) (2026-04-29)


### feat

* **client-card:** пагинация заточек по 10 со стрелками ([](https://github.com/fiscalagent/AppTochite/commit/8adfba8880e16cb8c9780fb49a5280a05d8f4011))

## [1.13.1](https://github.com/fiscalagent/AppTochite/compare/v1.13.0...v1.13.1) (2026-04-29)


### perf

* урезать фото до 1 в запросах списков (thumbnail) ([](https://github.com/fiscalagent/AppTochite/commit/0040561c2dfee852a8128065d6cd00c5f67a152a))

# [1.13.0](https://github.com/fiscalagent/AppTochite/compare/v1.12.0...v1.13.0) (2026-04-29)


### feat

* повтор заточки и thumbnail в карточке клиента ([](https://github.com/fiscalagent/AppTochite/commit/998fb63e82285f7409deb9dcfa2177e03ff0aa27))

# [1.12.0](https://github.com/fiscalagent/AppTochite/compare/v1.11.0...v1.12.0) (2026-04-29)


### feat

* **sharpening:** финишный камень — плашка FIN и учёт в тепловой карте ([](https://github.com/fiscalagent/AppTochite/commit/c9eb35f6c03b7033b933cb25e2d9b4457f0a74b2))

# [1.11.0](https://github.com/fiscalagent/AppTochite/compare/v1.10.0...v1.11.0) (2026-04-29)


### feat

* **db:** добавить камни с tsprof.ru — v11 миграция ([](https://github.com/fiscalagent/AppTochite/commit/85c9aca5b49337818e611d9afd25e07673a3efd4))

# [1.10.0](https://github.com/fiscalagent/AppTochite/compare/v1.9.1...v1.10.0) (2026-04-29)


### feat

* thumbnail в ленте, фильтр по ножу, автодополнение стали в справочнике ([](https://github.com/fiscalagent/AppTochite/commit/51865d6c1a3b49c8dfffead1e3dbeeedc153008a))

## [1.9.1](https://github.com/fiscalagent/AppTochite/compare/v1.9.0...v1.9.1) (2026-04-29)


### fix

* **db:** убрать полные дубли из справочников seed ([](https://github.com/fiscalagent/AppTochite/commit/f4ea2b64779dd3978f699ddf2daac288b2eddcc4))

# [1.9.0](https://github.com/fiscalagent/AppTochite/compare/v1.8.0...v1.9.0) (2026-04-29)


### feat

* прогресс-бар размера хранилища в настройках ([](https://github.com/fiscalagent/AppTochite/commit/c3e77f759ee224ef1fdc2e441b0edfb6e58927d3))

# [1.8.0](https://github.com/fiscalagent/AppTochite/compare/v1.7.0...v1.8.0) (2026-04-28)


### feat

* **db:** добавить v9 и v10 миграции справочников ([](https://github.com/fiscalagent/AppTochite/commit/ab1738fab1e263da5247b450bea0368a87adaa7c))

# [1.7.0](https://github.com/fiscalagent/AppTochite/compare/v1.6.1...v1.7.0) (2026-04-28)


### feat

* добавить тип абразива керамика ([](https://github.com/fiscalagent/AppTochite/commit/38ba4247b81e8f1c06a2929488e8a656d67efb66))

## [1.6.1](https://github.com/fiscalagent/AppTochite/compare/v1.6.0...v1.6.1) (2026-04-27)


### fix

* **scripts:** добавить data:image/png;base64, префикс в генераторе фото ([](https://github.com/fiscalagent/AppTochite/commit/40d20401d0acf276f3cc6541fa701ee9055e2ca8))

# [1.6.0](https://github.com/fiscalagent/AppTochite/compare/v1.5.1...v1.6.0) (2026-04-27)


### feat

* **backup:** поднять лимит импорта с 50 до 200 МБ ([](https://github.com/fiscalagent/AppTochite/commit/6b18d7a991f3d07edc1885853580d60d31feb39a))

## [1.5.1](https://github.com/fiscalagent/AppTochite/compare/v1.5.0...v1.5.1) (2026-04-27)


### fix

* **autocomplete:** поиск по включению вместо префикса ([](https://github.com/fiscalagent/AppTochite/commit/960fa88cd16c516c6e8cce66570431294c6eb924))

# [1.5.0](https://github.com/fiscalagent/AppTochite/compare/v1.4.1...v1.5.0) (2026-04-27)


### feat

* **reference:** тепловая карта использования камней по позициям ([](https://github.com/fiscalagent/AppTochite/commit/ccee2a1d4bf13326df9455c8383f25954db35dae))

## [1.4.1](https://github.com/fiscalagent/AppTochite/compare/v1.4.0...v1.4.1) (2026-04-27)


### fix

* «Я» создаётся до большой транзакции — надёжный seed при сбое на устройстве ([](https://github.com/fiscalagent/AppTochite/commit/bea913f065e1ce4d7850eac3e4b0964419232063))

# [1.4.0](https://github.com/fiscalagent/AppTochite/compare/v1.3.1...v1.4.0) (2026-04-27)


### feat

* поиск по комментарию — сниппет совпадения в строке истории ([](https://github.com/fiscalagent/AppTochite/commit/53f3597c820c622008cee3233c7588a32400f35d))

## [1.3.1](https://github.com/fiscalagent/AppTochite/compare/v1.3.0...v1.3.1) (2026-04-26)


### Bug Fixes

* STONE_TYPE_LABELS — обработка undefined type ([8f1d83b](https://github.com/fiscalagent/AppTochite/commit/8f1d83bd9e88695940f60806ff95409a4d44a601))

# [1.3.0](https://github.com/fiscalagent/AppTochite/compare/v1.2.1...v1.3.0) (2026-04-26)


### Features

* добавить опцию «иное» в тип абразива ([ad165e3](https://github.com/fiscalagent/AppTochite/commit/ad165e34eddfbbad98f06d4f5be9353d705d8709))

## [1.2.1](https://github.com/fiscalagent/AppTochite/compare/v1.2.0...v1.2.1) (2026-04-26)


### Bug Fixes

* стабилизация тестов — синглтон db вынесен в instance.ts, fileParallelism отключён ([b5d2a6e](https://github.com/fiscalagent/AppTochite/commit/b5d2a6ecfeed3641b5fb82c011255f4f95627afa))

# [1.2.0](https://github.com/fiscalagent/AppTochite/compare/v1.1.0...v1.2.0) (2026-04-26)


### Features

* иконка шестерёнки вместо скачать, заголовок «Настройки» ([f245d6c](https://github.com/fiscalagent/AppTochite/commit/f245d6ca971cb9635297246ed58bae77af7e5e23))

# [1.1.0](https://github.com/fiscalagent/AppTochite/compare/v1.0.0...v1.1.0) (2026-04-26)


### Features

* баннер обнаружения WebView (Telegram in-app browser) ([7e1b887](https://github.com/fiscalagent/AppTochite/commit/7e1b88784746f012b181f46bfdb140bfb28657e7))

# 1.0.0 (2026-04-26)


### Bug Fixes

* appendChild/removeChild в downloadBlob для надёжной работы на Android ([203b8cc](https://github.com/fiscalagent/AppTochite/commit/203b8cc858d28c89b646b73e552d0570404b9e16))
* cleaner удаляет все IndexedDB, localStorage и показывает инструкцию по иконке ([914b577](https://github.com/fiscalagent/AppTochite/commit/914b5775e2897ade46e36154f7922aae41829b0f))
* exclude guide.html from service worker navigateFallback ([ed1b623](https://github.com/fiscalagent/AppTochite/commit/ed1b623df9dd7c75acef47d785272b0054ebe349))
* grit опциональный в интерфейсе Stone ([547bbf2](https://github.com/fiscalagent/AppTochite/commit/547bbf2bb3357da8533d134a34be7da544b31a09))
* guide.html — Бета-версия, убрано «профессионального» ([697d985](https://github.com/fiscalagent/AppTochite/commit/697d985d8b6cf0cba11685f5ab49b899dc25c884))
* legacy-peer-deps для совместимости vite-plugin-pwa с Vite 8 ([d12d6a0](https://github.com/fiscalagent/AppTochite/commit/d12d6a0de5ee4fa2b3f05aed496c300f16d37adc))
* navigateFallback указывает на правильный путь с base ([7ebc77f](https://github.com/fiscalagent/AppTochite/commit/7ebc77f69941a61b3f398e3bc5bd4825bd447171))
* npm install вместо npm ci для обхода peer-dep конфликта ([f57e0bf](https://github.com/fiscalagent/AppTochite/commit/f57e0bf4d761e122e2b666fa5e8959372e7c42cb))
* исправления по ревью экрана бэкапа ([af555d7](https://github.com/fiscalagent/AppTochite/commit/af555d76a9fe98b206c6cb678d18dbb245dd2c54))
* исправлены TypeScript-ошибки в PhotoLightbox для CI ([ee65a7c](https://github.com/fiscalagent/AppTochite/commit/ee65a7c213a597f6c34395b7e0edd68f371c82e4))
* исправлены ошибки формы заточки и улучшен UX ([9259460](https://github.com/fiscalagent/AppTochite/commit/92594603a5a010a1d0e7c1b4309aa947cce0cb8b))
* кнопка удаления в справочниках доступна для всех записей ([54bce1c](https://github.com/fiscalagent/AppTochite/commit/54bce1c6ef393e3b23cc6a4942d57902dc5ffc4d))
* не показывать напоминание о бэкапе в первые 3 дня после установки ([cad83a2](https://github.com/fiscalagent/AppTochite/commit/cad83a2de0e7f92597971dca4273d4cdab5609dc))
* передать таблицы массивом в db.transaction (превышен лимит аргументов Dexie) ([87afcc3](https://github.com/fiscalagent/AppTochite/commit/87afcc3febfce8857dfd2c5ef8ea362e20a213f2))
* перезагрузка при блокировке апгрейда Dexie (db.on blocked) ([a6bafdd](https://github.com/fiscalagent/AppTochite/commit/a6bafddb4fc69ab968fb3f6da726f2cde6ccca28))
* сохранение новых камней перенесено в момент сохранения формы ([f201168](https://github.com/fiscalagent/AppTochite/commit/f201168326da3c592f3141b41dd8c748421032d3))
* убран кеш npm из CI для чистой установки ([b5a67f0](https://github.com/fiscalagent/AppTochite/commit/b5a67f0e5909c515ea030562edf8dd1b757b7abf))
* удалить неиспользуемый проп noun из SelectionBar ([f584d64](https://github.com/fiscalagent/AppTochite/commit/f584d640777b2d717acad8befdb9c45fa29bb5c5))
* устранены все ошибки ESLint (ternary-as-statement → if/else, setState-in-effect) ([3dc0568](https://github.com/fiscalagent/AppTochite/commit/3dc0568715c743b70f493a7c4cade93702cf802c))
* явный --legacy-peer-deps в npm ci на CI ([75592f0](https://github.com/fiscalagent/AppTochite/commit/75592f00f643f1367bb0ef8484dba8b931a07c25))


### Features

* PhotoLightbox компонент + улучшения SharpeningDetail/Form ([872c5ec](https://github.com/fiscalagent/AppTochite/commit/872c5ece278606e31eb9d6eae52a4c03966d029a))
* версионирование БД и seed-миграции ([d53f86f](https://github.com/fiscalagent/AppTochite/commit/d53f86f1004dcd5fefa6cd851eefa2e62a98b6de))
* всё приложение MVP + PWA ([33fec3a](https://github.com/fiscalagent/AppTochite/commit/33fec3aae6fc3e73dd578f0733988dcfbf21ff61))
* выбор источника фото — камера или галерея ([9d46c1a](https://github.com/fiscalagent/AppTochite/commit/9d46c1abc82b15860dc43fdbb9104d2fae2cb382))
* гритность камня необязательна + создание камня из формы заточки ([fa7913c](https://github.com/fiscalagent/AppTochite/commit/fa7913c426da6020ca56ff1e4abf38c32147178d))
* гритность камня необязательна + создание камня из формы заточки ([47f12c8](https://github.com/fiscalagent/AppTochite/commit/47f12c8849ab8274f6e55f3e7edb9235c7379956))
* добавить № заточки (id) в CSV-экспорт ([360d891](https://github.com/fiscalagent/AppTochite/commit/360d891862b963ea1c510f581ec7c9d0dc3430f5))
* единицы гритности FEPA / JIS / мк для камней ([ffae949](https://github.com/fiscalagent/AppTochite/commit/ffae949116588858b60a5547c472c5533c1a91bb))
* заменить теги состояния на тип работы в форме приёмки ([637834a](https://github.com/fiscalagent/AppTochite/commit/637834a52ec41066d076f8fd384f10bc4563c4da))
* заменить тип камня на тип абразива (7 значений) ([ef7ca18](https://github.com/fiscalagent/AppTochite/commit/ef7ca18bb2e3d897ba1db5703b6cb1354e166a31))
* золотая корона на аватаре нулевого клиента «Я» ([4440fe6](https://github.com/fiscalagent/AppTochite/commit/4440fe6c81a29e78620a0819565804ce2de86758))
* кнопка «Выбрать все» в справочниках ([225aabd](https://github.com/fiscalagent/AppTochite/commit/225aabd850c793e3325aeb6ce1808c0ae2332e7f))
* кнопки «Добавить сталь/нож» перемещены вверх списков ([082dad2](https://github.com/fiscalagent/AppTochite/commit/082dad218f1417906ab611c6bf34b339bf50e27d))
* лимит 5 фото до/после на заточку ([b285c8a](https://github.com/fiscalagent/AppTochite/commit/b285c8a46bcd025586515cef4a2a895b6078ddd0))
* мультиселект и удаление записей в справочниках ([9122863](https://github.com/fiscalagent/AppTochite/commit/91228638992a61f69c07619f67a25800f1f1ec51))
* напоминание о бэкапе раз в 7 дней ([59c080c](https://github.com/fiscalagent/AppTochite/commit/59c080c042b6828eaf06be10299721bc93a36e9c))
* настройка деплоя на GitHub Pages ([eb951a6](https://github.com/fiscalagent/AppTochite/commit/eb951a66617a2d5237947f1f3c41705d218f96fc))
* новая иконка и переименование приложения в AppTochite ([29aaab1](https://github.com/fiscalagent/AppTochite/commit/29aaab19e430b82a81b4316f326c6c776229406b))
* поиск в списке клиентов и истории, кликабельные контакты ([f8b109b](https://github.com/fiscalagent/AppTochite/commit/f8b109bc432307065a604d67821dfbd6f66b8209))
* предупреждение о заполнении хранилища, сжатие фото, онбординг ([9c6e6c1](https://github.com/fiscalagent/AppTochite/commit/9c6e6c14043e794af120212d5eb8a2c3baa9fa7d))
* проверка версии, экран «О программе» и ченджлог ([d4701e2](https://github.com/fiscalagent/AppTochite/commit/d4701e22fd5e14a7f7834345f244417e4e2f77e9))
* страница очистки данных приложения (cleaner.html) ([197f33c](https://github.com/fiscalagent/AppTochite/commit/197f33c8a5bcbdb5c686cf76c825e95a9a5e8a5b))
* счётчики статусов в списке клиентов, текст кнопок фото ([d4e0338](https://github.com/fiscalagent/AppTochite/commit/d4e0338c688d4d99cbceb2a4d961163bde6b82c3))
* улучшение SharpeningForm/Detail, Autocomplete и токены ([f0130ab](https://github.com/fiscalagent/AppTochite/commit/f0130ab905e02df5393a9996dd59dc2e2084e9b0))
* экран бэкапа и восстановления данных ([0861931](https://github.com/fiscalagent/AppTochite/commit/0861931261bf063559d68b39d6c411c10ed527c6))
* экспорт заточек в CSV (совместим с Excel/Google Sheets) ([7ba4542](https://github.com/fiscalagent/AppTochite/commit/7ba4542a107b4116b6ad9f6a3712d5755c57296b))
