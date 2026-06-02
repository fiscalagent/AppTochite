import { useCallback, useEffect, useRef, useState } from 'react'
import { parseCommand, type Command, type CommandContext } from '../utils/voiceCommand'
import type { Locale } from '../i18n'

interface ISpeechRecognitionResult {
  readonly isFinal: boolean
  readonly 0: { readonly transcript: string }
}

interface ISpeechRecognitionEvent {
  readonly resultIndex: number
  readonly results: ArrayLike<ISpeechRecognitionResult>
}

interface ISpeechRecognitionErrorEvent {
  readonly error: string
}

interface ISpeechRecognition {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  onresult: ((event: ISpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null
  start(): void
  stop(): void
  abort(): void
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition

function getSR(): SpeechRecognitionConstructor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export type DictationErrorCode =
  | 'not-allowed' | 'no-speech' | 'network' | 'aborted' | 'audio-capture' | 'other'

function mapError(raw: string): DictationErrorCode {
  switch (raw) {
    case 'not-allowed':
    case 'service-not-allowed': return 'not-allowed'
    case 'no-speech': return 'no-speech'
    case 'network': return 'network'
    case 'aborted': return 'aborted'
    case 'audio-capture': return 'audio-capture'
    default: return 'other'
  }
}

export type AutoStopReason = 'errors' | 'unavailable' | 'fatal'

export interface DictationStartOptions {
  onCommand: (cmd: Command, raw: string) => void
  getContext: () => CommandContext
  onAutoStop?: (reason: AutoStopReason) => void
  onListenError?: (code: DictationErrorCode) => void
}

export interface UseDictationModeReturn {
  isAvailable: boolean
  isActive: boolean
  lastTranscript: string
  start: (opts: DictationStartOptions) => void
  stop: () => void
}

const MAX_CONSECUTIVE_ERRORS = 3

function recognitionLang(locale: Locale): string {
  return locale === 'en' ? 'en-US' : 'ru-RU'
}

export function useDictationMode(locale: Locale = 'ru'): UseDictationModeReturn {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [lastTranscript, setLastTranscript] = useState('')

  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const isActiveRef = useRef(false)
  const sessionIdRef = useRef(0)
  const consecutiveErrorsRef = useRef(0)
  const optsRef = useRef<DictationStartOptions | null>(null)
  const localeRef = useRef(locale)
  localeRef.current = locale

  useEffect(() => {
    const SR = getSR()
    const update = () => setIsAvailable(Boolean(SR) && navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  const stop = useCallback(() => {
    isActiveRef.current = false
    sessionIdRef.current++
    consecutiveErrorsRef.current = 0
    optsRef.current = null
    const rec = recognitionRef.current
    recognitionRef.current = null
    if (rec) {
      try { rec.abort() } catch { /* ignore */ }
    }
    setIsActive(false)
  }, [])

  const startSession = useCallback(() => {
    const SR = getSR()
    const opts = optsRef.current
    if (!SR || !navigator.onLine || !opts) {
      isActiveRef.current = false
      setIsActive(false)
      opts?.onAutoStop?.('unavailable')
      optsRef.current = null
      return
    }

    sessionIdRef.current++
    const mySession = sessionIdRef.current

    const prev = recognitionRef.current
    recognitionRef.current = null
    if (prev) {
      try { prev.abort() } catch { /* ignore */ }
    }

    const recognition = new SR()
    recognition.lang = recognitionLang(localeRef.current)
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = true

    recognition.onresult = (event) => {
      if (mySession !== sessionIdRef.current) return
      const current = optsRef.current
      if (!current) return
      const results = event.results
      // Process every final result from the chunk we haven't seen yet.
      for (let i = event.resultIndex; i < results.length; i++) {
        const r = results[i]
        if (!r.isFinal) continue
        const raw = r[0].transcript.trim()
        if (!raw) continue
        consecutiveErrorsRef.current = 0
        setLastTranscript(raw)
        const cmd = parseCommand(raw, current.getContext(), localeRef.current)
        current.onCommand(cmd, raw)
      }
    }

    recognition.onerror = (e) => {
      if (mySession !== sessionIdRef.current) return
      const code = mapError(e.error)
      const current = optsRef.current

      // Fatal: permission denied or hardware — stop hard.
      if (code === 'not-allowed' || code === 'audio-capture') {
        isActiveRef.current = false
        recognitionRef.current = null
        optsRef.current = null
        setIsActive(false)
        current?.onAutoStop?.('fatal')
        current?.onListenError?.(code)
        return
      }

      // Transient: count and bail out after MAX_CONSECUTIVE_ERRORS in a row.
      consecutiveErrorsRef.current++
      current?.onListenError?.(code)
      if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
        isActiveRef.current = false
        recognitionRef.current = null
        optsRef.current = null
        setIsActive(false)
        current?.onAutoStop?.('errors')
      }
      // Otherwise let onend handle the restart.
    }

    recognition.onend = () => {
      if (mySession !== sessionIdRef.current) return
      recognitionRef.current = null
      if (!isActiveRef.current) {
        setIsActive(false)
        return
      }
      // Auto-restart on next tick to avoid InvalidStateError races.
      setTimeout(() => {
        if (mySession !== sessionIdRef.current) return
        if (!isActiveRef.current) return
        // авто-перезапуск сессии: startSession намеренно ссылается на себя
        // eslint-disable-next-line react-hooks/immutability
        startSession()
      }, 50)
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      setTimeout(() => {
        if (mySession !== sessionIdRef.current) return
        if (!isActiveRef.current) return
        try {
          recognition.start()
        } catch {
          recognitionRef.current = null
          consecutiveErrorsRef.current++
          if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
            isActiveRef.current = false
            setIsActive(false)
            optsRef.current?.onAutoStop?.('errors')
            optsRef.current = null
          } else if (isActiveRef.current) {
            // Try a fresh session.
            startSession()
          }
        }
      }, 50)
    }
  }, [])

  const start = useCallback((opts: DictationStartOptions) => {
    const SR = getSR()
    if (!SR || !navigator.onLine) {
      opts.onAutoStop?.('unavailable')
      return
    }
    optsRef.current = opts
    isActiveRef.current = true
    consecutiveErrorsRef.current = 0
    setLastTranscript('')
    setIsActive(true)
    startSession()
  }, [startSession])

  useEffect(() => {
    return () => {
      isActiveRef.current = false
      const rec = recognitionRef.current
      recognitionRef.current = null
      if (rec) {
        try { rec.abort() } catch { /* ignore */ }
      }
    }
  }, [])

  return { isAvailable, isActive, lastTranscript, start, stop }
}
