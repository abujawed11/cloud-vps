import { useEffect, type JSX } from "react"

type Props = {
  open: boolean
  title?: string
  message?: string | JSX.Element
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
}

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  busy
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return
      if (e.key === "Escape") onCancel()
      if (e.key === "Enter") onConfirm()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onCancel, onConfirm])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onClick={(e)=>{ if(e.target===e.currentTarget) onCancel() }}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-brand mb-2">{title}</h2>
        {message && <div className="text-sm text-text mb-4">{message}</div>}
        <div className="flex justify-end gap-2">
          <button className="rounded-md border px-3 py-1.5 hover:bg-gray-50" onClick={onCancel} disabled={busy}>
            {cancelText}
          </button>
          <button className="rounded-md bg-brand px-3 py-1.5 text-white hover:bg-brand-dark disabled:opacity-60" onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
