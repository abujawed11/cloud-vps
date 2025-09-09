import { useEffect, useState } from "react"

export type ToastType = "success" | "error" | "info" | "warning"

export type ToastMessage = {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

type ToastProps = {
  toast: ToastMessage
  onClose: (id: string) => void
}

function Toast({ toast, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const timer1 = setTimeout(() => setIsVisible(true), 10)
    
    // Auto-close after duration
    const duration = toast.duration ?? 4000
    const timer2 = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(() => onClose(toast.id), 300) // Wait for exit animation
    }, duration)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [toast.id, toast.duration, onClose])

  const typeStyles = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    info: "bg-blue-50 border-blue-200 text-blue-800"
  }

  const iconStyles = {
    success: "text-green-500",
    error: "text-red-500", 
    warning: "text-yellow-500",
    info: "text-blue-500"
  }

  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ"
  }

  return (
    <div
      className={`mb-2 max-w-sm rounded-lg border p-4 shadow-lg transition-all duration-300 ${
        typeStyles[toast.type]
      } ${
        isVisible && !isLeaving 
          ? "translate-x-0 opacity-100" 
          : "translate-x-full opacity-0"
      }`}
    >
      <div className="flex items-start">
        <div className={`mr-3 text-lg ${iconStyles[toast.type]}`}>
          {icons[toast.type]}
        </div>
        <div className="flex-1">
          <h4 className="font-medium">{toast.title}</h4>
          {toast.message && (
            <p className="mt-1 text-sm opacity-90">{toast.message}</p>
          )}
        </div>
        <button
          onClick={() => {
            setIsLeaving(true)
            setTimeout(() => onClose(toast.id), 300)
          }}
          className="ml-2 rounded text-lg hover:bg-black/10 p-1 leading-none"
        >
          ×
        </button>
      </div>
    </div>
  )
}

type ToastContainerProps = {
  toasts: ToastMessage[]
  onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  )
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = (type: ToastType, title: string, message?: string, duration?: number) => {
    const id = Date.now().toString()
    const newToast: ToastMessage = { id, type, title, message, duration }
    setToasts(prev => [...prev, newToast])
  }

  const closeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const success = (title: string, message?: string) => showToast("success", title, message)
  const error = (title: string, message?: string) => showToast("error", title, message)
  const warning = (title: string, message?: string) => showToast("warning", title, message)
  const info = (title: string, message?: string) => showToast("info", title, message)

  return {
    toasts,
    showToast,
    closeToast,
    success,
    error,
    warning,
    info,
    ToastContainer: () => <ToastContainer toasts={toasts} onClose={closeToast} />
  }
}