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
//     multiple  → show list AND immediately keep listening for a refining
//                 token ("восемь" → AUS-8, "первый" → first row, …) for
//                 REFINE_WINDOW_MS. Mic does NOT close between phase 1 and
//                 refine — there's no second tap needed.
//   While refine is listening:
//     - tap on a list row cancels mic and selects
//     - speak a narrower token → pickFromFiltered → onSelect
//     - say nothing / unrecognized within the window → mic stops, list stays
//       visible indefinitely until the user taps or starts over.
// Refine listens for this long after phase 1's list appears. Mic re-opens with
// no perceptible gap and stays hot for this window; if nothing recognizable is
// said it stops on its own and the list stays for tap selection indefinitely.
const REFINE_WINDOW_MS = 1000

export function useTwoPhaseVoice(): UseTwoPhaseVoiceReturn {
  const voice = useVoiceInput()
  const [state, setState] = useState<VoiceState>({ kind: 'idle' })
  // Increments on every cancel/new-start. Pending callbacks bail if their session
  // id no longer matches — protects against late onresult firing after cancel.
  const sessionRef = useRef(0)
  // Snapshot of state at start() time, so callbacks can read it without stale-closure issues.
  const stateRef = useRef<VoiceState>(state)
  stateRef.current = state
  const refineWindowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearRefineTimer = () => {
    if (refineWindowTimerRef.current !== null) {
      clearTimeout(refineWindowTimerRef.current)
      refineWindowTimerRef.current = null
    }
  }

  const cancel = useCallback(() => {
    clearRefineTimer()
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
    clearRefineTimer()
    sessionRef.current++
    const session = sessionRef.current
    setState({ kind: 'listening', field, items })
    voice.start({
      onResult: (text) => {
        if (session !== sessionRef.current) return
        clearRefineTimer()
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
        clearRefineTimer()
        if (code === 'no-speech' || code === 'aborted') {
          setState({ kind: 'pick', field, items })
        } else {
          setState({ kind: 'idle' })
          onError?.(code)
        }
      },
    })
    // Hard cap on the refine window: if nothing matchable is captured, stop
    // the mic but keep the list visible so the user can still tap.
    refineWindowTimerRef.current = setTimeout(() => {
      if (session !== sessionRef.current) return
      refineWindowTimerRef.current = null
      voice.stop()
      setState({ kind: 'pick', field, items })
    }, REFINE_WINDOW_MS)
  }, [voice])

  const start = useCallback(({ field, suggestions, onSelect, onNoMatch, onError }: StartArgs) => {
    clearRefineTimer()
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
