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
