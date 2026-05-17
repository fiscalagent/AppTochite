import { useCallback, useRef, useState } from 'react'
import { useVoiceInput, type VoiceErrorCode } from './useVoiceInput'
import { findAllMatches, pickFromFiltered } from '../utils/voiceMatch'

type VoiceState =
  | { kind: 'idle' }
  // `items` present → we're refining within an existing picker (phase 2).
  // Absent → fresh search against the full dictionary (phase 1).
  | { kind: 'listening'; field: string; items?: string[] }
  | { kind: 'pick'; field: string; items: string[] }
  | { kind: 'noMatch'; field: string }

interface StartArgs {
  field: string
  suggestions: string[]
  onSelect: (item: string) => void
  // Called when nothing matched the dictionary — caller decides whether to
  // accept raw voice text (knife/steel: yes; client: no, since it's a select).
  onNoMatch?: (rawText: string) => void
  onError?: (code: VoiceErrorCode) => void
}

interface UseTwoPhaseVoiceReturn {
  isAvailable: boolean
  state: VoiceState
  isListeningOn: (field: string) => boolean
  pickItems: (field: string) => string[] | null
  noMatchOn: (field: string) => boolean
  start: (args: StartArgs) => void
  cancel: () => void
}

// Voice flow with tappable picker on ambiguous matches:
//   Tap mic, speak:
//     0 matches → fallback to raw text (if onNoMatch) / show "manual" hint
//     1 match   → auto-select
//     multiple  → show list, then auto-open mic again after AUTO_REFINE_DELAY_MS
//                 so the user can either tap a result OR just say a narrower
//                 token ("восемь" → AUS-8, "первый" → first row, …).
//   While refine is listening:
//     - tap on a list row cancels mic and selects
//     - speak a narrower token → pickFromFiltered → onSelect
//     - say nothing / unrecognized → list stays put for retry/tap
// Delay between phase 1 result and auto-started refine listening. Gives the
// user a moment to see the list before the mic re-opens. Tap still works
// during this window and during refine listening itself.
const AUTO_REFINE_DELAY_MS = 700

export function useTwoPhaseVoice(): UseTwoPhaseVoiceReturn {
  const voice = useVoiceInput()
  const [state, setState] = useState<VoiceState>({ kind: 'idle' })
  // Increments on every cancel/new-start. Pending callbacks bail if their session
  // id no longer matches — protects against late onresult firing after cancel.
  const sessionRef = useRef(0)
  // Snapshot of state at start() time, so callbacks can read it without stale-closure issues.
  const stateRef = useRef<VoiceState>(state)
  stateRef.current = state
  const autoRefineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearAutoRefine = () => {
    if (autoRefineTimerRef.current !== null) {
      clearTimeout(autoRefineTimerRef.current)
      autoRefineTimerRef.current = null
    }
  }

  const cancel = useCallback(() => {
    clearAutoRefine()
    sessionRef.current++
    voice.stop()
    setState({ kind: 'idle' })
  }, [voice])

  const startRefine = useCallback((
    field: string,
    items: string[],
    onSelect: (item: string) => void,
    onError?: (code: VoiceErrorCode) => void,
  ) => {
    clearAutoRefine()
    sessionRef.current++
    const session = sessionRef.current
    setState({ kind: 'listening', field, items })
    voice.start({
      onResult: (text) => {
        if (session !== sessionRef.current) return
        const picked = pickFromFiltered(text, items)
        if (picked) {
          onSelect(picked)
          setState({ kind: 'idle' })
        } else {
          setState({ kind: 'pick', field, items })
        }
      },
      onError: (code) => {
        if (session !== sessionRef.current) return
        if (code === 'no-speech' || code === 'aborted') {
          setState({ kind: 'pick', field, items })
        } else {
          setState({ kind: 'idle' })
          onError?.(code)
        }
      },
    })
  }, [voice])

  const start = useCallback(({ field, suggestions, onSelect, onNoMatch, onError }: StartArgs) => {
    clearAutoRefine()
    sessionRef.current++
    const session = sessionRef.current

    // Manual second-tap refine: picker is already visible → refine directly.
    const current = stateRef.current
    if (current.kind === 'pick' && current.field === field) {
      startRefine(field, current.items, onSelect, onError)
      return
    }

    setState({ kind: 'listening', field })
    voice.start({
      onResult: (text) => {
        if (session !== sessionRef.current) return
        const matches = findAllMatches(text, suggestions)
        if (matches.length === 0) {
          if (onNoMatch) {
            onNoMatch(text.trim())
            setState({ kind: 'idle' })
          } else {
            setState({ kind: 'noMatch', field })
          }
        } else if (matches.length === 1) {
          onSelect(matches[0])
          setState({ kind: 'idle' })
        } else {
          setState({ kind: 'pick', field, items: matches })
          // Auto-arm refine after a short pause so user can either tap a result
          // or just speak ("восемь" → AUS-8) without a second tap on the mic.
          autoRefineTimerRef.current = setTimeout(() => {
            if (session !== sessionRef.current) return
            startRefine(field, matches, onSelect, onError)
          }, AUTO_REFINE_DELAY_MS)
        }
      },
      onError: (code) => {
        if (session !== sessionRef.current) return
        setState({ kind: 'idle' })
        onError?.(code)
      },
    })
  }, [voice, startRefine])

  const isListeningOn = useCallback((field: string) =>
    state.kind === 'listening' && state.field === field,
  [state])

  const pickItems = useCallback((field: string) => {
    if (state.kind === 'pick' && state.field === field) return state.items
    if (state.kind === 'listening' && state.field === field && state.items) return state.items
    return null
  }, [state])

  const noMatchOn = useCallback((field: string) =>
    state.kind === 'noMatch' && state.field === field,
  [state])

  return { isAvailable: voice.isAvailable, state, isListeningOn, pickItems, noMatchOn, start, cancel }
}
