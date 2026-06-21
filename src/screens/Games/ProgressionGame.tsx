import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Stone } from '../../db/instance'
import { getGritDisplay } from '../../data/gritTable'
import { enumLabel, useT } from '../../i18n'
import { ROUND_SIZE, micronOf, pickRound, isSolved } from './progressionLogic'
import { track } from '../../services/analytics'
import s from './ProgressionGame.module.css'

const RANK_AT = [0, 3, 6, 10] // пороги по рекорду серии → индекс в t.game.ranks
const BEST_KEY = 'game.progression.best' // рекорд хранится в localStorage, вне бэкапа

function loadBest(): number {
  const v = Number(localStorage.getItem(BEST_KEY))
  return Number.isFinite(v) && v > 0 ? v : 0
}

export default function ProgressionGame() {
  const navigate = useNavigate()
  const t = useT()
  // Запуск игры — в events (частота использования тренажёров).
  useEffect(() => { track('game_started', { game: 'progression' }).catch(() => {}) }, [])
  const stones = useLiveQuery(() => db.stones.toArray(), [])

  const pool = useMemo(() => (stones ?? []).filter(st => micronOf(st) != null), [stones])

  const [items, setItems] = useState<Stone[]>([])
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(loadBest)
  const [round, setRound] = useState(1)
  const [pickedRound, setPickedRound] = useState(0)

  const dragIndex = useRef<number | null>(null)
  const overIndex = useRef<number | null>(null)

  // Новый набор на каждый раунд (и на первый — когда справочник прогрузился).
  // Правка состояния во время рендера — официальный паттерн React для пересборки
  // при смене ключа (round), без setState в эффекте.
  if (pool.length >= ROUND_SIZE && pickedRound !== round) {
    setItems(pickRound(pool))
    setPickedRound(round)
  }

  // Рекорд переживает перезагрузку (localStorage, вне бэкапа — как язык интерфейса).
  useEffect(() => {
    localStorage.setItem(BEST_KEY, String(best))
  }, [best])

  const move = (from: number, to: number) => {
    if (from === to || from == null || to == null) return
    setItems(prev => {
      const next = [...prev]
      const [m] = next.splice(from, 1)
      next.splice(to, 0, m)
      return next
    })
  }

  const bump = (i: number, dir: number) => {
    if (checked) return
    const to = i + dir
    if (to < 0 || to >= items.length) return
    move(i, to)
  }

  const check = () => {
    const ok = isSolved(items)
    setCorrect(ok)
    setChecked(true)
    setStreak(prev => {
      const ns = ok ? prev + 1 : 0
      setBest(b => Math.max(b, ns))
      return ns
    })
  }

  const next = () => {
    // Смена round пересоберёт набор в рендер-гарде выше.
    setChecked(false)
    setCorrect(false)
    setRound(r => r + 1)
  }

  const rankIdx = RANK_AT.reduce((acc, at, i) => (best >= at ? i : acc), 0)
  const rank = t.game.ranks[rankIdx] ?? t.game.ranks[0]

  // ─── Drag & Drop (мышь + палец) ───
  const onDrop = () => {
    if (dragIndex.current != null && overIndex.current != null) {
      move(dragIndex.current, overIndex.current)
    }
    dragIndex.current = null
    overIndex.current = null
  }

  if (stones !== undefined && pool.length < ROUND_SIZE) {
    return (
      <div className={s.screen}>
        <Header onBack={() => navigate(-1)} t={t} />
        <p className={s.empty}>{t.game.notEnough}</p>
      </div>
    )
  }

  return (
    <div className={s.screen}>
      <Header onBack={() => navigate(-1)} t={t} />

      <div className={s.stats}>
        <div className={s.stat}><div className={s.statVal}>{round}</div><div className={s.statLabel}>{t.game.round}</div></div>
        <div className={s.stat}><div className={`${s.statVal} ${s.statAccent}`}>{streak}</div><div className={s.statLabel}>{t.game.streak}</div></div>
        <div className={s.stat}><div className={s.statVal}>{best}</div><div className={s.statLabel}>{t.game.best}</div></div>
      </div>

      <div className={s.rankBar}>{rank}</div>
      <div className={s.scaleHint}><span>↑ {t.game.coarse}</span><span>{t.game.fine} ↓</span></div>

      <ul className={s.list}>
        {items.map((st, i) => {
          const prev = i === 0 ? null : items[i - 1]
          const state = checked ? (prev == null || micronOf(prev)! >= micronOf(st)! ? 'ok' : 'bad') : ''
          const grit = getGritDisplay(st, 'native')
          return (
            <li
              key={st.id ?? i}
              className={`${s.card} ${state ? s[state] : ''}`}
              draggable={!checked}
              onDragStart={() => { dragIndex.current = i }}
              onDragEnter={e => { e.preventDefault(); overIndex.current = i }}
              onDragOver={e => e.preventDefault()}
              onDrop={onDrop}
              onTouchStart={() => { dragIndex.current = i }}
              onTouchMove={e => {
                const tt = e.touches[0]
                const el = document.elementFromPoint(tt.clientX, tt.clientY)
                const over = el?.closest(`.${s.card}`) as HTMLElement | null
                if (over?.dataset.i != null) overIndex.current = Number(over.dataset.i)
              }}
              onTouchEnd={onDrop}
              data-i={i}
            >
              <span className={s.pos}>{i + 1}</span>
              <span className={s.grip}>⠿</span>
              <div className={s.main}>
                <div className={s.name}>{st.brand}</div>
                <div className={s.meta}>
                  <span className={s.scaleTag}>{grit.mainValue} {grit.mainUnit}</span>
                  <span className={s.kind}>{enumLabel(t.enums.stoneType, st.type)}</span>
                  {checked && <span className={s.micron}>{micronOf(st)} мкм</span>}
                </div>
              </div>
              {!checked && (
                <div className={s.arrows}>
                  <button className={s.arrow} onClick={() => bump(i, -1)} disabled={i === 0} aria-label={t.game.moveUp}>▲</button>
                  <button className={s.arrow} onClick={() => bump(i, 1)} disabled={i === items.length - 1} aria-label={t.game.moveDown}>▼</button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {checked && (
        <div className={`${s.verdict} ${correct ? s.vOk : s.vBad}`}>
          {correct ? `✓ ${t.game.correct(streak)}` : `✗ ${t.game.wrong}`}
        </div>
      )}

      <button className={s.primary} onClick={checked ? next : check}>
        {checked ? t.game.next : t.game.check}
      </button>
      <p className={s.foot}>{t.game.hint}</p>
    </div>
  )
}

function Header({ onBack, t }: { onBack: () => void; t: ReturnType<typeof useT> }) {
  return (
    <div className={s.header}>
      <button className={s.back} onClick={onBack} aria-label={t.common.back}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <div className={s.headTexts}>
        <h1 className={s.title}>{t.game.title}</h1>
        <p className={s.subtitle}>{t.game.subtitle}</p>
      </div>
    </div>
  )
}
