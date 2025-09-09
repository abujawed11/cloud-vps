import { useEffect, useState, useCallback } from "react"

export type StatusMessage = {
  id: string
  type: "success" | "error" | "info" | "warning"
  message: string
  duration?: number
}

type StatusBarProps = {
  message: StatusMessage | null
}

export function StatusBar({ message }: StatusBarProps) {
  const [currentMessage, setCurrentMessage] = useState<StatusMessage | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (message) {
      setCurrentMessage(message)
      setIsVisible(true)
      
      const duration = message.duration ?? 3000
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => setCurrentMessage(null), 200) // Wait for fade animation
      }, duration)

      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
      setTimeout(() => setCurrentMessage(null), 200)
    }
  }, [message])

  if (!currentMessage) return null

  const typeStyles = {
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
    warning: "bg-yellow-600 text-white", 
    info: "bg-blue-600 text-white"
  }

  const icons = {
    success: "✓",
    error: "⚠",
    warning: "⚠", 
    info: "ℹ"
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div 
        className={`${typeStyles[currentMessage.type]} px-4 py-2 text-sm transition-all duration-200 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <span>{icons[currentMessage.type]}</span>
          <span>{currentMessage.message}</span>
        </div>
      </div>
    </div>
  )
}

// Global state management for status messages
class StatusBarManager {
  private currentMessage: string | null = null
  private timer: NodeJS.Timeout | null = null
  private setters = new Set<(status: StatusMessage | null) => void>()
  private debounceTimer: NodeJS.Timeout | null = null

  addSetter(setter: (status: StatusMessage | null) => void) {
    this.setters.add(setter)
  }

  removeSetter(setter: (status: StatusMessage | null) => void) {
    this.setters.delete(setter)
  }

  showStatus(type: StatusMessage["type"], message: string, duration: number = 3000) {
    // Clear any existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    // Debounce rapid successive calls with same message
    this.debounceTimer = setTimeout(() => {
      // Prevent exact duplicate messages
      if (message === this.currentMessage) {
        console.log('Duplicate message prevented:', message)
        return
      }
      
      // Clear existing display timer
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }
      
      this.currentMessage = message
      const statusMessage: StatusMessage = { 
        id: Date.now().toString(), 
        type, 
        message, 
        duration 
      }
      
      // Update all instances
      this.setters.forEach(setter => setter(statusMessage))
      
      // Auto-hide after duration
      this.timer = setTimeout(() => {
        this.currentMessage = null
        this.setters.forEach(setter => setter(null))
        this.timer = null
      }, duration)
    }, 50) // 50ms debounce
  }

  clearStatus() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this.currentMessage = null
    this.setters.forEach(setter => setter(null))
  }
}

const globalStatusManager = new StatusBarManager()

export function useStatusBar() {
  const [currentStatus, setCurrentStatus] = useState<StatusMessage | null>(null)

  // Register this setter globally
  useEffect(() => {
    globalStatusManager.addSetter(setCurrentStatus)
    return () => {
      globalStatusManager.removeSetter(setCurrentStatus)
    }
  }, [])

  const showStatus = useCallback((type: StatusMessage["type"], message: string, duration?: number) => {
    globalStatusManager.showStatus(type, message, duration ?? 3000)
  }, [])

  const clearStatus = useCallback(() => {
    if (globalTimer) {
      clearTimeout(globalTimer)
      globalTimer = null
    }
    globalCurrentMessage = null
    globalSetters.forEach(setter => setter(null))
  }, [])

  const success = useCallback((message: string, duration?: number) => showStatus("success", message, duration), [showStatus])
  const error = useCallback((message: string, duration?: number) => showStatus("error", message, duration), [showStatus])
  const warning = useCallback((message: string, duration?: number) => showStatus("warning", message, duration), [showStatus])
  const info = useCallback((message: string, duration?: number) => showStatus("info", message, duration), [showStatus])

  return {
    currentStatus,
    showStatus,
    clearStatus,
    success,
    error,
    warning,
    info,
    StatusBar: () => <StatusBar message={currentStatus} />
  }
}