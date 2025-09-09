import { useEffect, useRef, useState } from "react"
import type { KeyboardEvent } from "react"

type Props = {
  open: boolean
  onClose: () => void
  onCreate: (name: string) => Promise<void> | void
  isCreating?: boolean
}

export default function NewFolderDialog({ open, onClose, onCreate, isCreating }: Props) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName("")
      setError(null)
      // Focus the input when opened
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  function validate(n: string) {
    if (!n.trim()) return "Folder name is required"
    if (/[\\/:*?"<>|]/.test(n)) return "Invalid characters: \\ / : * ? \" < > |"
    if (n.includes("..")) return "Name cannot contain .."
    if (n.length > 128) return "Name too long"
    return null
  }

  async function handleCreate() {
    const err = validate(name)
    if (err) return setError(err)
    setError(null)
    await onCreate(name.trim())
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      void handleCreate()
    }
    if (e.key === "Escape") onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        // click outside to close
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-brand mb-3">New folder</h2>

        <label className="block text-sm mb-1">Folder name</label>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onKey}
          className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-brand"
          placeholder="e.g. movies"
          disabled={isCreating}
        />

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-md border px-3 py-1.5 hover:bg-gray-50"
            onClick={onClose}
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-brand px-3 py-1.5 text-white hover:bg-brand-dark disabled:opacity-60"
            onClick={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  )
}
