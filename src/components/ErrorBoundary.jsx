import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // In production console is stripped, but this is a safety fallback
    if (typeof console !== 'undefined') {
      console.error('ErrorBoundary caught:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', padding: 40, fontFamily: "'DM Sans', sans-serif",
          background: 'var(--color-bg, #FAF6EE)', color: 'var(--color-text, #1E293B)',
        }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: 'var(--color-navy, #0B1B3E)' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-light, #64748B)', marginBottom: 24, textAlign: 'center', maxWidth: 400 }}>
            An unexpected error occurred. Please refresh the page or try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--color-navy, #0B1B3E)', color: 'var(--color-gold, #C9A84C)',
              fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500,
            }}
          >
            Refresh Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
