import { useSearchParams, useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { 
  listFs,
  type FsEntry,
  mkdirAt,
  uploadFile,
  remoteDownload,
  startRemoteDownload,
  getRemoteStatus,
  removePaths,
  moveOne,
  copyOne,
  renameOne,
  joinPath,
  parentOf,
  downloadFile,
  generateDirectLink
} from "@/features/fs/api"
import { formatFileSize, getFileType, getFileIcon } from "@/features/fs/utils"
import { api } from "@/lib/axios"
import { useMemo, useRef, useState, useEffect } from "react"
import NewFolderDialog from "@/features/fs/components/NewFolderDialog"
import ConfirmDialog from "@/features/fs/components/ConfirmDialog"
import InputDialog from "@/features/fs/components/InputDialog"
import PasteLinkDialog from "@/features/fs/components/PasteLinkDialog"
import { useContextMenu, type ContextMenuItem } from "@/components/ContextMenu"
import { useStatusBar } from "@/components/StatusBar"
// import { ProgressDialog } from "@/components/ProgressDialog"
import { FloatingPasteButton } from "@/components/FloatingPasteButton"
import { ClipboardIndicator } from "@/components/ClipboardIndicator"

type ClipMode = "copy" | "cut"
type ClipboardState = { mode: ClipMode; items: string[]; sourceDir: string } | null

/* ---------- helper functions for copy links ---------- */
async function buildDirectDownloadLink(filePath: string): Promise<string> {
  try {
    // Generate JWT-signed direct link for downloading
    return await generateDirectLink(filePath, true)
  } catch (error) {
    console.error('Failed to generate download link:', error)
    // Fallback to old auth method if API fails
    const baseURL = api.defaults.baseURL || "https://cloud.noteshandling.in/api"
    const token = localStorage.getItem("auth_token")
    const url = new URL(`${baseURL}/fs/download`)
    url.searchParams.set("path", filePath)
    if (token) url.searchParams.set("token", token)
    return url.toString()
  }
}

async function buildStreamableLink(filePath: string): Promise<string> {
  try {
    // Generate JWT-signed direct link for streaming (works perfectly with VLC)
    return await generateDirectLink(filePath, false)
  } catch (error) {
    console.error('Failed to generate streamable link:', error)
    // Fallback to old method if API fails
    return buildDirectDownloadLink(filePath)
  }
}

async function copyToClipboard(text: string, successMessage: string, errorMessage: string, showSuccess: (msg: string) => void, showError: (msg: string) => void) {
  try {
    await navigator.clipboard.writeText(text)
    showSuccess(successMessage)
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    showError(errorMessage)
  }
}

export default function Explorer() {
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const path = params.get("path") || "/"

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ["fs:list", path],
    queryFn: () => listFs(path),
  })

  /* ---------- selection ---------- */
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const allPaths = useMemo(() => entries.map(e => e.path || joinPath(path, e.name)), [entries, path])
  const selectedCount = selected.size
  const { showContextMenu, ContextMenuComponent } = useContextMenu()
  const { success, error: showError, info, StatusBar } = useStatusBar()
  
  // Breadcrumb segments for current path
  const breadcrumbs = useMemo(() => {
    const parts = path.split('/').filter(Boolean)
    const segs: { label: string; full: string }[] = []
    let cur = '/'
    // Always start with root
    segs.push({ label: 'Root', full: '/' })
    for (const p of parts) {
      cur = cur.endsWith('/') ? cur + p : cur + '/' + p
      segs.push({ label: p, full: cur })
    }
    return segs
  }, [path])

  function toggleSelect(p: string) {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(p)) n.delete(p); else n.add(p)
      return n
    })
  }
  function clearSelection() { setSelected(new Set()) }
  function selectAll() { setSelected(new Set(allPaths)) }

  /* ---------- dialogs / busy states ---------- */
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadPct, setUploadPct] = useState<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const [showNewFolder, setShowNewFolder] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const [showPasteLink, setShowPasteLink] = useState(false)
  
  type RemoteJob = { id: string; filename: string; progress: number; state: string; error?: string | null }
  const [remoteJobs, setRemoteJobs] = useState<RemoteJob[]>([])

  /* ---------- clipboard ---------- */
  const [clipboard, setClipboard] = useState<ClipboardState>(null)

  /* ---------- mutations ---------- */
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
    mutationFn: (args: { url: string; transcode?: boolean }) => remoteDownload(args.url, path, args.transcode),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fs:list", path] }),
  })
  const deleteMut = useMutation({
    mutationFn: (paths: string[]) => removePaths(paths),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fs:list", path] })
      clearSelection()
    },
  })

  /* ---------- row/open ---------- */
  function open(entry: FsEntry) {
    const isDir = entry.type === "dir" || entry.isDir || entry.isDirectory
    if (isDir) {
      const next = path.endsWith("/") ? path + entry.name : path + "/" + entry.name
      setParams({ path: next })
    } else {
      const p = entry.path || (path.endsWith("/") ? path + entry.name : path + "/" + entry.name)
      const fileType = getFileType(entry.name)
      
      switch (fileType) {
        case 'image':
          nav(`/image-viewer?path=${encodeURIComponent(p)}`)
          break
        case 'video':
          nav(`/video-player?path=${encodeURIComponent(p)}`)
          break
        case 'text':
        case 'code':
          nav(`/editor?path=${encodeURIComponent(p)}`)
          break
        default:
          info(`File Preview: Preview for "${entry.name}" (${fileType}) not implemented yet`)
      }
    }
  }
  function goUp() { setParams({ path: parentOf(path) }) }

  /* ---------- toolbar handlers ---------- */
  function onUploadClick() { fileInputRef.current?.click() }
  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      setBusy("Uploading…")
      await uploadMut.mutateAsync(f)
      success(`Upload Complete: Successfully uploaded "${f.name}"`)
    } catch {
      showError("Upload Failed: Failed to upload the file. Please try again.")
    } finally {
      e.target.value = ""
      setBusy(null)
      setUploadPct(null)
    }
  }
  async function onPasteLink() {
    setShowPasteLink(true)
  }

  async function submitPasteLink(args: { url: string; transcode?: boolean }) {
    try {
      setBusy("Starting download…")
      const { id, filename } = await startRemoteDownload(args.url, path, args.transcode)
      setShowPasteLink(false)
      setRemoteJobs((jobs) => [...jobs, { id, filename, progress: 0, state: 'queued' }])
      info(`Download Started: ${filename}`)
    } catch {
      showError("Download Failed: Could not start remote download. Please check the URL and try again.")
    } finally {
      setBusy(null)
    }
  }

  // Poll remote download progress
  useEffect(() => {
    if (remoteJobs.length === 0) return
    const timer = setInterval(async () => {
      try {
        const updates = await Promise.all(remoteJobs.map(j => getRemoteStatus(j.id).catch(() => null)))
        setRemoteJobs(prev => prev.map((j, idx) => {
          const u = updates[idx]
          if (!u) return j
          return { id: u.id, filename: u.filename || j.filename, progress: u.progress ?? j.progress, state: u.state || j.state, error: u.error }
        }))
      } catch {
        // ignore
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [remoteJobs.length])

  /* ---------- cut/copy/paste ---------- */
  // These functions are no longer used as we handle clipboard operations directly in context menu
  // function onCopy() {
  //   if (!selectedCount) return
  //   const items = Array.from(selected)
  //   //console.log('Copy items to clipboard:', items)
  //   setClipboard({ mode: "copy", items, sourceDir: path })
  // }
  // function onCut() {
  //   if (!selectedCount) return
  //   const items = Array.from(selected)
  //   //console.log('Move items to clipboard:', items)
  //   setClipboard({ mode: "cut", items, sourceDir: path })
  // }
  async function onPaste() {
    if (!clipboard) return
    setBusy(clipboard.mode === "cut" ? "Moving…" : "Copying…")
    try {
      //console.log('Paste operation:', clipboard)
      //console.log('Current path:', path)
      
      for (const src of clipboard.items) {
        const name = src.split("/").filter(Boolean).pop()!
        const dest = joinPath(path, name)
        
        //console.log(`${clipboard.mode === "cut" ? "Moving" : "Copying"}: "${src}" -> "${dest}"`)
        
        // Skip if source and destination are the same (same folder, same name)
        if (src === dest) {
          //console.log(`Skipping ${src} - source and destination are the same`)
          continue
        }
        
        if (clipboard.mode === "cut") {
          await moveOne(src, dest, true)
        } else {
          await copyOne(src, dest, true)
        }
      }
      setClipboard(null)
      qc.invalidateQueries({ queryKey: ["fs:list", path] })
      if (clipboard.sourceDir !== path) {
        qc.invalidateQueries({ queryKey: ["fs:list", clipboard.sourceDir] })
      }
      clearSelection()
      success(`Operation Complete: ${clipboard.mode === "cut" ? "Moved" : "Copied"} ${clipboard.items.length} item(s) successfully`)
    } catch (error) {
      console.error('Paste failed:', error)
      showError(`Operation Failed: ${(error as Error)?.message || "Paste failed"}`)
    } finally {
      setBusy(null)
    }
  }

  /* ---------- rename / move / delete ---------- */
  async function doRename(newName: string) {
    if (selectedCount !== 1) return
    const only = Array.from(selected)[0]
    const curDir = parentOf(only)
    const oldName = only.split("/").filter(Boolean).pop()!
    
    //console.log('Rename operation:')
    //console.log('  Full path:', only)
    //console.log('  Current dir:', curDir)
    //console.log('  Old name:', oldName)
    //console.log('  New name:', newName)
    
    setBusy("Renaming…")
    try {
      await renameOne(curDir, oldName, newName)
      setShowRename(false)
      clearSelection()
      qc.invalidateQueries({ queryKey: ["fs:list", path] })
      success(`Renamed Successfully: "${oldName}" renamed to "${newName}"`)
    } catch (error) {
      console.error('Rename failed:', error)
      showError(`Rename Failed: ${(error as Error)?.message || "Could not rename the item"}`)
    } finally {
      setBusy(null)
    }
  }
  async function doMove(destDir: string) {
    if (!selectedCount) return
    setBusy("Moving…")
    try {
      //console.log('Move operation:')
      //console.log('  Destination directory:', destDir)
      //console.log('  Items to move:', Array.from(selected))
      
      for (const src of Array.from(selected)) {
        const name = src.split("/").filter(Boolean).pop()!
        const dest = joinPath(destDir, name)
        
        //console.log(`  Moving: "${src}" -> "${dest}"`)
        await moveOne(src, dest, true)
      }
      setShowMove(false)
      clearSelection()
      qc.invalidateQueries({ queryKey: ["fs:list", path] })
      if (destDir !== path) qc.invalidateQueries({ queryKey: ["fs:list", destDir] })
      success(`Move Complete: Successfully moved ${selectedCount} item(s) to ${destDir}`)
    } catch (error) {
      console.error('Move failed:', error)
      showError(`Move Failed: ${(error as Error)?.message || "Could not move the selected items"}`)
    } finally {
      setBusy(null)
    }
  }
  async function doDelete() {
    if (!selectedCount) return
    setBusy("Deleting…")
    try {
      const pathsToDelete = Array.from(selected)
      
      // Validation: ensure we're not deleting parent directories
      //console.log('Current directory:', path)
      //console.log('Paths to delete:', pathsToDelete)
      
      // Check if any path is a parent of the current directory
      const currentDir = path.endsWith('/') ? path : path + '/'
      const dangerousPaths = pathsToDelete.filter(p => {
        const pathToCheck = p.endsWith('/') ? p : p + '/'
        return currentDir.startsWith(pathToCheck) && pathToCheck !== currentDir
      })
      
      if (dangerousPaths.length > 0) {
        showError(`Delete Blocked: Cannot delete parent directories: ${dangerousPaths.join(', ')}`)
        return
      }
      
      // Additional validation: ensure paths are children of current directory or absolute paths to files
      const validPaths = pathsToDelete.filter(p => {
        // Allow absolute paths that are clearly files/folders
        if (p.startsWith('/') && !currentDir.startsWith(p + '/')) {
          return true
        }
        // Ensure path is in current directory
        return p.startsWith(currentDir) || p.startsWith(path)
      })
      
      if (validPaths.length !== pathsToDelete.length) {
        console.warn('Some paths filtered out:', pathsToDelete.filter(p => !validPaths.includes(p)))
      }
      
      if (validPaths.length === 0) {
        showError('Delete Failed: No valid paths to delete')
        return
      }
      
      //console.log('Validated paths to delete:', validPaths)
      await deleteMut.mutateAsync(validPaths)
      setShowDelete(false)
    } catch (error) {
      console.error('Delete failed:', error)
      showError(`Delete Failed: ${(error as Error)?.message || "Could not delete the selected items"}`)
    } finally {
      setBusy(null)
    }
  }

  /* ---------- download ---------- */
  async function doDownload(filePath: string) {
    try {
      setBusy("Downloading…")
      await downloadFile(filePath)
      success("Download Started: File download has been initiated")
    } catch (error) {
      console.error('Download failed:', error)
      showError(`Download Failed: ${(error as Error)?.message || "Could not download the file"}`)
    } finally {
      setBusy(null)
    }
  }

  /* ---------- context menu ---------- */
  function getContextMenuItems(entry: FsEntry, entryPath: string): ContextMenuItem[] {
    const isDir = entry.type === "dir" || entry.isDir || entry.isDirectory
    const isSelected = selected.has(entryPath)

    const items: ContextMenuItem[] = []

    if (isSelected && selectedCount > 1) {
      // Multi-selection context menu
      items.push(
        { label: `Copy ${selectedCount} items`, icon: "📄", onClick: () => {
          const items = Array.from(selected)
          //console.log('Copy multiple items to clipboard:', items)
          setClipboard({ mode: "copy", items, sourceDir: path })
        }},
        { label: `Move ${selectedCount} items`, icon: "✂️", onClick: () => {
          const items = Array.from(selected)
          //console.log('Move multiple items to clipboard:', items)
          setClipboard({ mode: "cut", items, sourceDir: path })
        }},
        { label: `Move ${selectedCount} items to...`, icon: "📦", onClick: () => setShowMove(true) },
        { label: `Delete ${selectedCount} items`, icon: "🗑️", onClick: () => setShowDelete(true) }
      )
    } else {
      // Single item context menu
      if (!isDir) {
        items.push({ label: "Download", icon: "⬇️", onClick: () => doDownload(entryPath) })

        // Add copy link options for files
        items.push(
          { divider: true },
          { label: "Copy Streamable Link", icon: "🔗", onClick: async () => {
            try {
              const streamableLink = await buildStreamableLink(entryPath)
              copyToClipboard(streamableLink, "Streamable link copied to clipboard", "Failed to copy streamable link", success, showError)
            } catch (error) {
              showError("Failed to generate streamable link")
            }
          }},
          { label: "Copy Direct Download Link", icon: "📎", onClick: async () => {
            try {
              const downloadLink = await buildDirectDownloadLink(entryPath)
              copyToClipboard(downloadLink, "Download link copied to clipboard", "Failed to copy download link", success, showError)
            } catch (error) {
              showError("Failed to generate download link")
            }
          }}
        )
      }

      items.push(
        { divider: true },
        { label: "Copy", icon: "📄", onClick: () => {
          //console.log('Copy item to clipboard:', entryPath)
          setClipboard({ mode: "copy", items: [entryPath], sourceDir: path })
        }},
        { label: "Move", icon: "✂️", onClick: () => {
          //console.log('Move item to clipboard:', entryPath)
          setClipboard({ mode: "cut", items: [entryPath], sourceDir: path })
        }},
        { divider: true },
        { label: "Rename", icon: "✏️", onClick: () => {
          setSelected(new Set([entryPath]))
          setShowRename(true)
        }},
        { label: "Move to...", icon: "📦", onClick: () => {
          setSelected(new Set([entryPath]))
          setShowMove(true)
        }},
        { divider: true },
        { label: "Delete", icon: "🗑️", onClick: () => {
          setSelected(new Set([entryPath]))
          setShowDelete(true)
        }}
      )
    }

    return items
  }

  function getEmptySpaceContextMenuItems(): ContextMenuItem[] {
    const items: ContextMenuItem[] = [
      { label: "New Folder", icon: "➕", onClick: () => setShowNewFolder(true) },
      { label: "Upload File", icon: "⤴️", onClick: onUploadClick },
      { label: "Paste Link", icon: "🔗", onClick: onPasteLink }
    ]

    if (clipboard && clipboard.items.length > 0) {
      items.push(
        { divider: true },
        { label: `Paste ${clipboard.items.length} item(s)`, icon: "📋", onClick: onPaste }
      )
    }

    if (selectedCount > 0) {
      items.push(
        { divider: true },
        { label: "Clear Selection", icon: "❌", onClick: clearSelection }
      )
    }

    items.push(
      { divider: true },
      { label: "Select All", icon: "☑️", onClick: selectAll }
    )

    return items
  }

  return (
    <div className="min-h-screen bg-background text-text">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-brand">Explorer</h1>
        </div>

        {/* Simplified Toolbar */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button className="rounded-md border px-3 py-1.5 hover:bg-background-muted" onClick={goUp}>⬆️ Up</button>
          <button className="rounded-md bg-brand px-3 py-1.5 text-white hover:bg-brand-dark" onClick={()=>setShowNewFolder(true)}>➕ New Folder</button>
          <button className="rounded-md border px-3 py-1.5 hover:bg-background-muted" onClick={onUploadClick}>⤴️ Upload</button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelected} />
          <button className="rounded-md border px-3 py-1.5 hover:bg-background-muted" onClick={onPasteLink}>🔗 Paste Link</button>

          <div className="ml-auto flex items-center gap-4 text-sm text-text-muted">
            {busy && <span>{busy}</span>}
            {uploadPct !== null && <span>{uploadPct}%</span>}
            {clipboard && <span>Clipboard: {clipboard.mode} {clipboard.items.length} item(s)</span>}
            {selectedCount > 0 && <span>Selected: {selectedCount}</span>}
          </div>
        </div>

        {isLoading && <p>Loading…</p>}
        {error && <p className="text-red-600">Failed to list path.</p>}

        <div className="min-h-96 rounded-lg border relative">
          {/* Breadcrumbs */}
          <div className="px-4 py-2 border-b bg-background-muted/40 rounded-t-lg">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-base">📁</span>
              {breadcrumbs.map((seg, i) => (
                <span key={seg.full} className="flex items-center gap-2">
                  {i > 0 && <span className="text-text-muted">/</span>}
                  <button
                    className={`hover:underline ${i === breadcrumbs.length - 1 ? 'font-medium text-text' : 'text-text-muted'}`}
                    onClick={() => setParams({ path: seg.full })}
                    title={seg.full}
                  >
                    {seg.label}
                  </button>
                </span>
              ))}
            </div>
          </div>
          {/* Remote download progress */}
          {remoteJobs.length > 0 && (
            <div className="px-4 py-2 border-b bg-white/50">
              {remoteJobs.map(job => (
                <div key={job.id} className="mb-2 last:mb-0">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="truncate max-w-[70%]">Downloading to cloud: {job.filename}</span>
                    <span className="text-text-muted">{job.progress}%</span>
                  </div>
                  <div className="h-2 w-full rounded bg-gray-200 overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all" style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-text-muted">
                    <span>Status: {job.state}</span>
                    {(job.state === 'done' || job.state === 'error') && (
                      <button className="underline" onClick={() => setRemoteJobs(list => list.filter(j => j.id !== job.id))}>Dismiss</button>
                    )}
                  </div>
                  {job.error && <div className="text-[11px] text-red-600 mt-1">{job.error}</div>}
                </div>
              ))}
            </div>
          )}
          {/* File List Area */}
          <div 
            className="min-h-full"
            onContextMenu={(e) => {
              // Only show empty space context menu if not clicking on a file row
              const target = e.target as HTMLElement
              if (!target.closest('.file-row')) {
                showContextMenu(e, getEmptySpaceContextMenuItems())
              }
            }}
          >
            {entries.map((entry) => {
              const isDir = entry.type === "dir" || entry.isDir || entry.isDirectory
              const p = entry.path || joinPath(path, entry.name)
              //console.log(`File: ${entry.name}, Current Path: ${path}, Constructed Path: ${p}`)
              const checked = selected.has(p)
              const inClipboard = clipboard?.items.includes(p)
              const isCut = inClipboard && clipboard?.mode === "cut"
              
              return (
                <div 
                  key={p} 
                  className={`file-row flex items-center gap-3 px-4 py-2 hover:bg-background-muted border-b border-gray-100 last:border-b-0 transition-all duration-200 ${
                    isCut ? 'opacity-50 bg-yellow-50' : ''
                  } ${
                    inClipboard && clipboard?.mode === "copy" ? 'bg-blue-50' : ''
                  }`}
                  onContextMenu={(event) => {
                    event.stopPropagation()
                    showContextMenu(event, getContextMenuItems(entry, p))
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSelect(p)}
                    className="h-4 w-4"
                    onClick={(ev)=>ev.stopPropagation()}
                  />
                  <button className="w-6" onClick={()=>toggleSelect(p)} title={checked ? "Unselect" : "Select"}>
                    {isDir ? "📁" : getFileIcon(entry.name)}
                  </button>
                  <button className="flex-1 text-left" onDoubleClick={() => open(entry)}>
                    {entry.name}
                  </button>
                  {!isDir && typeof entry.size === "number" && (
                    <span className="text-xs text-text-muted">{formatFileSize(entry.size)}</span>
                  )}
                </div>
              )
            })}
            {!isLoading && !error && entries.length === 0 && (
              <div className="px-4 py-8 text-center text-text-muted">Empty folder</div>
            )}
            {/* Empty Space for Right-Click */}
            {entries.length > 0 && (
              <div className="min-h-32" />
            )}
          </div>

          {/* Clipboard Indicator (anchored to this container) */}
          {clipboard && (
            <ClipboardIndicator
              mode={clipboard.mode}
              items={clipboard.items}
              sourceDir={clipboard.sourceDir}
              onClear={() => {
                setClipboard(null)
              }}
            />
          )}
        </div>
      </div>

      {/* New Folder */}
      <NewFolderDialog
        open={showNewFolder}
        onClose={() => setShowNewFolder(false)}
        isCreating={mkdirMut.isPending}
        onCreate={async (name) => {
          await mkdirMut.mutateAsync(name)
          setShowNewFolder(false)
        }}
      />

      {/* Delete */}
      <ConfirmDialog
        open={showDelete}
        // onClose={()=>setShowDelete(false)}
        onCancel={()=>setShowDelete(false)}
        onConfirm={doDelete}
        busy={deleteMut.isPending}
        title="Delete selected?"
        message={
          <div>
            This will permanently delete:
            <ul className="mt-2 max-h-40 overflow-auto text-xs">
              {Array.from(selected).map(p=>(<li key={p}><code>{p}</code></li>))}
            </ul>
          </div>
        }
        confirmText="Delete"
      />

      {/* Paste Link */}
      <PasteLinkDialog
        open={showPasteLink}
        onClose={() => setShowPasteLink(false)}
        onSubmit={submitPasteLink}
        busy={!!busy}
      />

      {/* Rename (single) */}
      <InputDialog
        open={showRename}
        onClose={()=>setShowRename(false)}
        title="Rename"
        label="New name"
        defaultValue={selectedCount===1 ? Array.from(selected)[0].split("/").filter(Boolean).pop() : ""}
        submitText="Rename"
        validate={(v)=>{
          if (!v.trim()) return "Name is required"
          if (/[\\/:*?"<>|]/.test(v)) return "Invalid characters: \\ / : * ? \" < > |"
          if (v.includes("..")) return "Name cannot contain .."
          return null
        }}
        onSubmit={doRename}
        busy={!!busy}
      />

      {/* Move (multiple) */}
      <InputDialog
        open={showMove}
        onClose={()=>setShowMove(false)}
        title="Move to…"
        label="Destination folder"
        defaultValue={path}
        placeholder="/srv/storage/library/"
        submitText="Move"
        validate={(v)=>{
          if (!v.trim()) return "Destination is required"
          if (!v.startsWith("/")) return "Use an absolute path starting with /"
          return null
        }}
        onSubmit={doMove}
        busy={!!busy}
      />

      {/* Context Menu */}
      {ContextMenuComponent}
      
      {/* Status Bar */}
      <StatusBar />
      
      {/* Floating Paste Button */}
      <FloatingPasteButton
        visible={!!clipboard && clipboard.items.length > 0}
        mode={clipboard?.mode || "copy"}
        itemCount={clipboard?.items.length || 0}
        onPaste={onPaste}
        onCancel={() => {
          setClipboard(null)
        }}
      />
      
      {/* Clipboard Indicator moved inside the explorer container */}
    </div>
  )
}
