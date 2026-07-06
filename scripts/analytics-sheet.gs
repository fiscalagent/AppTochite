// Google Apps Script — приём аналитики AppTochite
// Деплой: Расширения → Apps Script → Вставить → Развернуть → Новое развёртывание
//   Тип: Веб-приложение, Доступ: Все (анонимные)
// Скопировать URL развёртывания → вставить в VITE_ANALYTICS_URL

const SHEET_NAME = 'raw'
const SPREADSHEET_ID = '1WG5fCu0WOg8Vf3RGqDPLFwfUmYd8ScEV3ikAGHLo08o'

// Возвращает "неделя/год" в формате "24/26" (ISO-неделя, двузначный год)
function weekYear(dateStr) {
  const d = new Date(dateStr)
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
  const year = String(date.getUTCFullYear()).slice(2)
  return `${week}/${year}`
}

function doGet(e) {
  try {
    const data = JSON.parse(e.parameter.data)

    // Обобщённые продуктовые события (track) идут с полем event → отдельный лист.
    // Старый sharpening-payload (без event) — прежний путь ниже, лист raw.
    if (data.event) return handleEvent(data)

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID)
    let sheet = ss.getSheetByName(SHEET_NAME)

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME)
      sheet.appendRow([
        'deviceId', 'doneAt',
        'knifeBrand', 'steel', 'hrc', 'angle',
        'stoneName', 'stoneGrit', 'stoneGritUnit', 'stoneGritMk', 'stoneType', 'isFin',
        'weekYear',
      ])
      sheet.setFrozenRows(1)
      // J (stoneGritMk) и M (weekYear) — принудительно текст, чтобы "7/10" не конвертировалось в дату
      sheet.getRange('J:J').setNumberFormat('@')
      sheet.getRange('M:M').setNumberFormat('@')
    }

    const { deviceId, doneAt, knife, stones } = data

    const wy = weekYear(doneAt)

    if (!stones || stones.length === 0) {
      const nextRow = sheet.getLastRow() + 1
      sheet.getRange(nextRow, 10).setNumberFormat('@')
      sheet.getRange(nextRow, 13).setNumberFormat('@')
      sheet.getRange(nextRow, 1, 1, 13).setValues([[
        deviceId, doneAt, knife.brand, knife.steel, knife.hrc, knife.angle,
        null, null, null, null, null, null, wy,
      ]])
    } else {
      for (const stone of stones) {
        const nextRow = sheet.getLastRow() + 1
        // Форматируем J (stoneGritMk) и M (weekYear) как текст ДО записи
        sheet.getRange(nextRow, 10).setNumberFormat('@')
        sheet.getRange(nextRow, 13).setNumberFormat('@')
        sheet.getRange(nextRow, 1, 1, 13).setValues([[
          deviceId, doneAt,
          knife.brand, knife.steel, knife.hrc, knife.angle,
          stone.name, stone.grit, stone.gritUnit, stone.gritMk, stone.type, stone.isFin,
          wy,
        ]])
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON)
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON)
  }
}

// Обобщённые продуктовые события (track) → лист "events".
const EVENTS_SHEET = 'events'
const EVENT_KNOWN_KEYS = ['event', 'deviceId', 'sessionId', 'ts', 'displayMode', 'appVersion', 'online', 'lang', 'ua', 'referrer', 'src']

function handleEvent(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID)
    let sheet = ss.getSheetByName(EVENTS_SHEET)
    if (!sheet) {
      sheet = ss.insertSheet(EVENTS_SHEET)
      sheet.appendRow([
        'ts', 'deviceId', 'sessionId', 'event',
        'displayMode', 'appVersion', 'online', 'lang', 'ua', 'referrer', 'src',
        'props', 'weekYear',
      ])
      sheet.setFrozenRows(1)
      sheet.getRange('M:M').setNumberFormat('@') // weekYear как текст
    }

    // Всё, что не известная колонка, складываем в props (JSON).
    const props = {}
    for (const k in data) {
      if (EVENT_KNOWN_KEYS.indexOf(k) === -1) props[k] = data[k]
    }

    const wy = data.ts ? weekYear(data.ts) : ''
    const nextRow = sheet.getLastRow() + 1
    sheet.getRange(nextRow, 13).setNumberFormat('@')
    sheet.getRange(nextRow, 1, 1, 13).setValues([[
      data.ts || '', data.deviceId || '', data.sessionId || '', data.event || '',
      data.displayMode || '', data.appVersion || '', data.online, data.lang || '',
      data.ua || '', data.referrer || '', data.src || '',
      Object.keys(props).length ? JSON.stringify(props) : '', wy,
    ]])

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON)
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON)
  }
}

// ── Баг-репорты (event: 'bug_report') — POST text/plain от приложения ──────
// Кнопка «Сообщить об ошибке» на экране «О программе» шлёт POST'ом JSON.
// Репорт ложится строкой на лист BugReports; пересылка в Telegram спит, пока
// в Script Properties не заданы TG_BOT_TOKEN и TG_CHAT_ID (см. docs/bug-report-telegram.md).

const BUGS_SHEET = 'BugReports'

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)
    if (data.event === 'bug_report') {
      appendBugRow(data)
      sendToTelegram(data)
    }
  } catch (err) {
    // Клиент шлёт в no-cors и ответа не видит — ошибки пишем на лист Errors
    logError_(err, e)
  }
  return ContentService.createTextOutput('ok')
}

function appendBugRow(d) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID)
  let sheet = ss.getSheetByName(BUGS_SHEET)
  if (!sheet) {
    sheet = ss.insertSheet(BUGS_SHEET)
    sheet.appendRow([
      'ts', 'deviceId', 'platform', 'displayMode', 'appVersion',
      'contact', 'text', 'ua', 'lang', 'online',
      'storageUsedMb', 'storageQuotaMb', 'storagePersisted',
      'clientsCount', 'sharpeningsCount', 'lastBackupAt',
      'cloudConnected', 'cloudAutoBackup',
    ])
    sheet.setFrozenRows(1)
  }
  sheet.appendRow([
    d.ts, d.deviceId, d.platform, d.displayMode, d.appVersion,
    d.contact, d.text, d.ua, d.lang, d.online,
    d.storageUsedMb, d.storageQuotaMb, d.storagePersisted,
    d.clientsCount, d.sharpeningsCount, d.lastBackupAt,
    d.cloudConnected, d.cloudAutoBackup,
  ])
}

// Заработает сама, как только в Script Properties появятся TG_BOT_TOKEN и
// TG_CHAT_ID. Пока их нет — молча выходит (режим «только таблица»).
function sendToTelegram(d) {
  const props = PropertiesService.getScriptProperties()
  const token = props.getProperty('TG_BOT_TOKEN')
  const chatId = props.getProperty('TG_CHAT_ID')
  if (!token || !chatId) return

  const install = d.platform === 'native' ? 'APK'
    : d.displayMode === 'standalone' ? 'PWA' : 'браузер'
  const storage = d.storageUsedMb != null
    ? `${d.storageUsedMb}/${d.storageQuotaMb} МБ, persist: ${d.storagePersisted ? 'да' : 'нет'}`
    : 'н/д'
  const backup = `${d.lastBackupAt ? d.lastBackupAt.slice(0, 10) : 'не делался'}, облако: ${d.cloudConnected ? 'да' : 'нет'}`

  const lines = [
    '🐞 Баг-репорт AppTochite',
    `v${d.appVersion} · ${install} · ${d.lang}`,
    `📱 ${d.ua}`,
    d.contact ? `👤 ${d.contact}` : null,
    `💾 ${storage} · ${d.clientsCount} кл / ${d.sharpeningsCount} зат`,
    `🗂 бэкап: ${backup}`,
    `id: ${d.deviceId}`,
    '',
    d.text,
  ].filter(x => x !== null)

  UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: lines.join('\n') }),
    muteHttpExceptions: true,
  })
}

function logError_(err, e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID)
    const sheet = ss.getSheetByName('Errors') || ss.insertSheet('Errors')
    sheet.appendRow([new Date(), String(err), e && e.postData ? e.postData.contents : ''])
  } catch (ignore) {}
}

// Проверка баг-репорта из редактора Apps Script (по образцу testGet)
function testPost() {
  const mock = {
    postData: {
      contents: JSON.stringify({
        event: 'bug_report',
        ts: new Date().toISOString(),
        deviceId: 'test-device-id',
        platform: 'web',
        displayMode: 'browser',
        appVersion: 'test',
        contact: '@test',
        text: 'тестовый репорт из редактора',
        ua: 'test-ua',
        lang: 'ru',
        online: true,
        storageUsedMb: 12,
        storageQuotaMb: 4096,
        storagePersisted: true,
        clientsCount: 0,
        sharpeningsCount: 0,
        lastBackupAt: null,
        cloudConnected: false,
        cloudAutoBackup: false,
      }),
    },
  }
  const result = doPost(mock)
  Logger.log(result.getContent())
}

// Однократная починка столбца J: исправляет уже записанные даты обратно в "7/10"
// Запустить вручную один раз из редактора Apps Script
function fixGritMkColumn() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME)
  if (!sheet) { Logger.log('Лист не найден'); return }
  const lastRow = sheet.getLastRow()
  if (lastRow < 2) { Logger.log('Нет данных'); return }
  const range = sheet.getRange(2, 10, lastRow - 1, 1)
  range.setNumberFormat('@')
  const values = range.getValues()
  const fixed = values.map(([v]) => {
    if (v instanceof Date) {
      // Sheets превратил "7/10" → дату: восстанавливаем день/месяц
      return [`${v.getDate()}/${v.getMonth() + 1}`]
    }
    return [v === '' ? null : v]
  })
  range.setValues(fixed)
  Logger.log(`Обработано строк: ${fixed.length}`)
}

// Заполняет столбец M (weekYear) по существующим строкам из столбца B (doneAt)
// Запустить вручную один раз из редактора Apps Script
function fillWeekYearColumn() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME)
  if (!sheet) { Logger.log('Лист не найден'); return }
  const lastRow = sheet.getLastRow()
  if (lastRow < 2) { Logger.log('Нет данных'); return }
  const doneAtValues = sheet.getRange(2, 2, lastRow - 1, 1).getValues()
  const range = sheet.getRange(2, 13, lastRow - 1, 1)
  range.setNumberFormat('@')
  const filled = doneAtValues.map(([v]) => {
    if (!v) return [null]
    return [weekYear(v instanceof Date ? v.toISOString() : v)]
  })
  range.setValues(filled)
  Logger.log(`Заполнено строк: ${filled.length}`)
}

function testGet() {
  const mock = {
    parameter: {
      data: JSON.stringify({
        deviceId: 'test-device-id',
        doneAt: new Date().toISOString(),
        knife: { brand: 'Victorinox', steel: 'X50CrMoV15', hrc: 56, angle: 15 },
        stones: [
          { name: 'Naniwa Professional 1000', grit: 1000, gritUnit: 'jis', gritMk: null, type: 'ao', isFin: false },
          { name: 'Shapton Glass 2000', grit: 2000, gritUnit: 'jis', gritMk: null, type: 'ao', isFin: true },
        ],
      }),
    },
  }
  const result = doGet(mock)
  Logger.log(result.getContent())
}
