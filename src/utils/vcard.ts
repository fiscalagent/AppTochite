import type { Client } from '../db/db'

// vCard 3.0 для QR-кода на визитке — сканирование сохраняет контакт в телефонную
// книгу напрямую, без сервера и без хостинга карточки где-либо. Всегда строится по
// self-клиенту («Я») — только у него заполняются company/specialization.

// Экранирование спецсимволов по RFC 6350: запятая, точка с запятой, обратный слэш,
// перевод строки.
function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n')
}

export function buildVCard(client: Client): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${escapeVCard(client.name)}`]

  if (client.company) lines.push(`ORG:${escapeVCard(client.company)}`)
  if (client.phone) lines.push(`TEL;TYPE=CELL:${escapeVCard(client.phone)}`)

  const noteParts: string[] = []
  if (client.specialization) noteParts.push(client.specialization)
  if (client.telegram) noteParts.push(`Telegram: ${client.telegram.replace(/^@/, '')}`)
  if (noteParts.length) lines.push(`NOTE:${escapeVCard(noteParts.join(' · '))}`)

  lines.push('END:VCARD')
  return lines.join('\n')
}
