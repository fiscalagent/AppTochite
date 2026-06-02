import { useCallback, useRef, useState } from 'react'
import { useVoiceInput, type VoiceErrorCode } from './useVoiceInput'
import { findAllMatches, narrowFromFiltered } from '../utils/voiceMatch'
import type { Locale } from '../i18n'

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

// Voice flow with tappable picker that narrows continuously:
//   Tap mic, speak first token (e.g. "grinderman"):
//     0 matches → fallback to raw text (if onNoMatch) / show "manual" hint
//     1 match   → auto-select
//     multiple  → show list and keep mic open for the next token, no gap.
//   Each subsequent recognized phrase narrows the list:
//     "120" → keep grinderman items containing 120; if exactly 1 → auto-select,
//             else show narrowed list and keep listening.
//     "FEPA" → narrow further by substring/fuzzy.
//     "первый" → pick by ordinal from the current list.
//     unrecognized / no narrowing → previous list stays, mic continues until
//     Web Speech's natural no-speech timeout (~5s), then mic stops and list
//     stays for tap selection. Tap on a row works at any moment.
// (no explicit refine timer — we rely on Web Speech's natural no-speech
// timeout, ~5s on Chrome. Each successful refine cycle restarts the mic.)

export function useTwoPhaseVoice(locale: Locale = 'ru'): UseTwoPhaseVoiceReturn {
  const voice = useVoiceInput(locale)
  const [state, setState] = useState<VoiceState>({ kind: 'idle' })
  // Increments on every cancel/new-start. Pending callbacks bail if their session
  // id no longer matches — protects against late onresult firing after cancel.
  const sessionRef = useRef(0)
  // Snapshot of state at start() time, so callbacks can read it without stale-closure issues.
  const stateRef = useRef<VoiceState>(state)
  // паттерн «latest value ref»: держим актуальное значение для колбэков
  // eslint-disable-next-line react-hooks/refs
  stateRef.current = state
  const cancel = useCallback(() => {
    sessionRef.current++
    voice.stop()
    setState({ kind: 'idle' })
  }, [voice])

  // Defined as a ref to allow recursion (each successful narrow restarts refine
  // with the narrowed list). Using a ref dodges useCallback dependency cycles.
  const startRefineRef = useRef<(
    field: string,
    items: string[],
    onSelect: (item: string) => void,
    onError?: (code: VoiceErrorCode) => void,
  ) => void>(() => {})

  // стабильная поверхность вызова с актуальным замыканием
  // eslint-disable-next-line react-hooks/refs
  startRefineRef.current = (field, items, onSelect, onError) => {
    sessionRef.current++
    const session = sessionRef.current
    setState({ kind: 'listening', field, items })
    voice.start({
      onResult: (text) => {
        if (session !== sessionRef.current) return
        const narrowed = narrowFromFiltered(text, items)
        if (narrowed.length === 1) {
          onSelect(narrowed[0])
          setState({ kind: 'idle' })
        } else if (narrowed.length > 1) {
          // Keep narrowing — restart refine on the smaller list. Mic re-opens
          // immediately so consecutive tokens ("grinderman" → "120" → "FEPA")
          // flow as one continuous interaction.
          startRefineRef.current(field, narrowed, onSelect, onError)
        } else {
          // Nothing matched the spoken token. Keep the previous list visible
          // so the user can tap or speak again (mic closes; tap re-opens).
          setState({ kind: 'pick', field, items })
        }
      },
      onError: (code) => {
        if (session !== sessionRef.current) return
        if (code === 'no-speech' || code === 'aborted') {
          // User paused or aborted — leave the list visible for tap selection.
          setState({ kind: 'pick', field, items })
        } else {
          setState({ kind: 'idle' })
          onError?.(code)
        }
      },
    })
  }

  const startRefine = useCallback((
    field: string,
    items: string[],
    onSelect: (item: string) => void,
    onError?: (code: VoiceErrorCode) => void,
  ) => startRefineRef.current(field, items, onSelect, onError), [])

  const start = useCallback(({ field, suggestions, onSelect, onNoMatch, onError }: StartArgs) => {
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
          // Hand off to refine immediately — no gap where the mic is closed.
          // useVoiceInput handles InvalidStateError on rapid re-start via retry.
          startRefine(field, matches, onSelect, onError)
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
