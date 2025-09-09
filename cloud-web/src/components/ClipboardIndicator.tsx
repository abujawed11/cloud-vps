type ClipboardIndicatorProps = {
  mode: "copy" | "cut"
  items: string[]
  sourceDir: string
  onClear: () => void
}

export function ClipboardIndicator({ mode, items, onClear }: ClipboardIndicatorProps) {
  const getItemNames = () => {
    return items.map(item => item.split('/').filter(Boolean).pop() || '').slice(0, 2)
  }

  const itemNames = getItemNames()
  const hasMore = items.length > 2

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none transform">
      <div className="pointer-events-auto inline-flex items-center gap-3 rounded-md bg-gray-100 border border-gray-200 px-3 py-1.5 text-sm shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs">
            {mode === "copy" ? "📋" : "✂️"}
          </span>
          <span className="text-xs font-medium text-gray-700">
            {mode === "copy" ? "Copied" : "Ready to move"} {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
          {itemNames.length > 0 && (
            <span className="text-xs text-gray-500">
              ({itemNames.join(', ')}{hasMore && ` +${items.length - 2}`})
            </span>
          )}
        </div>
        
        <button
          onClick={onClear}
          className="text-gray-400 hover:text-gray-600 transition-colors text-xs ml-1"
          title="Clear clipboard"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
