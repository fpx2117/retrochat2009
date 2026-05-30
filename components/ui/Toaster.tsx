'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type'], duration?: number) => void
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration || 4000)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' }
  const colors = {
    success: 'border-green-500 bg-green-900/80',
    error: 'border-red-500 bg-red-900/80',
    info: 'border-blue-400 bg-blue-900/80',
    warning: 'border-yellow-400 bg-yellow-900/80',
  }

  return (
    <div
      className={`retro-toast flex items-center gap-2 border-l-4 ${colors[toast.type]}`}
      onClick={() => onRemove(toast.id)}
      style={{ cursor: 'pointer' }}
    >
      <span>{icons[toast.type]}</span>
      <span className="text-xs">{toast.message}</span>
    </div>
  )
}

export function Toaster({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: Toast['type'] = 'info', duration = 4000) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev.slice(-4), { id, message, type, duration }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
