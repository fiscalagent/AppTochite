import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../../db/instance'
import { saveYandexToken, consumeOAuthState } from '../../utils/cloudBackup'

// Обрабатывает редирект Яндекс OAuth: https://...#access_token=TOKEN&state=STATE
// Если flow не был начат (нет state в sessionStorage) — мягкий редирект на /.
export default function OAuthCallback() {
  const navigate = useNavigate()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const hash = new URLSearchParams(window.location.hash.slice(1))
    const token = hash.get('access_token')
    const returnedState = hash.get('state')
    const expectedState = consumeOAuthState()

    if (!token || !expectedState || returnedState !== expectedState) {
      navigate('/', { replace: true })
      return
    }

    saveYandexToken(db, token)
      .then(() => navigate('/backup', { replace: true }))
      .catch(() => navigate('/', { replace: true }))
  }, [navigate])

  return null
}
