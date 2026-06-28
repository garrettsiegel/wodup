import { Component, type ReactNode, type ErrorInfo } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error:', error, info.componentStack)
  }

  reset = () => this.setState({ hasError: false })

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4 text-center">
          <p className="text-orange-500 text-sm font-semibold uppercase tracking-widest mb-4">Something went wrong</p>
          <h1 className="text-2xl font-bold mb-2">Couldn't generate that WOD</h1>
          <p className="text-gray-400 text-sm mb-8 max-w-sm">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-semibold text-sm transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
