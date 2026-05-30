import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useVersionCheck } from '../../hooks/useVersionCheck'
import { CHANGELOG } from '../../data/changelog'
import { setAnalyticsEnabled } from '../../services/analytics'
import { db } from '../../db/instance'
import { FEATURES, isVoiceEnabled, setVoiceEnabled } from '../../config/features'
import s from './AboutScreen.module.css'
import AppLogo from '../../components/AppLogo/AppLogo'

const IconChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)


function isPwa(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

export default function AboutScreen() {
  const navigate = useNavigate()
  const { currentVersion, latestVersion, releaseUrl, hasUpdate, checking, checkNow, lastChecked } = useVersionCheck()

  const analyticsOptOut = useLiveQuery(() => db.settings.get('analyticsOptOut'), [])
  const analyticsOn = !analyticsOptOut?.value

  const trashCount = useLiveQuery(async () => {
    const [c, s] = await Promise.all([
      db.clients.where('deletedAt').above(new Date(0)).count(),
      db.sharpenings.where('deletedAt').above(new Date(0)).count(),
    ])
    return c + s
  }, []) ?? 0

  const [voiceOn, setVoiceOn] = useState(() => isVoiceEnabled())

  function handleVoiceToggle(enabled: boolean) {
    setVoiceEnabled(enabled)
    setVoiceOn(enabled)
  }

  const checkedStr = lastChecked
    ? new Date(lastChecked).toLocaleString('ru', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)}><IconChevronLeft /></button>
        <span className={s.title}>О ПРОГРАММЕ</span>
      </div>

      <div className={s.section}>
        <p className={s.sectionTitle}>Версия</p>
        <div className={s.versionBlock}>
          <div className={s.versionRow}>
            <span className={s.appName}>AppTochite</span>
            <span className={s.versionBadge}>v{currentVersion}</span>
          </div>
          <p className={s.appDesc}>Журнал профессионального заточника</p>
        </div>

        {hasUpdate && latestVersion && (
          <div className={s.updateBanner}>
            <div className={s.updateBannerText}>
              <span className={s.updateTitle}>Доступно обновление</span>
              <span className={s.updateVersion}>
                v{currentVersion} → v{latestVersion}
              </span>
            </div>
            <span className={s.updateHint}>
              {isPwa()
                ? 'Закройте и откройте приложение для установки'
                : 'Нажмите Ctrl+Shift+R для обновления страницы'}
            </span>
            {releaseUrl && (
              <a
                href={releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={s.releaseLink}
              >
                Что нового в v{latestVersion} →
              </a>
            )}
          </div>
        )}

        <div className={s.checkRow}>
          <span className={s.checkMeta}>
            {checkedStr ? `Проверено: ${checkedStr}` : 'Ещё не проверялось'}
          </span>
          <button className={s.checkBtn} onClick={() => checkNow()} disabled={checking}>
            {checking ? 'Проверка…' : 'Проверить'}
          </button>
        </div>
      </div>

      <div className={s.divider} />

      <div className={s.section}>
        <p className={s.sectionTitle}>Настройки</p>
        <div className={s.linkList}>
          <button
            className={s.linkItem}
            onClick={() => window.open('/AppTochite/guide.html', '_blank')}
          >
            <span className={s.linkIcon}>📖</span>
            <span className={s.linkLabel}>Инструкция</span>
            <span className={s.linkArrow}><IconChevronRight /></span>
          </button>
          <button
            className={s.linkItem}
            onClick={() => navigate('/trash')}
          >
            <span className={s.linkIcon}>🗑️</span>
            <span className={s.linkLabel}>Корзина{trashCount > 0 ? ` (${trashCount})` : ''}</span>
            <span className={s.linkArrow}><IconChevronRight /></span>
          </button>
          <a
            href="https://t.me/AppTochite"
            target="_blank"
            rel="noopener noreferrer"
            className={s.linkItem}
          >
            <span className={s.linkIcon}>✈️</span>
            <span className={s.linkLabel}>Группа в Telegram AppTochite</span>
            <span className={s.linkArrow}><IconChevronRight /></span>
          </a>
          <div className={s.toggleItem}>
            <div className={s.toggleLabel}>
              <div className={s.toggleLabelTitle}>Анонимная статистика</div>
              <div className={s.toggleLabelDesc}>Камни и ножи без личных данных — помогает улучшить справочник</div>
            </div>
            <label className={s.toggle}>
              <input
                type="checkbox"
                checked={analyticsOn}
                onChange={e => setAnalyticsEnabled(e.target.checked)}
              />
              <span className={s.toggleSlider} />
            </label>
          </div>
          {FEATURES.voiceInput && (
            <div className={s.toggleItem}>
              <div className={s.toggleLabel}>
                <div className={s.toggleLabelTitle}>Голосовой ввод <span className={s.betaBadge}>бета</span></div>
                <div className={s.toggleLabelDesc}>Заполняйте поля голосом при создании заточки. Требует подключения к сети.</div>
              </div>
              <label className={s.toggle}>
                <input
                  type="checkbox"
                  checked={voiceOn}
                  onChange={e => handleVoiceToggle(e.target.checked)}
                />
                <span className={s.toggleSlider} />
              </label>
            </div>
          )}
        </div>
      </div>

      <div className={s.divider} />

      <div className={s.section}>
        <p className={s.sectionTitle}>Что нового</p>
        <div className={s.changelog}>
          {CHANGELOG.map((entry) => (
            <div key={entry.version} className={s.changelogEntry}>
              <div className={s.changelogHeader}>
                <span className={s.changelogVersion}>v{entry.version}</span>
                <span className={s.changelogDate}>{entry.date}</span>
              </div>
              <ul className={s.changelogList}>
                {entry.changes.map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <AppLogo />
    </div>
  )
}
