import { useEffect, useRef, useState } from "react"

type Props = {
  open: boolean
  title: string
  label: string
  placeholder?: string
  defaultValue?: string
  submitText?: string
  onSubmit: (value: string) => Promise<void> | void
  onClose: () => void
  validate?: (value: string) => string | null
  busy?: boolean
}

export default function InputDialog({
  open,
  title,
  label,
  placeholder,
  defaultValue = "",
  submitText = "Save",
  onSubmit,
  onClose,
  validate,
  busy
}: Props) {
  const [value, setValue] = useState(defaultValue)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setValue(defaultValue)
      setError(null)
      setTimeout(() => ref.current?.focus(), 0)
    }
  }, [open, defaultValue])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose()
    if (e.key === "Enter") void doSubmit()
  }

  async function doSubmit() {
    const err = validate?.(value) ?? null
    if (err) return setError(err)
    await onSubmit(value)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onClick={(e)=>{ if(e.target===e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-brand mb-3">{title}</h2>
        <label className="block text-sm mb-1">{label}</label>
        <input
          ref={ref}
          value={value}
          onChange={(e)=>setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={busy}
          className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-brand"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-md border px-3 py-1.5 hover:bg-gray-50" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="rounded-md bg-brand px-3 py-1.5 text-white hover:bg-brand-dark disabled:opacity-60" onClick={doSubmit} disabled={busy}>
            {busy ? "Working…" : submitText}
          </button>
        </div>
      </div>
    </div>
  )
}
