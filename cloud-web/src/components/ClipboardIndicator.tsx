type ClipboardIndicatorProps = {
  mode: "copy" | "cut"
  items: string[]
  sourceDir: string
  onClear: () => void
}

export function ClipboardIndicator({ mode, items, sourceDir, onClear }: ClipboardIndicatorProps) {
  const getItemNames = () => {
    return items.map(item => item.split('/').filter(Boolean).pop() || '').slice(0, 3)
  }

  const itemNames = getItemNames()
  const hasMore = items.length > 3

  return (
    <div className="fixed bottom-2 left-1/2 transform -translate-x-1/2 z-30">
      <div className="flex items-center gap-3 rounded-lg bg-white border border-gray-200 shadow-lg px-4 py-2 max-w-md">
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {mode === "copy" ? "📄" : "✂️"}
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-700">
              {mode === "copy" ? "Copied" : "Cut"} {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
            <div className="text-xs text-gray-500">
              {itemNames.join(', ')}
              {hasMore && ` +${items.length - 3} more`}
            </div>
          </div>
        </div>
        
        <button
          onClick={onClear}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          title="Clear clipboard"
        >
          ✕
        </button>
      </div>
    </div>
  )
}