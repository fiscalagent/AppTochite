// Русский словарь — ИСТОЧНИК ИСТИНЫ формы. Тип Dict выводится из него
// (см. dict/index.ts), поэтому английский словарь обязан иметь те же ключи —
// пропуск падает на компиляции.
//
// Принцип безопасности (см. план миграции): enum-карты ключуются КАНОНИЧЕСКИМ
// значением из БД, перевод происходит только на отображении. Хранимые данные не
// меняются. Accessor enumLabel тотален — неизвестное значение возвращается как
// есть (raw), поэтому данные не могут «исчезнуть» с экрана.
//
// Для condition и country каноническое значение СОВПАДАЕТ с русской подписью
// (так уже хранится в БД), поэтому русские карты тут — тождественные или пустые,
// а реальная польза появится в английском словаре. Оставлены как явный шов.

import { plural } from '../plural'

export const ru = {
  common: {
    save: 'Сохранить',
    cancel: 'Отмена',
    delete: 'Удалить',
    edit: 'Редактировать',
    add: 'Добавить',
    done: 'Готово',
    back: 'Назад',
  },

  // Нижняя навигация (BottomNav)
  nav: {
    clients: 'Клиенты',
    sharpening: 'Заточка',
    newSharpening: 'Новая заточка',
    history: 'История',
    reference: 'Справочник',
  },

  // enum-карты: канонический ключ из БД → подпись. Формулировки переиспользуют
  // существующие STONE_TYPE_LABELS / COOLANT_LABELS из ReferenceScreen.
  enums: {
    stoneType: {
      galvanic: 'гальваника',
      ao: 'ОА',
      kk: 'КК',
      diamond: 'алмаз',
      elbor: 'эльбор',
      natural: 'природа',
      pritir: 'притир',
      ceramic: 'керамика',
      other: 'другой тип',
    } as Record<string, string>,

    coolant: {
      water: 'вода',
      oil: 'масло',
      both: 'вода+масло',
      dry: 'сухой',
    } as Record<string, string>,

    status: {
      accepted: 'принят',
      done: 'готов',
    } as Record<string, string>,

    // Канонические значения == русские подписи (так хранится в БД) → тождество.
    // В en будет {'заточка':'Sharpening', ...}.
    condition: {
      'заточка': 'заточка',
      'правка РК': 'правка РК',
      'ремонт': 'ремонт',
    } as Record<string, string>,

    // Пусто: каноническое значение страны == русское название, enumLabel вернёт
    // raw. В en тут появится {'Япония':'Japan', ...}.
    country: {} as Record<string, string>,
  },

  // plural-листы. Локаль 'ru' зашита, потому что лист живёт в русском словаре.
  units: {
    sharpenings: (n: number) =>
      plural('ru', n, { one: 'заточка', few: 'заточки', many: 'заточек', other: 'заточек' }),
  },

  // Корзина (TrashScreen)
  trash: {
    title: 'КОРЗИНА',
    hint: 'Удалённые записи хранятся 3 дня, после чего удаляются навсегда.',
    empty: 'Корзина пуста',
    deletedAt: (when: string) => `Удалено ${when}`,
    restore: 'Восстановить',
    purge: 'Удалить навсегда',
    restored: 'Восстановлено',
    purged: 'Удалено навсегда',
    confirmTitle: 'Удалить навсегда?',
    confirmMessage: 'Это действие необратимо. Восстановить будет нельзя.',
    expiring: 'удаляется…',
    hoursLeft: (h: number) => `осталось ${h} ч`,
    daysLeft: (d: number) => `осталось ${d} дн.`,
    groupSharpening: (knife: string) => `Заточка: ${knife}`,
  },

  // Экран «О программе» (AboutScreen). Ченджлог (entry.changes) не переводим — см. план.
  about: {
    title: 'О ПРОГРАММЕ',
    versionSection: 'Версия',
    appDesc: 'Журнал профессионального заточника',
    updateAvailable: 'Доступно обновление',
    updateHintPwa: 'Закройте и откройте приложение для установки',
    updateHintBrowser: 'Нажмите Ctrl+Shift+R для обновления страницы',
    whatsNewIn: (v: string) => `Что нового в v${v} →`,
    checkedAt: (when: string) => `Проверено: ${when}`,
    neverChecked: 'Ещё не проверялось',
    checking: 'Проверка…',
    check: 'Проверить',
    settingsSection: 'Настройки',
    guide: 'Инструкция',
    trash: 'Корзина',
    trashCount: (n: number) => `Корзина (${n})`,
    telegramGroup: 'Группа в Telegram AppTochite',
    analyticsTitle: 'Анонимная статистика',
    analyticsDesc: 'Камни и ножи без личных данных — помогает улучшить справочник',
    voiceTitle: 'Голосовой ввод',
    voiceDesc: 'Заполняйте поля голосом при создании заточки. Требует подключения к сети.',
    whatsNewSection: 'Что нового',
  },

  // Клиенты: список (C-1), карточка (C-2), форма (C-3)
  clients: {
    // C-1 список
    title: 'КЛИЕНТЫ',
    addClient: '+ Клиент',
    searchPlaceholder: 'Поиск по имени, телефону или телеграм',
    notFound: 'Ничего не найдено',
    empty: 'Нет клиентов',
    acceptedCount: (n: number) => `${n} принят`,
    doneCount: (n: number) => `${n} готов`,
    onboarding: {
      title: 'С чего начать',
      selfPrefix: 'Раздел ',
      selfStrong: '«Я»',
      selfSuffix: ' — личный журнал: записывайте заточки своих ножей без клиентов',
      addPrefix: 'Нажмите ',
      addStrong: '«+ Клиент»',
      addSuffix: ', чтобы добавить первого клиента и принять нож в работу',
      backupLink: 'Настройте бэкап',
      backupSuffix: ', чтобы не потерять данные',
    },
    // C-2 карточка
    notFoundClient: 'Клиент не найден',
    edit: 'Изменить',
    movedToTrash: 'Клиент перемещён в корзину',
    phoneCopied: 'Телефон скопирован в буфер',
    noContacts: 'Нет контактов',
    sharpeningsSection: 'Заточки',
    newSharpening: '+ Заточка',
    allKnives: 'Все',
    noSharpenings: 'Заточек пока нет',
    deleteClient: 'Удалить клиента',
    deleteTitle: (name: string) => `Удалить клиента «${name}»?`,
    deleteMessage: 'Клиент и его заточки попадут в корзину и будут удалены навсегда через 3 дня.',
    // C-3 форма
    editTitle: 'РЕДАКТИРОВАТЬ',
    newTitle: 'НОВЫЙ КЛИЕНТ',
    changePhoto: 'Изменить фото',
    addPhoto: 'Добавить фото',
    removePhoto: 'Убрать фото',
    nameLabel: 'Имя',
    namePlaceholder: 'Иван Петров',
    phoneLabel: 'Телефон',
    phonePlaceholder: '+7 900 000-00-00',
    telegramLabel: 'Telegram',
    telegramPlaceholder: '@username',
    addClientBtn: 'Добавить клиента',
  },

  // Лента заточек (H-1)
  history: {
    title: 'ИСТОРИЯ',
    searchPlaceholder: 'Поиск по ножу, клиенту, стали, комментарию...',
    filters: { all: 'Все', accepted: 'Принят', done: 'Готов' } as Record<string, string>,
    notFound: 'Ничего не найдено',
    empty: 'Заточек пока нет',
    loadMore: (n: number, rest: number) => `Ещё ${n} из ${rest}`,
  },

  // Приёмка (Z-1). Диктовочные тосты и fieldLabel — отдельно, в голосовой фазе.
  sharpening: {
    editTitle: 'РЕДАКТИРОВАТЬ',
    newTitle: 'НОВАЯ ЗАТОЧКА',
    clientLabel: 'Клиент',
    selectClient: 'Выбрать клиента',
    knifeLabel: 'Нож / Бренд',
    knifeDictation: 'нож ...',
    knifePlaceholder: 'Mora, Victorinox, самодел...',
    steelLabel: 'Сталь',
    steelDictation: 'сталь ...',
    steelPlaceholder: 'AUS-8, D2...',
    hardnessDictation: 'твёрдость ...',
    hardnessPlaceholder: '58',
    receivedDateLabel: 'Дата приёмки',
    conditionLabel: 'Требуется',
    priceLabel: 'Цена, ₽',
    priceDictation: 'цена ...',
    pricePlaceholder: '500',
    photoBefore: 'Фото «До»',
    photoOptional: ' (необязательно)',
    photoCount: (n: number, limit: number) => ` · ${n} / ${limit}`,
    photoLimit: 'Лимит 5 фото достигнут',
    addPhoto: 'Добавить фото',
    saving: 'Сохранение…',
    accept: 'Принять в заточку',
  },
} as const
