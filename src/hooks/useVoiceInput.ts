import { useState, useEffect, useRef } from 'react'

interface UseVoiceInputReturn {
  isAvailable: boolean
  start: (onResult: (text: string) => void, onEnd?: () => void) => void
  stop: () => void
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isAvailable, setIsAvailable] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const onResultRef = useRef<((text: string) => void) | null>(null)

  useEffect(() => {
    const SR = (window as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      ?? (window as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
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
    const SR = (window as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      ?? (window as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
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
