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
//   First tap (idle):
//     speak → 0 matches  → fallback to raw text (if onNoMatch) / show "manual" hint
//            → 1 match   → auto-select
//            → multiple  → show list (state: pick)
//   Second tap while picker is visible: refine mode
//     speak → narrows within the visible list via pickFromFiltered
//             ("8" picks "AUS-8", "первый" picks first item, …)
//     unmatched refine → list stays as-is so user can tap or try again
export function useTwoPhaseVoice(): UseTwoPhaseVoiceReturn {
  const voice = useVoiceInput()
  const [state, setState] = useState<VoiceState>({ kind: 'idle' })
  // Increments on every cancel/new-start. Pending callbacks bail if their session
  // id no longer matches — protects against late onresult firing after cancel.
  const sessionRef = useRef(0)
  // Snapshot of state at start() time, so callbacks can read it without stale-closure issues.
  const stateRef = useRef<VoiceState>(state)
  stateRef.current = state

  const cancel = useCallback(() => {
    sessionRef.current++
    voice.stop()
    setState({ kind: 'idle' })
  }, [voice])

  const start = useCallback(({ field, suggestions, onSelect, onNoMatch, onError }: StartArgs) => {
    sessionRef.current++
    const session = sessionRef.current

    // Detect refine mode: a picker is currently shown for this field.
    const current = stateRef.current
    const refineItems: string[] | null =
      current.kind === 'pick' && current.field === field ? current.items : null

    if (refineItems) {
      setState({ kind: 'listening', field, items: refineItems })
      voice.start({
        onResult: (text) => {
          if (session !== sessionRef.current) return
          const picked = pickFromFiltered(text, refineItems)
          if (picked) {
            onSelect(picked)
            setState({ kind: 'idle' })
          } else {
            // Could not pick — keep the original list visible for tap/retry.
            setState({ kind: 'pick', field, items: refineItems })
          }
        },
        onError: (code) => {
          if (session !== sessionRef.current) return
          // Preserve picker on transient errors (no-speech, aborted).
          if (code === 'no-speech' || code === 'aborted') {
            setState({ kind: 'pick', field, items: refineItems })
          } else {
            setState({ kind: 'idle' })
            onError?.(code)
          }
        },
      })
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
        }
      },
      onError: (code) => {
        if (session !== sessionRef.current) return
        setState({ kind: 'idle' })
        onError?.(code)
      },
    })
  }, [voice])

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
