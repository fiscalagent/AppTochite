import { useCallback, useRef, useState } from 'react'
import { useVoiceInput, type VoiceErrorCode } from './useVoiceInput'
import { findAllMatches } from '../utils/voiceMatch'

type VoiceState =
  | { kind: 'idle' }
  | { kind: 'listening'; field: string }
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

// Single-phase voice flow with a tappable picker on ambiguous matches:
//   speak → 0 matches  → fallback to raw text (if onNoMatch) / show "manual" hint
//          → 1 match   → auto-select
//          → multiple  → show list, user taps to pick (or taps mic again to retry)
// The name "twoPhase" is historical: phase 2 (auto-listen for ordinal) was
// removed because it surprised users and stole their tap window.
export function useTwoPhaseVoice(): UseTwoPhaseVoiceReturn {
  const voice = useVoiceInput()
  const [state, setState] = useState<VoiceState>({ kind: 'idle' })
  // Increments on every cancel/new-start. Pending callbacks bail if their session
  // id no longer matches — protects against late onresult firing after cancel.
  const sessionRef = useRef(0)

  const cancel = useCallback(() => {
    sessionRef.current++
    voice.stop()
    setState({ kind: 'idle' })
  }, [voice])

  const start = useCallback(({ field, suggestions, onSelect, onNoMatch, onError }: StartArgs) => {
    sessionRef.current++
    const session = sessionRef.current

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

  const pickItems = useCallback((field: string) =>
    state.kind === 'pick' && state.field === field ? state.items : null,
  [state])

  const noMatchOn = useCallback((field: string) =>
    state.kind === 'noMatch' && state.field === field,
  [state])

  return { isAvailable: voice.isAvailable, state, isListeningOn, pickItems, noMatchOn, start, cancel }
}
