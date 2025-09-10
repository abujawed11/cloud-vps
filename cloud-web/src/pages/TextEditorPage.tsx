import { useSearchParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { readText, writeText } from "@/features/editor/api"
import { useState, useEffect } from "react"
import { getFileType } from "@/features/fs/utils"
import CodeEditor from "@/features/editor/components/CodeEditor"

export default function TextEditorPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const path = params.get("path") || ""
  const filename = path.split('/').pop() || ""
  const fileType = getFileType(filename)
  
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["fs:text", path],
    queryFn: () => readText(path),
    enabled: !!path
  })
  const [value, setValue] = useState("")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => { 
    if (data !== undefined) {
      setValue(data)
      setHasUnsavedChanges(false)
    }
  }, [data])

  useEffect(() => {
    const handleSave = () => saveMutation.mutate()
    document.addEventListener('editor-save', handleSave)
    return () => document.removeEventListener('editor-save', handleSave)
  }, [])

  const handleValueChange = (newValue: string) => {
    setValue(newValue)
    setHasUnsavedChanges(newValue !== data)
  }

  const saveMutation = useMutation({
    mutationFn: () => writeText(path, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fs:text", path] })
      setHasUnsavedChanges(false)
      // Show success message briefly
      const successIndicator = document.getElementById('save-success')
      if (successIndicator) {
        successIndicator.style.display = 'block'
        setTimeout(() => {
          successIndicator.style.display = 'none'
        }, 2000)
      }
    },
    onError: () => {
      const errorIndicator = document.getElementById('save-error')
      if (errorIndicator) {
        errorIndicator.style.display = 'block'
        setTimeout(() => {
          errorIndicator.style.display = 'none'
        }, 3000)
      }
    }
  })

  // Handle browser back/refresh with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  if (!path) return <div className="p-6">No file path provided.</div>

  return (
    <div className="h-screen bg-background text-text flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between bg-background-muted px-4 py-3 border-b">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1 border rounded hover:bg-background-muted"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-lg font-semibold text-brand flex items-center gap-2">
              {fileType === 'code' ? '💻' : '📝'} 
              {filename}
              {hasUnsavedChanges && <span className="text-orange-500">•</span>}
            </h1>
            <code className="text-xs text-text-muted">{path}</code>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save Status Indicators */}
          <div id="save-success" className="text-green-600 text-sm" style={{ display: 'none' }}>
            ✓ Saved
          </div>
          <div id="save-error" className="text-red-600 text-sm" style={{ display: 'none' }}>
            ✗ Save failed
          </div>
          
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!hasUnsavedChanges || saveMutation.isPending}
            className={`px-4 py-2 font-medium rounded-md transition-all ${
              hasUnsavedChanges && !saveMutation.isPending
                ? 'bg-brand text-white hover:bg-brand-dark'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p>Loading file...</p>
            </div>
          </div>
        ) : fileType === 'code' ? (
          <CodeEditor
            value={value}
            onChange={handleValueChange}
            filename={filename}
          />
        ) : (
          <div className="h-full p-4">
            <textarea
              className="w-full h-full resize-none rounded-lg border p-3 outline-none focus:ring-2 focus:ring-brand font-mono"
              value={value}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="Start typing..."
            />
          </div>
        )}
      </div>
    </div>
  )
}
