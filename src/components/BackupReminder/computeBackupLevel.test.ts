import { describe, it, expect } from 'vitest'
import { computeBackupLevel } from './computeBackupLevel'

const NOW = new Date('2026-05-30T12:00:00Z')
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000)

describe('computeBackupLevel', () => {
  it('возвращает null, если нет ни lastBackupAt, ни firstLaunchAt', () => {
    expect(computeBackupLevel({
      lastBackupAt: null, firstLaunchAt: null,
      newRecords: 100, liveSharpenings: 100, now: NOW,
    })).toBe(null)
  })

  it('возвращает null, пока прошло <7 дней', () => {
    expect(computeBackupLevel({
      lastBackupAt: daysAgo(6), firstLaunchAt: null,
      newRecords: 100, liveSharpenings: 100, now: NOW,
    })).toBe(null)
  })

  it('info на 7 днях и <10 новых записей', () => {
    expect(computeBackupLevel({
      lastBackupAt: daysAgo(7), firstLaunchAt: null,
      newRecords: 9, liveSharpenings: 100, now: NOW,
    })).toBe('info')
  })

  it('warn при 10 новых записях даже на 7 днях', () => {
    expect(computeBackupLevel({
      lastBackupAt: daysAgo(7), firstLaunchAt: null,
      newRecords: 10, liveSharpenings: 0, now: NOW,
    })).toBe('warn')
  })

  it('warn на 14 днях независимо от числа записей', () => {
    expect(computeBackupLevel({
      lastBackupAt: daysAgo(14), firstLaunchAt: null,
      newRecords: 0, liveSharpenings: 0, now: NOW,
    })).toBe('warn')
  })

  it('critical на 30 днях при ≥5 живых заточках', () => {
    expect(computeBackupLevel({
      lastBackupAt: daysAgo(30), firstLaunchAt: null,
      newRecords: 0, liveSharpenings: 5, now: NOW,
    })).toBe('critical')
  })

  it('на 30 днях при <5 заточек остаётся warn', () => {
    expect(computeBackupLevel({
      lastBackupAt: daysAgo(30), firstLaunchAt: null,
      newRecords: 0, liveSharpenings: 4, now: NOW,
    })).toBe('warn')
  })

  it('использует firstLaunchAt, если lastBackupAt отсутствует', () => {
    expect(computeBackupLevel({
      lastBackupAt: null, firstLaunchAt: daysAgo(40),
      newRecords: 20, liveSharpenings: 10, now: NOW,
    })).toBe('critical')
  })

  it('100 дней + 0 заточек = warn (порог critical по заточкам не сработал)', () => {
    expect(computeBackupLevel({
      lastBackupAt: daysAgo(100), firstLaunchAt: null,
      newRecords: 0, liveSharpenings: 0, now: NOW,
    })).toBe('warn')
  })
})
