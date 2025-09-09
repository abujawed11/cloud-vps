type FloatingPasteButtonProps = {
  visible: boolean
  mode: "copy" | "cut"
  itemCount: number
  onPaste: () => void
  onCancel: () => void
}

export function FloatingPasteButton({ visible, mode, itemCount, onPaste, onCancel }: FloatingPasteButtonProps) {
  if (!visible) return null

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <div className="flex flex-col gap-2">
        {/* Main Paste Button */}
        <button
          onClick={onPaste}
          className="group relative flex items-center gap-3 rounded-lg bg-blue-600 px-4 py-3 text-white shadow-lg hover:bg-blue-700 transition-all duration-200 hover:scale-105"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">
                {mode === "copy" ? "Paste Here" : "Move Here"}
              </span>
              <span className="text-xs opacity-90">
                {itemCount} item{itemCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          {/* Animated indicator */}
          <div className="absolute -top-1 -right-1">
            <div className="h-3 w-3 rounded-full bg-green-400 animate-pulse" />
          </div>
        </button>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="flex items-center justify-center rounded-lg bg-gray-600 px-3 py-2 text-white text-sm hover:bg-gray-700 transition-colors"
          title="Cancel operation"
        >
          ✕ Cancel
        </button>
      </div>

      {/* Background indicator */}
      <div className="absolute inset-0 -z-10 rounded-lg bg-blue-600/20 blur-lg" />
    </div>
  )
}