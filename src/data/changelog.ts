export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.0',
    date: '2026-04-26',
    changes: [
      'Исправления и улучшения',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-04-26',
    changes: [
      'Исправления и улучшения',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-04-26',
    changes: [
      'Первый публичный релиз',
      'Учёт клиентов и заточек с фото «До» и «После»',
      'Статусы заточки: Принят / Готов',
      'Справочники: камни, стали, ножи (более 300 позиций)',
      'Единицы гритности: FEPA / JIS / мкм',
      'Экспорт бэкапа в JSON и CSV',
      'Резервное копирование и восстановление',
    ],
  },
]
