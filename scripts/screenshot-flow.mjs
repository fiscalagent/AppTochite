/**
 * Делает скриншоты всех экранов AppTochite и собирает HTML-карту навигации.
 * Запускать: node scripts/screenshot-flow.mjs
 * Dev-сервер должен быть запущен на порту 5174.
 */

import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const BASE = 'http://localhost:5174/AppTochite'
const OUT_DIR = path.resolve('docs/screenshots')
fs.mkdirSync(OUT_DIR, { recursive: true })

const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }

async function seedData(page) {
  // Засеваем данные через IndexedDB напрямую из браузерного контекста
  await page.evaluate(async () => {
    // Ждём инициализации Dexie
    await new Promise(r => setTimeout(r, 1500))

    const req = indexedDB.open('AppTochiteDB')
    await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result)
      req.onerror = reject
    })
    const db = req.result
    const version = db.version
    db.close()

    // Используем Dexie через window (он уже загружен приложением)
    // Ждём пока приложение само инициализирует БД
    await new Promise(r => setTimeout(r, 2000))
  })
}

async function waitForApp(page) {
  // Ждём когда React смонтируется
  await page.waitForSelector('#root > *', { timeout: 8000 }).catch(() => {})
  await new Promise(r => setTimeout(r, 800))
}

async function closeModals(page) {
  // Закрываем онбординг/модалы если появились
  const closeSelectors = [
    '[data-testid="onboarding-close"]',
    'button[aria-label="Закрыть"]',
  ]
  for (const sel of closeSelectors) {
    const el = await page.$(sel)
    if (el) await el.click().catch(() => {})
  }
  // Esc на случай любого оверлея
  await page.keyboard.press('Escape').catch(() => {})
  await new Promise(r => setTimeout(r, 300))
}

async function screenshot(page, name, label) {
  await closeModals(page)
  const file = path.join(OUT_DIR, `${name}.png`)
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 390, height: 844 } })
  console.log(`✓ ${label} → ${name}.png`)
  return file
}

// ─── Маршруты для скриншотов ────────────────────────────────────────────────

const SCREENS = [
  { id: 'c1',  route: '/',                   label: 'C-1 Список клиентов' },
  { id: 'c2',  route: '/clients/1',          label: 'C-2 Карточка клиента «Я»' },
  { id: 'c3n', route: '/clients/new',        label: 'C-3 Новый клиент' },
  { id: 'z1',  route: '/sharpenings/new',    label: 'Z-1 Новая заточка (шаг 1)' },
  { id: 'z2',  route: '/sharpenings/1',      label: 'Z-2 Детальная запись' },
  { id: 'h1',  route: '/history',            label: 'H-1 Лента заточек' },
  { id: 's1',  route: '/reference/stones',   label: 'S-1 Справочник — Камни' },
  { id: 's2',  route: '/reference/steels',   label: 'S-2 Справочник — Стали' },
  { id: 's3',  route: '/reference/knives',   label: 'S-3 Справочник — Ножи' },
  { id: 'bk1', route: '/backup',             label: 'BK-1 Бэкап' },
  { id: 'a1',  route: '/about',              label: 'A-1 О программе' },
]

// ─── Навигационные связи для HTML-диаграммы ─────────────────────────────────

const EDGES = [
  // Bottom Nav
  { from: 'any', to: 'c1',  label: 'Клиенты (nav)' },
  { from: 'any', to: 'z1',  label: '+ FAB (nav)' },
  { from: 'any', to: 'h1',  label: 'История (nav)' },
  { from: 'any', to: 's1',  label: 'Справочник (nav)' },

  // C-1
  { from: 'c1', to: 'c2',  label: 'клик по клиенту' },
  { from: 'c1', to: 'c3n', label: '+ Клиент' },
  { from: 'c1', to: 'bk1', label: 'иконка 💾' },

  // C-2
  { from: 'c2', to: 'c1',  label: '◀ назад' },
  { from: 'c2', to: 'c3n', label: 'Изменить' },
  { from: 'c2', to: 'z1',  label: '+ Заточка' },
  { from: 'c2', to: 'z2',  label: 'строка заточки' },

  // C-3
  { from: 'c3n', to: 'c2', label: 'Сохранить' },

  // Z-1
  { from: 'z1', to: 'z2',  label: 'ПРИНЯТЬ / ЗАТОЧЕНО' },

  // Z-2
  { from: 'z2', to: 'z1',  label: 'Изменить / ЗАТОЧИТЬ' },
  { from: 'z2', to: 'z1',  label: 'Повторить заточку' },
  { from: 'z2', to: 'c2',  label: 'ссылка на клиента' },

  // H-1
  { from: 'h1', to: 'z2',  label: 'строка заточки' },

  // S — внутренние вкладки
  { from: 's1', to: 's2', label: 'таб Стали' },
  { from: 's1', to: 's3', label: 'таб Ножи' },

  // BK-1
  { from: 'bk1', to: 'a1', label: 'О программе' },
]

// ─── Позиции экранов на канвасе HTML ────────────────────────────────────────

const POSITIONS = {
  c1:  { x: 420, y: 40  },
  c2:  { x: 420, y: 380 },
  c3n: { x: 780, y: 380 },
  z1:  { x: 60,  y: 380 },
  z2:  { x: 60,  y: 760 },
  h1:  { x: 780, y: 760 },
  s1:  { x: 1140, y: 40 },
  s2:  { x: 1140, y: 380 },
  s3:  { x: 1140, y: 760 },
  bk1: { x: 420, y: 760 },
  a1:  { x: 420, y: 1140 },
}

const CARD_W = 200
const CARD_H = 355 // 390/844 * 800 = ~370, чуть меньше

// ─── Сборка HTML ─────────────────────────────────────────────────────────────

function buildHtml(screens) {
  const canvasW = 1440
  const canvasH = 1560

  // SVG стрелки
  const svgLines = EDGES.filter(e => e.from !== 'any').map(e => {
    const fp = POSITIONS[e.from]
    const tp = POSITIONS[e.to]
    if (!fp || !tp) return ''
    const x1 = fp.x + CARD_W / 2
    const y1 = fp.y + CARD_H / 2
    const x2 = tp.x + CARD_W / 2
    const y2 = tp.y + CARD_H / 2
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const nx = -dy / len * 18
    const ny = dx / len * 18
    const cx = mx + nx
    const cy = my + ny
    return `
      <path d="M${x1},${y1} Q${cx},${cy} ${x2},${y2}"
            stroke="#4A90D9" stroke-width="2" fill="none"
            marker-end="url(#arrow)" opacity="0.7"/>
      <text x="${cx}" y="${cy - 4}"
            font-size="9" fill="#4A90D9" text-anchor="middle" opacity="0.9">${e.label}</text>`
  }).join('')

  // Bottom Nav стрелки отдельным стилем (пунктир)
  const bottomNavSvg = SCREENS.map(sc => {
    const p = POSITIONS[sc.id]
    if (!p) return ''
    const x = p.x + CARD_W / 2
    const y = p.y
    return `<line x1="${x}" y1="0" x2="${x}" y2="${y}"
                  stroke="#3DB87A" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.3"/>`
  }).join('')

  // Карточки экранов
  const cards = screens.map(({ id, label }) => {
    const p = POSITIONS[id]
    if (!p) return ''
    const imgPath = `screenshots/${id}.png`
    return `
      <div class="screen-card" style="left:${p.x}px;top:${p.y}px">
        <div class="screen-label">${label}</div>
        <img src="${imgPath}" width="${CARD_W}" alt="${label}" />
      </div>`
  }).join('')

  // Bottom Nav
  const navItems = ['C-1 Клиенты\n/', '+ FAB\n/sh/new', 'H-1 История\n/history', 'S-1/2/3 Справочник\n/ref/*']
  const navHtml = navItems.map((item, i) => {
    const [name, path] = item.split('\n')
    return `<div class="nav-item" style="flex:1;text-align:center"><strong>${name}</strong><br><small style="color:#888">${path}</small></div>`
  }).join('<div style="width:1px;background:#333;margin:8px 0"></div>')

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>AppTochite — Карта навигации</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #0f1117; color: #e0e0e0; }

  h1 { padding: 24px 32px 8px; font-size: 22px; color: #fff; }
  .subtitle { padding: 0 32px 16px; color: #888; font-size: 13px; }

  .bottom-nav {
    display: flex;
    align-items: center;
    background: #1a1d27;
    border: 1px solid #2a2d3a;
    border-radius: 16px;
    margin: 0 32px 24px;
    padding: 12px 24px;
    gap: 0;
  }
  .nav-item { font-size: 12px; padding: 0 8px; }

  .canvas-wrap {
    position: relative;
    width: ${canvasW}px;
    min-height: ${canvasH}px;
    margin: 0 32px;
  }

  svg.arrows {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    overflow: visible;
  }

  .screen-card {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .screen-card img {
    border-radius: 20px;
    border: 2px solid #2a2d3a;
    display: block;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    width: ${CARD_W}px;
  }
  .screen-label {
    font-size: 11px;
    color: #aaa;
    text-align: center;
    font-weight: 600;
    letter-spacing: 0.3px;
    white-space: nowrap;
  }

  .legend {
    margin: 32px 32px;
    padding: 16px 20px;
    background: #1a1d27;
    border-radius: 12px;
    border: 1px solid #2a2d3a;
    font-size: 12px;
    color: #888;
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
  }
  .legend-item { display: flex; align-items: center; gap: 8px; }
</style>
</head>
<body>

<h1>AppTochite — Карта навигации</h1>
<p class="subtitle">Версия 1.64.x · все экраны и переходы между ними</p>

<div class="bottom-nav">
  <span style="font-size:11px;color:#666;margin-right:16px;white-space:nowrap">Bottom Nav (всегда)</span>
  ${navHtml}
</div>

<div class="canvas-wrap">
  <svg class="arrows" viewBox="0 0 ${canvasW} ${canvasH}" preserveAspectRatio="none">
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="#4A90D9" opacity="0.8"/>
      </marker>
    </defs>
    ${svgLines}
  </svg>

  ${cards}
</div>

<div style="height:${CARD_H + 80}px"></div>

<div class="legend">
  <div class="legend-item">
    <svg width="32" height="12"><line x1="0" y1="6" x2="28" y2="6" stroke="#4A90D9" stroke-width="2" marker-end="url(#arrow2)"/>
    <defs><marker id="arrow2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4A90D9"/></marker></defs></svg>
    Переход по кнопке
  </div>
  <div class="legend-item">
    <svg width="32" height="12"><line x1="0" y1="6" x2="28" y2="6" stroke="#3DB87A" stroke-width="1.5" stroke-dasharray="4 4"/></svg>
    Bottom Navigation (всегда доступна)
  </div>
  <div style="margin-left:auto;color:#555;font-size:11px">Скриншоты сделаны Puppeteer · ${new Date().toLocaleDateString('ru-RU')}</div>
</div>

</body>
</html>`
}

// ─── Main ────────────────────────────────────────────────────────────────────

;(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  await page.setViewport(VIEWPORT)

  // Первый визит — инициализация БД приложением
  console.log('⏳ Инициализация приложения...')
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 15000 })
  await waitForApp(page)

  // Добавим немного тестовых данных через браузерный контекст
  await page.evaluate(async () => {
    // Ждём пока Dexie проинициализируется (seed запускается сам)
    await new Promise(r => setTimeout(r, 2000))

    // Получаем доступ к БД через открытое соединение
    const openReq = indexedDB.open('AppTochiteDB')
    const db = await new Promise((res, rej) => {
      openReq.onsuccess = () => res(openReq.result)
      openReq.onerror = rej
    })

    // Добавляем клиента
    const addClient = () => new Promise((res, rej) => {
      const tx = db.transaction('clients', 'readwrite')
      const store = tx.objectStore('clients')
      const req = store.add({
        name: 'Иван Петров',
        phone: '+7 916 123-45-67',
        telegram: '@ivan_p',
        isSelf: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      req.onsuccess = () => res(req.result)
      req.onerror = rej
    })

    const clientId = await addClient().catch(() => null)

    // Добавляем заточки
    if (clientId) {
      const addSharpening = (data) => new Promise((res, rej) => {
        const tx = db.transaction('sharpenings', 'readwrite')
        const store = tx.objectStore('sharpenings')
        const req = store.add(data)
        req.onsuccess = () => res(req.result)
        req.onerror = rej
      })

      await addSharpening({
        clientId: Number(clientId),
        knifeBrand: 'Victorinox Fibrox',
        steel: 'X50CrMoV15',
        hrc: 58,
        condition: ['заточка'],
        receivedAt: new Date('2025-03-12'),
        angle: 15,
        stones: [{ name: 'Shapton 1000 JIS', order: 1 }, { name: 'Shapton 3000 JIS', order: 2 }],
        comment: 'Рабочая лошадка, правили несколько раз',
        price: 800,
        status: 'done',
        doneAt: new Date('2025-03-13'),
        updatedAt: new Date(),
      }).catch(() => {})

      await addSharpening({
        clientId: 1, // Я
        knifeBrand: 'Mora Companion',
        steel: '12C27',
        hrc: 59,
        condition: ['заточка', 'правка РК'],
        receivedAt: new Date('2025-04-01'),
        angle: 17,
        stones: [{ name: 'DMT Fine', order: 1 }],
        price: null,
        status: 'accepted',
        updatedAt: new Date(),
      }).catch(() => {})
    }

    db.close()
  })

  await new Promise(r => setTimeout(r, 500))

  // Делаем скриншоты
  const done = []

  for (const { id, route, label } of SCREENS) {
    console.log(`📷 ${label}`)
    try {
      // Для Z-2 нужен реальный ID заточки — берём 1
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2', timeout: 10000 })
      await waitForApp(page)
      await screenshot(page, id, label)
      done.push({ id, label })
    } catch (e) {
      console.error(`  ✗ ошибка: ${e.message}`)
    }
  }

  await browser.close()

  // Собираем HTML
  const html = buildHtml(done)
  fs.writeFileSync(path.join('docs', 'navigation-flow.html'), html, 'utf8')
  console.log('\n✅ Готово! Открой: docs/navigation-flow.html')
})()
