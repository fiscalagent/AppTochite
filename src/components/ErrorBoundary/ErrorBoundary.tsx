import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  /** имя виджета — попадёт в лог, чтобы понять, что именно упало */
  name?: string
  /** что показать вместо упавшего поддерева; по умолчанию — ничего */
  fallback?: ReactNode
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Локальная граница ошибок. Оборачиваем ею некритичные корневые виджеты
 * (напоминания, оверлеи), чтобы рантайм-исключение в одном из них не роняло
 * всё приложение в чёрный экран — падает только сам виджет, остальное живёт.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const tag = this.props.name ? `[ErrorBoundary: ${this.props.name}]` : '[ErrorBoundary]'
    console.error(tag, error, info.componentStack)
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null
    return this.props.children
  }
}
