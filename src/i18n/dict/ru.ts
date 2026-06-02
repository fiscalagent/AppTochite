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
} as const
