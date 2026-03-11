import { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react'

const ToastContext = createContext()

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)
  const timersRef = useRef(new Map())

  const removeToast = useCallback((id) => {
    clearTimeout(timersRef.current.get(id))
    timersRef.current.delete(id)
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++idRef.current
    setToasts(prev => [...prev.slice(-4), { id, message, type }])
    const timerId = setTimeout(() => {
      timersRef.current.delete(id)
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
    timersRef.current.set(id, timerId)
  }, [])

  const value = useMemo(() => ({ toasts, addToast, removeToast }), [toasts, addToast, removeToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className="fade-in"
            style={{
              padding: '12px 20px',
              borderRadius: 10,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              cursor: 'pointer',
              maxWidth: 360,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              background: toast.type === 'success' ? '#2E9E6B' :
                toast.type === 'error' ? '#D94F4F' :
                toast.type === 'warning' ? '#E07B2A' : '#4A6FA5',
              color: '#fff',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}
