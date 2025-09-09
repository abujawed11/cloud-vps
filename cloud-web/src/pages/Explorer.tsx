import { useSearchParams, useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { listFs, type FsEntry, mkdirAt, uploadFile, remoteDownload } from "@/features/fs/api"
import { useRef, useState } from "react"
import NewFolderDialog from "@/features/fs/components/NewFolderDialog"

export default function Explorer() {
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const path = params.get("path") || "/"

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ["fs:list", path],
    queryFn: () => listFs(path),
  })

  // --- Toolbar state
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadPct, setUploadPct] = useState<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  // Dialog
  const [showNewFolder, setShowNewFolder] = useState(false)

  const mkdirMut = useMutation({
    mutationFn: (name: string) => mkdirAt(path, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fs:list", path] }),
  })

  const uploadMut = useMutation({
    mutationFn: (file: File) => uploadFile(path, file, (p) => setUploadPct(p)),
    onSuccess: () => {
      setUploadPct(null)
      qc.invalidateQueries({ queryKey: ["fs:list", path] })
    },
    onError: () => setUploadPct(null),
  })

  const remoteMut = useMutation({
    mutationFn: (args: { url: string; transcode?: boolean }) =>
      remoteDownload(args.url, path, args.transcode),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fs:list", path] }),
  })

  function open(entry: FsEntry) {
    const isDir = entry.type === "dir" || entry.isDir || entry.isDirectory
    if (isDir) {
      const next = path.endsWith("/") ? path + entry.name : path + "/" + entry.name
      setParams({ path: next })
    } else {
      const p = entry.path || (path.endsWith("/") ? path + entry.name : path + "/" + entry.name)
      if (entry.name.endsWith(".txt")) {
        nav(`/editor?path=${encodeURIComponent(p)}`)
      } else {
        alert("Open file: " + entry.name)
      }
    }
  }

  function parentPath(p: string) {
    if (p === "/" || p === "") return "/"
    const parts = p.replace(/\/+$/,"").split("/")
    parts.pop()
    const up = parts.join("/") || "/"
    return up.endsWith("/") ? up : up + "/"
  }

  function onUploadClick() {
    fileInputRef.current?.click()
  }
  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      setBusy("Uploading…")
      await uploadMut.mutateAsync(f)
      alert("Upload complete")
    } catch (err) {
      alert("Upload failed")
    } finally {
      e.target.value = ""
      setBusy(null)
      setUploadPct(null)
    }
  }

  async function onPasteLink() {
    const url = window.prompt("Paste a direct link to file/video:")
    if (!url) return
    const autoTranscode = window.confirm("Auto-transcode if video?")
    try {
      setBusy("Requesting remote download…")
      await remoteMut.mutateAsync({ url, transcode: autoTranscode })
      alert("Download started. Refreshing listing…")
    } catch {
      alert("Remote download failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="min-h-screen bg-background text-text">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-brand">Explorer</h1>
          <div className="text-sm text-text-muted">Path: <code>{path}</code></div>
        </div>

        {/* Toolbar */}
        <div className="mb-3 flex items-center gap-2">
          <button
            className="rounded-md border px-3 py-1.5 hover:bg-background-muted"
            onClick={() => setParams({ path: parentPath(path) })}
          >
            ⬆️ Up
          </button>

          <button
            className="rounded-md bg-brand px-3 py-1.5 text-white hover:bg-brand-dark"
            onClick={() => setShowNewFolder(true)}
          >
            ➕ New Folder
          </button>

          <button
            className="rounded-md border px-3 py-1.5 hover:bg-background-muted"
            onClick={onUploadClick}
          >
            ⬆️ Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={onFileSelected}
          />

          <button
            className="rounded-md border px-3 py-1.5 hover:bg-background-muted"
            onClick={onPasteLink}
          >
            🔗 Paste Link
          </button>

          {busy && (
            <span className="ml-3 text-sm text-text-muted">{busy}</span>
          )}
          {uploadPct !== null && (
            <span className="text-sm text-text-muted"> {uploadPct}% </span>
          )}
        </div>

        {isLoading && <p>Loading…</p>}
        {error && <p className="text-red-600">Failed to list path.</p>}

        <ul className="divide-y rounded-lg border">
          {entries.map((e) => {
            const isDir = e.type === "dir" || e.isDir || e.isDirectory
            return (
              <li
                key={(e.path || "") + e.name}
                className="flex items-center gap-3 px-4 py-2 hover:bg-background-muted cursor-pointer"
                onClick={() => open(e)}
              >
                <span className="w-6">{isDir ? "📁" : "📄"}</span>
                <span className="flex-1">{e.name}</span>
                {!isDir && typeof e.size === "number" && (
                  <span className="text-xs text-text-muted">{e.size} B</span>
                )}
              </li>
            )
          })}
          {!isLoading && !error && entries.length === 0 && (
            <li className="px-4 py-8 text-center text-text-muted">Empty folder</li>
          )}
        </ul>
      </div>

      {/* Dialog */}
      <NewFolderDialog
        open={showNewFolder}
        onClose={() => setShowNewFolder(false)}
        isCreating={mkdirMut.isPending}
        onCreate={async (name) => {
          try {
            await mkdirMut.mutateAsync(name)
            setShowNewFolder(false)
          } catch {
            alert("Failed to create folder")
          }
        }}
      />
    </div>
  )
}
