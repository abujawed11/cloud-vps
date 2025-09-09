import { useEffect, useRef, useState } from "react"

type Props = {
  open: boolean
  onClose: () => void
  onSubmit: (args: { url: string; transcode?: boolean }) => Promise<void> | void
  busy?: boolean
}

export default function PasteLinkDialog({ open, onClose, onSubmit, busy }: Props) {
  const [url, setUrl] = useState("")
  const [transcode, setTranscode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setUrl("")
      setTranscode(false)
      setError(null)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  function validate(u: string) {
    if (!u.trim()) return "URL is required"
    try {
      const parsed = new URL(u)
      if (!/^https?:$/.test(parsed.protocol)) return "Use http(s) URL"
      return null
    } catch {
      return "Invalid URL"
    }
  }

  async function doSubmit() {
    const err = validate(url)
    if (err) return setError(err)
    await onSubmit({ url, transcode })
  }

  async function pasteFromClipboard() {
    try {
      // Clipboard API requires secure context; may throw
      const text = await navigator.clipboard.readText()
      if (text) {
        setUrl(text)
        setError(null)
      } else {
        setError("Clipboard is empty")
      }
    } catch (e) {
      setError("Cannot access clipboard. Grant permission or paste manually.")
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose()
    if (e.key === "Enter") void doSubmit()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onClick={(e)=>{ if(e.target===e.currentTarget) onClose() }}>
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-brand mb-3">Remote Download</h2>
        <label className="block text-sm mb-1">Direct link (URL)</label>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={url}
            onChange={(e)=>setUrl(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="https://example.com/file.mp4"
            disabled={busy}
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-brand"
          />
          <button
            type="button"
            onClick={pasteFromClipboard}
            disabled={busy}
            className="rounded-md border px-3 py-2 hover:bg-gray-50"
            title="Paste from clipboard"
          >
            Paste
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input id="transcode" type="checkbox" checked={transcode} onChange={(e)=>setTranscode(e.target.checked)} disabled={busy} />
          <label htmlFor="transcode" className="text-sm">Auto-transcode if video</label>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-md border px-3 py-1.5 hover:bg-gray-50" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="rounded-md bg-brand px-3 py-1.5 text-white hover:bg-brand-dark disabled:opacity-60" onClick={doSubmit} disabled={busy}>
            {busy ? "Working…" : "Start Download"}
          </button>
        </div>
      </div>
    </div>
  )
}
