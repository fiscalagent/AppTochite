// Google Apps Script — приём аналитики AppTochite
// Деплой: Расширения → Apps Script → Вставить → Развернуть → Новое развёртывание
//   Тип: Веб-приложение, Доступ: Все (анонимные)
// Скопировать URL развёртывания → вставить в VITE_ANALYTICS_URL

const SHEET_NAME = 'raw'
const SPREADSHEET_ID = '1WG5fCu0WOg8Vf3RGqDPLFwfUmYd8ScEV3ikAGHLo08o'

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
      ])
      sheet.setFrozenRows(1)
    }

    const { deviceId, doneAt, knife, stones } = data

    if (!stones || stones.length === 0) {
      sheet.appendRow([deviceId, doneAt, knife.brand, knife.steel, knife.hrc, knife.angle, null, null, null, null, null, null])
    } else {
      for (const stone of stones) {
        sheet.appendRow([
          deviceId, doneAt,
          knife.brand, knife.steel, knife.hrc, knife.angle,
          stone.name, stone.grit, stone.gritUnit, stone.gritMk, stone.type, stone.isFin,
        ])
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
