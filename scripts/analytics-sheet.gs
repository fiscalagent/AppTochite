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
