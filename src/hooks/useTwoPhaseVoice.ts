import { useCallback, useRef, useState } from 'react'
import { useVoiceInput, type VoiceErrorCode } from './useVoiceInput'
import { findAllMatches, pickFromFiltered } from '../utils/voiceMatch'

type VoiceState =
  | { kind: 'idle' }
  | { kind: 'listening'; field: string; phase: 1 | 2 }
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

const PHASE2_DELAY_MS = 500

export function useTwoPhaseVoice(): UseTwoPhaseVoiceReturn {
  const voice = useVoiceInput()
  const [state, setState] = useState<VoiceState>({ kind: 'idle' })
  const phase2TimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Increments on every cancel/new-start. Pending callbacks bail if their session
  // id no longer matches — protects against late onresult firing after cancel.
  const sessionRef = useRef(0)

  const clearTimer = () => {
    if (phase2TimerRef.current !== null) {
      clearTimeout(phase2TimerRef.current)
      phase2TimerRef.current = null
    }
  }

  const cancel = useCallback(() => {
    clearTimer()
    sessionRef.current++
    voice.stop()
    setState({ kind: 'idle' })
  }, [voice])

  const start = useCallback(({ field, suggestions, onSelect, onNoMatch, onError }: StartArgs) => {
    clearTimer()
    sessionRef.current++
    const session = sessionRef.current

    setState({ kind: 'listening', field, phase: 1 })
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
          // Auto-start phase 2 after a short pause
          phase2TimerRef.current = setTimeout(() => {
            if (session !== sessionRef.current) return
            setState({ kind: 'listening', field, phase: 2 })
            voice.start({
              onResult: (text2) => {
                if (session !== sessionRef.current) return
                const picked = pickFromFiltered(text2, matches)
                if (picked) {
                  onSelect(picked)
                  setState({ kind: 'idle' })
                } else if (onNoMatch) {
                  onNoMatch(text2.trim())
                  setState({ kind: 'idle' })
                } else {
                  setState({ kind: 'noMatch', field })
                }
              },
              onError: (code) => {
                if (session !== sessionRef.current) return
                if (code === 'no-speech') {
                  // Keep the picker visible so user can tap
                  setState({ kind: 'pick', field, items: matches })
                } else {
                  setState({ kind: 'idle' })
                  onError?.(code)
                }
              },
            })
          }, PHASE2_DELAY_MS)
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
