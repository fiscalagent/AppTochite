import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useVersionCheck } from '../../hooks/useVersionCheck'
import { CHANGELOG } from '../../data/changelog'
import { setAnalyticsEnabled } from '../../services/analytics'
import { db } from '../../db/instance'
import { FEATURES, isVoiceEnabled, setVoiceEnabled } from '../../config/features'
import { useLocale, fmtDateTimeLong, AVAILABLE_LOCALES, type Locale } from '../../i18n'
import s from './AboutScreen.module.css'
import AppLogo from '../../components/AppLogo/AppLogo'
import EasterEgg from '../../components/EasterEgg/EasterEgg'

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
  const { t, locale, setLocale } = useLocale()
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

  // Пасхалка: 7 тапов по номеру версии
  const eggTaps = useRef(0)
  const [showEgg, setShowEgg] = useState(false)

  function tapVersion() {
    eggTaps.current += 1
    if (eggTaps.current >= 7) {
      eggTaps.current = 0
      setShowEgg(true)
    }
  }

  const checkedStr = lastChecked ? fmtDateTimeLong(locale, lastChecked) : null

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)}><IconChevronLeft /></button>
        <span className={s.title}>{t.about.title}</span>
      </div>

      <div className={s.section}>
        <p className={s.sectionTitle}>{t.about.versionSection}</p>
        <div className={s.versionBlock}>
          <div className={s.versionRow}>
            <span className={s.appName}>AppTochite</span>
            <span className={s.versionBadge} onClick={tapVersion}>v{currentVersion}</span>
          </div>
          <p className={s.appDesc}>{t.about.appDesc}</p>
        </div>

        {hasUpdate && latestVersion && (
          <div className={s.updateBanner}>
            <div className={s.updateBannerText}>
              <span className={s.updateTitle}>{t.about.updateAvailable}</span>
              <span className={s.updateVersion}>
                v{currentVersion} → v{latestVersion}
              </span>
            </div>
            <span className={s.updateHint}>
              {isPwa() ? t.about.updateHintPwa : t.about.updateHintBrowser}
            </span>
            {releaseUrl && (
              <a
                href={releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={s.releaseLink}
              >
                {t.about.whatsNewIn(latestVersion)}
              </a>
            )}
          </div>
        )}

        <div className={s.checkRow}>
          <span className={s.checkMeta}>
            {checkedStr ? t.about.checkedAt(checkedStr) : t.about.neverChecked}
          </span>
          <button className={s.checkBtn} onClick={() => checkNow()} disabled={checking}>
            {checking ? t.about.checking : t.about.check}
          </button>
        </div>
      </div>

      <div className={s.divider} />

      <div className={s.section}>
        <p className={s.sectionTitle}>{t.about.settingsSection}</p>
        <div className={s.langRow}>
          <span className={s.langLabel}>{t.about.languageLabel}</span>
          <div className={s.langSwitcher}>
            {(AVAILABLE_LOCALES as readonly Locale[]).map(loc => (
              <button
                key={loc}
                className={`${s.langBtn} ${locale === loc ? s.langBtnActive : ''}`}
                onClick={() => setLocale(loc)}
              >
                {loc.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className={s.linkList}>
          <button
            className={s.linkItem}
            onClick={() => window.open(`/AppTochite/guide${locale === 'en' ? '_en' : ''}.html`, '_blank')}
          >
            <span className={s.linkIcon}>📖</span>
            <span className={s.linkLabel}>{t.about.guide}</span>
            <span className={s.linkArrow}><IconChevronRight /></span>
          </button>
          <button
            className={s.linkItem}
            onClick={() => navigate('/trash')}
          >
            <span className={s.linkIcon}>🗑️</span>
            <span className={s.linkLabel}>{trashCount > 0 ? t.about.trashCount(trashCount) : t.about.trash}</span>
            <span className={s.linkArrow}><IconChevronRight /></span>
          </button>
          <a
            href="https://t.me/AppTochite"
            target="_blank"
            rel="noopener noreferrer"
            className={s.linkItem}
          >
            <span className={s.linkIcon}>✈️</span>
            <span className={s.linkLabel}>{t.about.telegramGroup}</span>
            <span className={s.linkArrow}><IconChevronRight /></span>
          </a>
          <div className={s.toggleItem}>
            <div className={s.toggleLabel}>
              <div className={s.toggleLabelTitle}>{t.about.analyticsTitle}</div>
              <div className={s.toggleLabelDesc}>{t.about.analyticsDesc}</div>
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
                <div className={s.toggleLabelTitle}>{t.about.voiceTitle}</div>
                <div className={s.toggleLabelDesc}>{t.about.voiceDesc}</div>
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
        <p className={s.sectionTitle}>{t.about.whatsNewSection}</p>
        <div className={s.changelog}>
          {CHANGELOG.map((entry) => (
            <div key={entry.version} className={s.changelogEntry}>
              <div className={s.changelogHeader}>
                <span className={s.changelogVersion}>v{entry.version}</span>
                <span className={s.changelogDate}>{entry.date}</span>
              </div>
              <ul className={s.changelogList}>
                {(locale === 'en' && entry.changesEn ? entry.changesEn : entry.changes).map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <AppLogo />

      {showEgg && <EasterEgg onClose={() => setShowEgg(false)} />}
    </div>
  )
}
