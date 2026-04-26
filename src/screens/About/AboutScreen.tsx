import { useNavigate } from 'react-router-dom'
import { useVersionCheck } from '../../hooks/useVersionCheck'
import { CHANGELOG } from '../../data/changelog'
import s from './AboutScreen.module.css'

function isPwa(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

export default function AboutScreen() {
  const navigate = useNavigate()
  const { currentVersion, latestVersion, releaseUrl, hasUpdate, checking, checkNow, lastChecked } = useVersionCheck()

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
        <button className={s.back} onClick={() => navigate(-1)}>←</button>
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
    </div>
  )
}
