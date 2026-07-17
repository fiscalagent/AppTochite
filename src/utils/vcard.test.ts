import { describe, it, expect } from 'vitest'
import type { Client } from '../db/db'
import { buildVCard } from './vcard'

const client = (overrides: Partial<Client> = {}): Client => ({
  name: 'Иван Петров',
  isSelf: true,
  createdAt: new Date(),
  ...overrides,
})

describe('buildVCard', () => {
  it('строит минимальную vCard только с именем', () => {
    const vcard = buildVCard(client({ phone: undefined, telegram: undefined }))
    expect(vcard).toContain('BEGIN:VCARD')
    expect(vcard).toContain('VERSION:3.0')
    expect(vcard).toContain('FN:Иван Петров')
    expect(vcard).toContain('END:VCARD')
    expect(vcard).not.toContain('TEL')
    expect(vcard).not.toContain('ORG')
    expect(vcard).not.toContain('NOTE')
  })

  it('добавляет телефон и компанию', () => {
    const vcard = buildVCard(client({ phone: '+79001234567', company: 'ОстрыйНож' }))
    expect(vcard).toContain('TEL;TYPE=CELL:+79001234567')
    expect(vcard).toContain('ORG:ОстрыйНож')
  })

  it('склеивает специализацию и telegram в NOTE, убирая @', () => {
    const vcard = buildVCard(client({ specialization: 'Заточка ножей', telegram: '@sharpener' }))
    expect(vcard).toContain('NOTE:Заточка ножей · Telegram: sharpener')
  })

  it('экранирует запятые, точки с запятой и переносы строк', () => {
    const vcard = buildVCard(client({ company: 'Иванов; Компания, Заточка\nножей' }))
    expect(vcard).toContain('ORG:Иванов\\; Компания\\, Заточка\\nножей')
  })
})
