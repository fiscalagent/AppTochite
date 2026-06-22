import { useState, useEffect, useRef, useCallback } from 'react'
import { track, trackOnce } from '../services/analytics'
import type { Locale } from '../i18n'

interface ISpeechRecognitionEvent {
  readonly results: { readonly 0: { readonly 0: { readonly transcript: string } } }
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

export type VoiceErrorCode = 'not-allowed' | 'no-speech' | 'network' | 'aborted' | 'audio-capture' | 'other'

function mapError(raw: string): VoiceErrorCode {
  switch (raw) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'not-allowed'
    case 'no-speech': return 'no-speech'
    case 'network': return 'network'
    case 'aborted': return 'aborted'
    case 'audio-capture': return 'audio-capture'
    default: return 'other'
  }
}

interface StartOptions {
  onResult: (text: string) => void
  onEnd?: () => void
  onError?: (code: VoiceErrorCode) => void
}

interface UseVoiceInputReturn {
  isAvailable: boolean
  isListening: boolean
  start: (opts: StartOptions) => void
  stop: () => void
}

function recognitionLang(locale: Locale): string {
  return locale === 'en' ? 'en-US' : 'ru-RU'
}

export function useVoiceInput(locale: Locale = 'ru'): UseVoiceInputReturn {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const localeRef = useRef(locale)
  useEffect(() => { localeRef.current = locale }, [locale])
  // Each session gets a unique id; callbacks check it to ignore late events
  // from a previous recognition that was replaced by a quick re-start.
  const sessionIdRef = useRef(0)

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
    sessionIdRef.current++
    const rec = recognitionRef.current
    recognitionRef.current = null
    if (rec) {
      try { rec.abort() } catch { /* ignore */ }
    }
    setIsListening(false)
  }, [])

  const start = useCallback(({ onResult, onEnd, onError }: StartOptions) => {
    const SR = getSR()
    if (!SR || !navigator.onLine) {
      onError?.('network')
      return
    }

    // Abort any prior session and invalidate its callbacks.
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
    recognition.continuous = false

    recognition.onresult = (e) => {
      if (mySession !== sessionIdRef.current) return
      trackOnce('voice_used')
      const text = e.results[0][0].transcript
      onResult(text)
    }
    recognition.onend = () => {
      if (mySession !== sessionIdRef.current) return
      recognitionRef.current = null
      setIsListening(false)
      onEnd?.()
    }
    recognition.onerror = (e) => {
      if (mySession !== sessionIdRef.current) return
      recognitionRef.current = null
      setIsListening(false)
      const code = mapError(e.error)
      if (code !== 'aborted') track('voice_failed', { code }).catch(() => {})
      onError?.(code)
    }

    recognitionRef.current = recognition
    setIsListening(true)
    try {
      recognition.start()
    } catch {
      // InvalidStateError if a previous recognition is still ending. Retry once on next tick.
      setTimeout(() => {
        if (mySession !== sessionIdRef.current) return
        try {
          recognition.start()
        } catch {
          recognitionRef.current = null
          setIsListening(false)
          onError?.('other')
        }
      }, 50)
    }
  }, [])

  return { isAvailable, isListening, start, stop }
}
