import { useSearchParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { readText, writeText } from "@/features/editor/api"
import { useState, useEffect } from "react"

export default function TextEditorPage() {
  const [params] = useSearchParams()
  const path = params.get("path") || ""
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["fs:text", path],
    queryFn: () => readText(path),
    enabled: !!path
  })
  const [value, setValue] = useState("")

  useEffect(() => { if (data !== undefined) setValue(data) }, [data])

  const saveMutation = useMutation({
    mutationFn: () => writeText(path, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fs:text", path] })
      alert("Saved")
    },
    onError: () => alert("Save failed")
  })

  if (!path) return <div className="p-6">No file path provided.</div>

  return (
    <div className="min-h-screen bg-background text-text">
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-brand">Editing</h1>
          <code className="text-sm text-text-muted">{path}</code>
        </div>

        {isLoading ? (
          <p>Loading…</p>
        ) : (
          <textarea
            className="min-h-[60vh] w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-brand"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => saveMutation.mutate()}
            className="rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
