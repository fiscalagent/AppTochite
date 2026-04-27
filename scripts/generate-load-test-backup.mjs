#!/usr/bin/env node
/**
 * Генератор нагрузочного бэкапа — 10 000 заточек.
 * Запуск: node scripts/generate-load-test-backup.mjs
 * Результат: load-test-backup.json в корне проекта.
 * Импортировать через BK-1 (Бэкап → Восстановить из файла).
 */

import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

// ─── Справочные данные (из seed.ts) ──────────────────────────────────────────

const STONE_NAMES = [
  'King KW-65 1000',
  'King KW-65 6000',
  'Naniwa Chosera 400',
  'Naniwa Chosera 800',
  'Naniwa Chosera 1000',
  'Naniwa Chosera 2000',
  'Naniwa Chosera 3000',
  'Naniwa Chosera 5000',
  'Suehiro Cerax 1000',
  'Suehiro Cerax 3000',
  'Shapton Glass 500',
  'Shapton Glass 1000',
  'Shapton Glass 2000',
  'Shapton Glass 4000',
  'Shapton Glass 8000',
  'Shapton Glass 16000',
  'DMT Extra Coarse 220',
  'DMT Coarse 325',
  'DMT Fine 600',
  'DMT Extra Fine 1200',
  'Атома Extra Coarse 140',
  'Атома Coarse 360',
  'Атома Fine 600',
  'Arkansas Soft 400',
  'Arkansas Hard 800',
  'Arkansas Black 1200',
  'Norton India Fine 600',
  'Norton India Medium 300',
]

const KNIFE_BRANDS = [
  'Tojiro DP', 'Shun Classic', 'Global G-2', 'Miyabi Birchwood',
  'Wüsthof Classic', 'Zwilling Pro', 'Henckels Classic', 'Victorinox Fibrox',
  'Mora Companion', 'Mora Garberg', 'Fallkniven F1',
  'Spyderco Paramilitary 2', 'Spyderco Delica', 'Benchmade Griptilian',
  'Benchmade Bugout', 'Kershaw Blur', 'Kershaw Leek',
  'Кизляр Финка', 'Кизляр Волк', 'Южный Крест Шершень',
  'НОКС Сова', 'Самура Mo-V', 'Самура Harakiri',
  'Civivi Elementum', 'Civivi Praxis', 'Ganzo G704',
  'Buck 110', 'Ka-Bar USMC', 'Opinel No.8', 'Opinel No.9',
  'Cold Steel Recon 1', 'Chris Reeve Sebenza',
  'Нож без названия', 'Кухонный нож', 'Нож шеф-повара',
]

const STEELS = [
  'VG-10', 'AUS-8', 'X50CrMoV15', '12C27', '14C28N',
  '95Х18', '65Х13', 'Х12МФ', 'D2', '154CM',
  'CPM-S30V', 'CPM-S35VN', 'M390', 'Elmax',
  '8Cr13MoV', '9Cr18MoV', 'N690', 'Aogami #2',
  'Shirogami #2', 'ZDP-189', undefined, undefined,
]

const CONDITIONS = [
  ['правка'], ['заточка'], ['восстановление'], ['полировка'],
  ['заточка', 'правка'], ['восстановление', 'заточка'],
]

const COMMENTS = [
  'Сильно изношено лезвие',
  'Клиент просил минимальный угол',
  'Финишная полировка на пасте ГОИ',
  'Двусторонняя заточка',
  'Требовалась правка кончика',
  'Выведение вмятины',
  'Нож после падения',
  'Первичная заточка с завода',
  undefined, undefined, undefined,
]

const CLIENT_NAMES = [
  'Александр Петров',
  'Михаил Иванов',
  'Сергей Кузнецов',
  'Дмитрий Соколов',
  'Андрей Попов',
  'Алексей Новиков',
  'Николай Морозов',
  'Владимир Волков',
  'Артём Козлов',
  'Игорь Лебедев',
  'Татьяна Семёнова',
  'Ольга Павлова',
  'Наталья Зайцева',
  'Елена Соловьёва',
  'Марина Фёдорова',
]

const CLIENT_PHONES = [
  '+7 900 123-45-67', '+7 912 234-56-78', '+7 923 345-67-89',
  '+7 934 456-78-90', '+7 945 567-89-01', '+7 956 678-90-12',
  undefined, undefined, undefined, undefined,
]

// ─── Генератор ───────────────────────────────────────────────────────────────

function rnd(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function rndInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function rndDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString()
}

function generateStones() {
  const count = rndInt(1, 3)
  const picked = []
  const pool = [...STONE_NAMES].sort(() => Math.random() - 0.5)
  for (let i = 0; i < count; i++) {
    picked.push({ name: pool[i], order: i + 1 })
  }
  return picked
}

// ─── Клиенты ─────────────────────────────────────────────────────────────────

const clients = [
  { id: 1, name: 'Я', isSelf: true, createdAt: '2022-01-01T00:00:00.000Z' },
  ...CLIENT_NAMES.map((name, i) => ({
    id: i + 2,
    name,
    phone: rnd(CLIENT_PHONES),
    isSelf: false,
    createdAt: rndDate(new Date('2022-01-01'), new Date('2023-06-01')),
  })),
]

const clientIds = clients.map(c => c.id)

// ─── Заточки ─────────────────────────────────────────────────────────────────

const TOTAL = 10_000
const startDate = new Date('2022-01-01')
const endDate   = new Date('2026-04-27')

const sharpenings = Array.from({ length: TOTAL }, (_, i) => {
  const id = i + 1
  const clientId = rnd(clientIds)
  const status = Math.random() < 0.15 ? 'accepted' : 'done'
  const receivedAt = rndDate(startDate, endDate)

  const entry = {
    id,
    clientId,
    knifeBrand: rnd(KNIFE_BRANDS),
    status,
    receivedAt,
    stones: generateStones(),
    angle: rnd([10, 12, 15, 17, 20, 22, 25, undefined]),
    price: rnd([300, 400, 500, 600, 700, 800, 1000, 1200, 1500, 2000, 2500, undefined]),
  }

  const steel = rnd(STEELS)
  if (steel) entry.steel = steel

  const hrc = rnd([55, 57, 58, 60, 61, 62, 63, 65, 67, undefined, undefined])
  if (hrc) entry.hrc = hrc

  const condition = rnd(CONDITIONS)
  if (condition) entry.condition = condition

  const comment = rnd(COMMENTS)
  if (comment) entry.comment = comment

  if (status === 'done') {
    const received = new Date(receivedAt)
    const doneOffset = rndInt(1, 14) * 24 * 60 * 60 * 1000
    const doneDate = new Date(Math.min(received.getTime() + doneOffset, endDate.getTime()))
    entry.doneAt = doneDate.toISOString()
  }

  return entry
})

// ─── Сборка бэкапа ───────────────────────────────────────────────────────────

const backup = {
  version: 1,
  exportedAt: new Date().toISOString(),
  data: {
    clients,
    sharpenings,
    stones: [],   // справочник — приложение восстановит из seed после импорта
    steels: [],
    knives: [],
    meta: [{ key: 'seedVersion', value: 1 }],
  },
}

// ─── Запись файла ─────────────────────────────────────────────────────────────

const outPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'load-test-backup.json'
)

writeFileSync(outPath, JSON.stringify(backup), 'utf8')

const sizeMb = (Buffer.byteLength(JSON.stringify(backup), 'utf8') / 1024 / 1024).toFixed(2)
console.log(`✓ Сгенерировано ${TOTAL.toLocaleString('ru')} заточек, ${clients.length} клиентов`)
console.log(`✓ Файл: ${outPath}`)
console.log(`✓ Размер: ${sizeMb} МБ`)
console.log(`\nИмпорт: BK-1 → Восстановить из файла → выбрать load-test-backup.json`)
console.log(`Телефон: скопируйте файл через USB или мессенджер, откройте из «Файлов»`)
