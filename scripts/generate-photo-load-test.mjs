#!/usr/bin/env node
/**
 * Генератор нагрузочного бэкапа с фотографиями.
 * 500 заточек × 10 фото (5 «до» + 5 «после») = 5 000 PNG-картинок.
 *
 * Запуск: node scripts/generate-photo-load-test.mjs
 * Результат: photo-load-test-backup.json в корне проекта.
 * Импорт: BK-1 → Восстановить из файла.
 */

import { writeFileSync } from 'fs'
import { deflateSync } from 'zlib'
import { fileURLToPath } from 'url'
import path from 'path'

// ─── PNG-генератор (без внешних зависимостей) ────────────────────────────────

const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const lenBuf    = Buffer.alloc(4)
  const crcBuf    = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0)
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf])
}

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

/**
 * Создаёт PNG 80×80 пикселей с градиентом заданного оттенка.
 * @param {number} hue  — базовый оттенок [0..360]
 * @param {number} seed — псевдослучайный сдвиг для уникальности
 * @returns {string} base64-строка PNG
 */
function generatePNG(hue, seed) {
  const W = 80, H = 80
  const rowLen = 1 + W * 3
  const raw = Buffer.alloc(H * rowLen)

  // HSV → RGB
  function hsv(h, s, v) {
    h = ((h % 360) + 360) % 360
    const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c
    let r = 0, g = 0, b = 0
    if      (h < 60)  { r = c; g = x }
    else if (h < 120) { r = x; g = c }
    else if (h < 180) { g = c; b = x }
    else if (h < 240) { g = x; b = c }
    else if (h < 300) { r = x; b = c }
    else              { r = c; b = x }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
  }

  // Простой LCG для псевдошума без Math.random()
  let lcg = (seed * 1664525 + 1013904223) & 0xffffffff

  for (let y = 0; y < H; y++) {
    raw[y * rowLen] = 0  // filter: None
    for (let x = 0; x < W; x++) {
      lcg = (lcg * 1664525 + 1013904223) & 0xffffffff
      const noise = ((lcg >>> 0) % 30) - 15
      const brightness = 0.4 + (y / H) * 0.5
      const saturation = 0.5 + (x / W) * 0.4
      const [r, g, b] = hsv(hue + noise * 0.5, saturation, brightness)
      const off = y * rowLen + 1 + x * 3
      raw[off]     = r
      raw[off + 1] = g
      raw[off + 2] = b
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8; ihdr[9] = 2  // 8-bit RGB

  const idat = deflateSync(raw, { level: 6 })

  const png = Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
  return png.toString('base64')
}

// ─── Кэш изображений (20 вариантов × 2 типа = 40 PNG) ───────────────────────
// Генерируем заранее, чтобы не тратить время внутри цикла

process.stdout.write('Генерация изображений...')
const HUE_BEFORE = [0, 30, 60, 200, 270]   // красноватые оттенки «до»
const HUE_AFTER  = [120, 150, 180, 210, 90] // зелёные/синие оттенки «после»

const PHOTOS_BEFORE_POOL = Array.from({ length: 25 }, (_, i) =>
  generatePNG(HUE_BEFORE[i % 5], i * 7 + 1)
)
const PHOTOS_AFTER_POOL = Array.from({ length: 25 }, (_, i) =>
  generatePNG(HUE_AFTER[i % 5], i * 7 + 100)
)
console.log(' готово.')

// ─── Справочные данные ───────────────────────────────────────────────────────

const STONE_NAMES = [
  'King KW-65 1000', 'King KW-65 6000',
  'Naniwa Chosera 400', 'Naniwa Chosera 1000', 'Naniwa Chosera 3000', 'Naniwa Chosera 5000',
  'Shapton Glass 1000', 'Shapton Glass 2000', 'Shapton Glass 4000', 'Shapton Glass 8000',
  'Suehiro Cerax 1000', 'Suehiro Cerax 3000',
  'DMT Fine 600', 'DMT Extra Fine 1200',
  'Атома Coarse 360', 'Атома Fine 600',
  'Arkansas Soft 400', 'Arkansas Hard 800',
]

const KNIFE_BRANDS = [
  'Tojiro DP', 'Shun Classic', 'Global G-2', 'Miyabi Birchwood',
  'Wüsthof Classic', 'Zwilling Pro', 'Victorinox Fibrox',
  'Mora Companion', 'Mora Garberg', 'Fallkniven F1',
  'Spyderco Paramilitary 2', 'Spyderco Delica', 'Benchmade Griptilian',
  'Kershaw Blur', 'Кизляр Финка', 'Южный Крест Шершень',
  'Самура Mo-V', 'Civivi Elementum', 'Ganzo G704',
  'Нож без названия', 'Кухонный нож', 'Buck 110',
]

const STEELS = [
  'VG-10', 'AUS-8', 'X50CrMoV15', '12C27', '95Х18',
  '65Х13', 'Х12МФ', 'D2', '154CM', 'CPM-S30V', 'M390',
  undefined, undefined,
]

const CONDITIONS = [
  ['правка'], ['заточка'], ['восстановление'],
  ['заточка', 'правка'], ['восстановление', 'заточка'],
]

const COMMENTS = [
  'Сильно изношено лезвие', 'Клиент просил минимальный угол',
  'Финишная полировка', 'Двусторонняя заточка',
  'Выведение вмятины', 'Нож после падения',
  undefined, undefined,
]

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function rndInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function rndDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString()
}

// ─── Клиенты ─────────────────────────────────────────────────────────────────

const clients = [
  { id: 1, name: 'Я', isSelf: true, createdAt: '2022-01-01T00:00:00.000Z' },
  { id: 2, name: 'Александр Петров',  phone: '+7 900 123-45-67', isSelf: false, createdAt: '2022-03-15T10:00:00.000Z' },
  { id: 3, name: 'Михаил Иванов',     phone: '+7 912 234-56-78', isSelf: false, createdAt: '2022-05-01T10:00:00.000Z' },
  { id: 4, name: 'Сергей Кузнецов',                              isSelf: false, createdAt: '2022-07-20T10:00:00.000Z' },
  { id: 5, name: 'Татьяна Семёнова',  phone: '+7 923 345-67-89', isSelf: false, createdAt: '2023-01-10T10:00:00.000Z' },
  { id: 6, name: 'Ольга Павлова',                                isSelf: false, createdAt: '2023-04-05T10:00:00.000Z' },
  { id: 7, name: 'Андрей Попов',      phone: '+7 934 456-78-90', isSelf: false, createdAt: '2023-08-01T10:00:00.000Z' },
  { id: 8, name: 'Наталья Зайцева',                              isSelf: false, createdAt: '2024-02-14T10:00:00.000Z' },
]

const clientIds = clients.map(c => c.id)
const startDate = new Date('2022-01-01')
const endDate   = new Date('2026-04-27')

// ─── Заточки с фотографиями ───────────────────────────────────────────────────

const TOTAL = 500
process.stdout.write(`Генерация ${TOTAL} заточек с фотографиями`)

const sharpenings = []

for (let i = 0; i < TOTAL; i++) {
  if (i % 50 === 0) process.stdout.write('.')

  const id = i + 1
  const status = Math.random() < 0.15 ? 'accepted' : 'done'
  const receivedAt = rndDate(startDate, endDate)

  // 5 фото «до» — разные картинки из пула
  const photosBefore = Array.from({ length: 5 }, (_, j) =>
    PHOTOS_BEFORE_POOL[(i * 5 + j) % PHOTOS_BEFORE_POOL.length]
  )

  // 5 фото «после» — только для завершённых заточек
  const photosAfter = status === 'done'
    ? Array.from({ length: 5 }, (_, j) =>
        PHOTOS_AFTER_POOL[(i * 5 + j) % PHOTOS_AFTER_POOL.length]
      )
    : []

  const entry = {
    id,
    clientId: rnd(clientIds),
    knifeBrand: rnd(KNIFE_BRANDS),
    status,
    receivedAt,
    stones: (() => {
      const count = rndInt(1, 3)
      const pool = [...STONE_NAMES].sort(() => Math.random() - 0.5)
      return pool.slice(0, count).map((name, idx) => ({ name, order: idx + 1 }))
    })(),
    angle: rnd([10, 12, 15, 17, 20, 22, undefined]),
    price: rnd([400, 500, 600, 800, 1000, 1200, 1500, 2000, undefined]),
    photosBefore,
    photosAfter,
  }

  const steel = rnd(STEELS)
  if (steel) entry.steel = steel

  const hrc = rnd([58, 60, 61, 62, 63, 65, undefined, undefined])
  if (hrc) entry.hrc = hrc

  entry.condition = rnd(CONDITIONS)

  const comment = rnd(COMMENTS)
  if (comment) entry.comment = comment

  if (status === 'done') {
    const received = new Date(receivedAt)
    const offset = rndInt(1, 10) * 24 * 60 * 60 * 1000
    entry.doneAt = new Date(Math.min(received.getTime() + offset, endDate.getTime())).toISOString()
  }

  sharpenings.push(entry)
}

console.log(' готово.')

// ─── Сборка и запись ──────────────────────────────────────────────────────────

const backup = {
  version: 1,
  exportedAt: new Date().toISOString(),
  data: {
    clients,
    sharpenings,
    stones: [],
    steels: [],
    knives: [],
    meta: [{ key: 'seedVersion', value: 1 }],
  },
}

const json = JSON.stringify(backup)
const sizeMb = (Buffer.byteLength(json, 'utf8') / 1024 / 1024).toFixed(1)

process.stdout.write('Запись файла...')
const outPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'photo-load-test-backup.json'
)
writeFileSync(outPath, json, 'utf8')
console.log(' готово.')

const photoCount = sharpenings.reduce(
  (sum, s) => sum + (s.photosBefore?.length ?? 0) + (s.photosAfter?.length ?? 0), 0
)
const singlePhotoKb = (Buffer.from(PHOTOS_BEFORE_POOL[0], 'base64').length / 1024).toFixed(1)

console.log(`
─────────────────────────────────────
  Заточек:     ${TOTAL}
  Фотографий:  ${photoCount.toLocaleString('ru')} (80×80 px PNG, ~${singlePhotoKb} KB каждое)
  Клиентов:    ${clients.length}
  Размер файла: ${sizeMb} МБ
  Путь: ${outPath}
─────────────────────────────────────
Импорт: BK-1 → Восстановить из файла
Телефон: USB / Telegram / Google Drive → открыть из «Файлов»
`)
