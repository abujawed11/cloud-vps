type ProgressDialogProps = {
  open: boolean
  title: string
  message: string
  progress?: number // 0-100, undefined for indeterminate
  onCancel?: () => void
}

export function ProgressDialog({ open, title, message, progress, onCancel }: ProgressDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-96 rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
        
        <p className="mb-4 text-sm text-gray-600">{message}</p>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div 
              className={`h-2 rounded-full bg-blue-600 transition-all duration-300 ${
                progress === undefined ? 'animate-pulse' : ''
              }`}
              style={{ 
                width: progress !== undefined ? `${progress}%` : '100%' 
              }}
            />
          </div>
          {progress !== undefined && (
            <p className="mt-1 text-xs text-gray-500 text-center">{progress}%</p>
          )}
        </div>

        {/* Loading Animation */}
        <div className="flex items-center justify-center mb-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          <span className="ml-2 text-sm text-gray-600">Processing...</span>
        </div>
        
        {onCancel && (
          <div className="flex justify-end">
            <button
              onClick={onCancel}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}