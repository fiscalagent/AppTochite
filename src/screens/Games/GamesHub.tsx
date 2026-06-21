import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n'
import { GAMES } from './registry'
import s from './GamesHub.module.css'

const IconBack = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const IconChevron = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

export default function GamesHub() {
  const navigate = useNavigate()
  const t = useT()

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)} aria-label={t.common.back}>
          <IconBack />
        </button>
        <div className={s.headTexts}>
          <h1 className={s.title}>{t.game.hubTitle}</h1>
          <p className={s.subtitle}>{t.game.hubSubtitle}</p>
        </div>
      </div>

      <ul className={s.list}>
        {GAMES.map(g => (
          <li key={g.id}>
            <button
              className={s.card}
              disabled={!g.ready}
              onClick={() => g.ready && navigate(g.path)}
            >
              <span className={s.cardSpark}>◆</span>
              <span className={s.cardTexts}>
                <span className={s.cardTitle}>{g.title(t)}</span>
                <span className={s.cardSub}>{g.subtitle(t)}</span>
              </span>
              {g.ready ? <IconChevron /> : <span className={s.soon}>{t.game.soon}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
