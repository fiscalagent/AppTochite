import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n'
import {
  ANGLE_MIN,
  ANGLE_MAX,
  rndAngle,
  verdictOf,
  isHit,
  rankIndex,
  tiltForRound,
  isTilted,
  contextKey,
} from './angleLogic'
import { track } from '../../services/analytics'
import s from './AngleGame.module.css'

const BEST_KEY = 'game.angle.best' // рекорд серии — в localStorage, вне бэкапа (как язык интерфейса)
const START_GUESS = 22

function loadBest(): number {
  const v = Number(localStorage.getItem(BEST_KEY))
  return Number.isFinite(v) && v > 0 ? v : 0
}

export default function AngleGame() {
  const navigate = useNavigate()
  const t = useT()

  // Запуск игры — в events (частота использования тренажёров).
  useEffect(() => { track('game_started', { game: 'angle' }).catch(() => {}) }, [])

  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(loadBest)
  const [round, setRound] = useState(1)
  const [target, setTarget] = useState(() => rndAngle())
  const [guess, setGuess] = useState(START_GUESS)
  const [answered, setAnswered] = useState(false)
  // Наклон первого раунда — по нулевой серии всегда 0 (хард-режим ещё закрыт).
  const [tilt, setTilt] = useState(() => tiltForRound(0))

  // Рекорд переживает перезагрузку (localStorage, вне бэкапа).
  useEffect(() => {
    localStorage.setItem(BEST_KEY, String(best))
  }, [best])

  const diff = Math.abs(guess - target)
  const tiltOn = isTilted(tilt)
  const rank = t.gameAngle.ranks[rankIndex(best)] ?? t.gameAngle.ranks[0]

  const answer = () => {
    setAnswered(true)
    if (isHit(diff)) {
      setStreak(prev => {
        const ns = prev + 1
        setBest(b => Math.max(b, ns))
        return ns
      })
    } else {
      setStreak(0)
    }
  }

  const next = () => {
    setAnswered(false)
    setGuess(START_GUESS)
    setTarget(rndAngle())
    setTilt(tiltForRound(streak)) // сложность наклона — по достигнутой серии
    setRound(r => r + 1)
  }

  const verdict = verdictOf(diff)
  const verdictText =
    verdict === 'perfect'
      ? t.gameAngle.perfect(diff)
      : verdict === 'ok'
        ? t.gameAngle.ok(diff)
        : t.gameAngle.bad(diff)
  const verdictClass = verdict === 'bad' ? s.vBad : verdict === 'ok' ? s.vOk : s.vPerfect

  return (
    <div className={s.screen}>
      <div className={s.header}>
        <button className={s.back} onClick={() => navigate(-1)} aria-label={t.common.back}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className={s.headTexts}>
          <h1 className={s.title}>{t.gameAngle.title}</h1>
          <p className={s.subtitle}>{t.gameAngle.subtitle}</p>
        </div>
      </div>

      <div className={s.stats}>
        <div className={s.stat}><div className={s.statVal}>{round}</div><div className={s.statLabel}>{t.game.round}</div></div>
        <div className={s.stat}><div className={`${s.statVal} ${s.statAccent}`}>{streak}</div><div className={s.statLabel}>{t.game.streak}</div></div>
        <div className={s.stat}><div className={s.statVal}>{best}</div><div className={s.statLabel}>{t.game.best}</div></div>
      </div>

      <div className={s.rankBar}>
        <span>{rank}</span>
        {tiltOn && <span className={s.tiltBadge}>{t.gameAngle.tiltBadge}</span>}
      </div>

      <div className={s.stage}>
        <Wedge angleSide={target} tilt={tilt} answered={answered} overlay={guess} target={target} />
      </div>

      <div className={s.reading}>
        <div className={`${s.readVal} ${answered ? s.readAnswer : ''}`}>{guess}°</div>
        <div className={s.readSub}>
          {answered ? t.gameAngle.yourAnswer : `${t.gameAngle.perSide} · ${guess * 2}° ${t.gameAngle.full}`}
        </div>
      </div>

      <input
        type="range"
        className={s.slider}
        min={ANGLE_MIN}
        max={ANGLE_MAX}
        step={1}
        value={guess}
        disabled={answered}
        onChange={e => setGuess(Number(e.target.value))}
      />
      <div className={s.rangeLabels}><span>{ANGLE_MIN}°</span><span>{ANGLE_MAX}°</span></div>

      {answered && (
        <div className={`${s.verdict} ${verdictClass}`}>
          {verdictText}
          <span className={s.verdictCtx}>
            {target}° {t.gameAngle.perSide} · {target * 2}° {t.gameAngle.full} — {t.gameAngle.context[contextKey(target)]}
          </span>
        </div>
      )}

      <button className={s.primary} onClick={answered ? next : answer}>
        {answered ? t.gameAngle.next : t.gameAngle.answer}
      </button>

      <p className={s.foot}>
        {tiltOn ? t.gameAngle.footTilt : t.gameAngle.footNormal}
        <br />
        {t.gameAngle.tolHint}
      </p>
    </div>
  )
}

// ─── Клин кромки (вид сбоку), построен математикой из угла ───
function Wedge({ angleSide, tilt, answered, overlay, target }: {
  angleSide: number
  tilt: number
  answered: boolean
  overlay: number
  target: number
}) {
  const t = useT()
  const W = 420, H = 240, cx = 70, cy = H / 2 + 10, L = 320, arcR = 54
  const axis = -tilt // экранный Y растёт вниз → «вверх» = минус
  const rad = (deg: number) => (deg * Math.PI) / 180
  const pt = (r: number, deg: number) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))] as const

  const [x1, y1] = pt(L, axis - angleSide) // верхняя грань
  const [x2, y2] = pt(L, axis + angleSide) // нижняя грань
  const [axX, axY] = pt(L, axis) // ось-биссектриса
  const [arcFromX, arcFromY] = pt(arcR, axis) // дуга: от оси…
  const [arcToX, arcToY] = pt(arcR, axis - angleSide) // …до верхней грани
  const [qx, qy] = pt(arcR * 1.5, axis - angleSide / 2) // метка истинного угла — верхний сектор
  // Ответ игрока — зеркально ВНИЗ от оси, чтобы не накладываться на истинный угол.
  const [ox, oy] = pt(L, axis + overlay) // грань ответа игрока
  const [oArcX, oArcY] = pt(arcR, axis + overlay) // конец дуги ответа
  const [olx, oly] = pt(arcR * 1.5, axis + overlay / 2) // подпись ответа — нижний сектор

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.gameAngle.svgLabel}>
      <defs>
        <linearGradient id="angle-steel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3d44" />
          <stop offset="0.5" stopColor="#d7dadf" />
          <stop offset="1" stopColor="#3a3d44" />
        </linearGradient>
      </defs>
      {/* горизонт-ориентир — всегда горизонтальный, чтобы наклон был виден */}
      <line x1="20" y1={cy} x2="400" y2={cy} stroke="#26272d" strokeWidth="2" strokeDasharray="2 6" />
      {/* ось-биссектриса */}
      <line x1={cx} y1={cy} x2={axX} y2={axY} stroke="#4a4b53" strokeWidth="1" strokeDasharray="6 5" />
      {/* тело клина */}
      <polygon points={`${cx},${cy} ${x1},${y1} ${x2},${y2}`} fill="url(#angle-steel)" stroke="#8b9099" strokeWidth="1.5" />
      {/* дуга угла НА СТОРОНУ: от оси до верхней грани */}
      <path d={`M ${arcFromX} ${arcFromY} A ${arcR} ${arcR} 0 0 0 ${arcToX} ${arcToY}`} fill="none" stroke="var(--accent)" strokeWidth="2" />
      {/* ответ игрока — зеркально вниз от оси (после ответа) */}
      {answered && (
        <>
          <path d={`M ${arcFromX} ${arcFromY} A ${arcR} ${arcR} 0 0 1 ${oArcX} ${oArcY}`} fill="none" stroke="var(--accent-light)" strokeWidth="2" strokeDasharray="3 4" />
          <line x1={cx} y1={cy} x2={ox} y2={oy} stroke="var(--accent-light)" strokeWidth="2.5" strokeDasharray="3 4" />
          <text x={olx} y={oly + 4} fill="var(--accent-light)" fontSize="13" fontWeight="700" textAnchor="middle">{t.gameAngle.yourLabel(overlay)}</text>
        </>
      )}
      {/* метка угла: «?» до ответа, истинный угол после */}
      <text x={qx} y={qy + 5} fill="var(--accent)" fontSize="20" fontWeight="800" textAnchor="middle">
        {answered ? `${target}°` : '?'}
      </text>
    </svg>
  )
}
