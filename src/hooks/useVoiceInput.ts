import { useState, useEffect, useRef } from 'react'

interface ISpeechRecognitionEvent {
  readonly results: { readonly 0: { readonly 0: { readonly transcript: string } } }
}

interface ISpeechRecognition {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: ISpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition

function getSR(): SpeechRecognitionConstructor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

interface UseVoiceInputReturn {
  isAvailable: boolean
  start: (onResult: (text: string) => void, onEnd?: () => void) => void
  stop: () => void
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isAvailable, setIsAvailable] = useState(false)
  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const onResultRef = useRef<((text: string) => void) | null>(null)

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

  function start(onResult: (text: string) => void, onEnd?: () => void) {
    const SR = getSR()
    if (!SR || !navigator.onLine) return

    recognitionRef.current?.stop()

    onResultRef.current = onResult
    const recognition = new SR()
    recognition.lang = 'ru-RU'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript
      onResultRef.current?.(text)
    }
    recognition.onend = () => onEnd?.()

    recognitionRef.current = recognition
    recognition.start()
  }

  function stop() {
    recognitionRef.current?.stop()
  }

  return { isAvailable, start, stop }
}
