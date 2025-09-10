import { api } from "@/lib/axios"

export type FsEntry = {
  name: string
  path: string
  type: "file" | "dir"
  size?: number
  isDir?: boolean
  isDirectory?: boolean
}

/* ---------- path helpers ---------- */
export function joinPath(base: string, name: string) {
  if (!base || base === "/") return `/${name}`.replace(/\/+/, "/")
  return `${base.replace(/\/+$/, "")}/${name}`.replace(/\/+/, "/")
}
export function parentOf(p: string) {
  if (!p || p === "/") return "/"
  const parts = p.replace(/\/+$/,"").split("/")
  parts.pop()
  const up = parts.join("/") || "/"
  return up.endsWith("/") ? up : up + "/"
}

function guessName(it: any): string {
  if (!it) return ""
  return (
    it.name ??
    it.filename ??
    it.base ??
    (typeof it.path === "string" ? it.path.split("/").filter(Boolean).pop() : undefined) ??
    ""
  )
}
function mapItem(it: any, basePath: string, forceType?: "file" | "dir"): FsEntry {
  const name = guessName(it)
  const type: "file" | "dir" =
    forceType ??
    (it.type === "dir" || it.isDir || it.isDirectory ? "dir" : it.type === "file" ? "file" : "file")

  return {
    name,
    path: it.path ?? joinPath(basePath, name),
    type,
    size: it.size ?? it.bytes ?? it.length,
    isDir: it.isDir,
    isDirectory: it.isDirectory,
  }
}
function normalizeFsResponse(raw: any, basePath: string): FsEntry[] {
  try {
    if (Array.isArray(raw)) return raw.map((it) => mapItem(it, basePath, (it?.type === "dir" || it?.isDir || it?.isDirectory) ? "dir" : undefined))
    const arr =
      raw?.entries ?? raw?.items ?? raw?.list ?? raw?.children ?? raw?.result ?? raw?.data
    if (Array.isArray(arr)) {
      return arr.map((it: any) =>
        mapItem(it, basePath, (it?.type === "dir" || it?.isDir || it?.isDirectory) ? "dir" : undefined)
      )
    }
    const dirArr = raw?.dirs ?? raw?.directories ?? raw?.folders
    const fileArr = raw?.files ?? raw?.file
    const out: FsEntry[] = []
    if (Array.isArray(dirArr)) out.push(...dirArr.map((it: any) => mapItem(it, basePath, "dir")))
    if (Array.isArray(fileArr)) out.push(...fileArr.map((it: any) => mapItem(it, basePath, "file")))
    if (out.length) return out
    return []
  } catch {
    return []
  }
}

/* ---------- existing calls ---------- */
export async function listFs(path: string): Promise<FsEntry[]> {
  const { data: raw } = await api.get("/fs/list", { params: { path } })
  const entries = normalizeFsResponse(raw, path)
  if (import.meta.env.DEV && !Array.isArray(raw)) console.debug("[fs:list] raw shape:", raw)
  return entries
}
export async function mkdirAt(currentPath: string, name: string) {
  const full = joinPath(currentPath, name)
  await api.post("/fs/mkdir", { path: full })
}
export async function uploadFile(destPath: string, file: File, onProgress?: (pct: number) => void) {
  const form = new FormData()
  form.append("dest", destPath)
  form.append("file", file)
  await api.post("/fs/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (!onProgress) return
      const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0
      onProgress(pct)
    },
  })
}
export async function remoteDownload(url: string, destPath: string, transcode?: boolean) {
  const { data } = await api.post("/remote/download", { url, dest: destPath, transcode: !!transcode })
  return data
}

export async function startRemoteDownload(url: string, destPath: string, transcode?: boolean): Promise<{ id: string; filename: string }> {
  const { data } = await api.post("/remote/start", { url, dest: destPath, transcode: !!transcode })
  return data
}

export async function getRemoteStatus(id: string): Promise<{ id: string; filename: string; progress: number; state: string; error?: string | null }>{
  const { data } = await api.get(`/remote/status/${encodeURIComponent(id)}`)
  return data
}

/* ---------- new: delete / move / copy / rename ---------- */

// Tries { paths: string[] } first; if the backend only accepts single { path }, falls back per-item.
export async function removePaths(paths: string[]) {
  if (paths.length === 0) return
  
  console.log('removePaths called with:', paths)
  
  try {
    await api.post("/fs/rm", { paths })
  } catch (batchError) {
    console.log('Batch delete failed, trying individual deletes:', batchError)
    // fallback: send individually
    const results = await Promise.allSettled(paths.map(async (p) => {
      console.log('Deleting individual path:', p)
      try {
        const response = await api.post("/fs/rm", { path: p })
        console.log('Successfully deleted:', p, response)
        return response
      } catch (error) {
        console.error('Failed to delete:', p, error)
        throw error
      }
    }))
    
    const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failures.length > 0) {
      console.error('Some deletes failed:', failures)
      throw new Error(`Failed to delete ${failures.length} items: ${failures.map(f => f.reason?.message || 'Unknown error').join(', ')}`)
    }
  }
}

// Move/rename one item. Uses { src, dest } payload.
export async function moveOne(src: string, dest: string, overwrite = true) {
  console.log('moveOne API call:', { src, dest, overwrite, copy: false })
  try {
    const response = await api.post("/fs/mv", { src, dest, overwrite, copy: false })
    console.log('moveOne success:', response)
    return response
  } catch (error) {
    console.error('moveOne failed:', error)
    throw error
  }
}

// Copy one item. Preferred: mv with { copy: true }, fallback to /fs/cp if your backend exposes it.
export async function copyOne(src: string, dest: string, overwrite = true) {
  try {
    await api.post("/fs/mv", { src, dest, overwrite, copy: true })
  } catch {
    try {
      await api.post("/fs/cp", { src, dest, overwrite })
    } catch {
      throw new Error("Copy not supported by backend (/fs/mv copy:true or /fs/cp missing).")
    }
  }
}

export async function renameOne(currentDir: string, oldName: string, newName: string) {
  const from = joinPath(currentDir, oldName)
  const to = joinPath(currentDir, newName)
  await moveOne(from, to, true)
}

export function downloadFile(path: string, filename?: string) {
  const url = `${api.defaults.baseURL}/fs/download?path=${encodeURIComponent(path)}`
  const link = document.createElement('a')
  link.href = url
  link.download = filename || path.split('/').pop() || 'download'
  
  // Add authorization header by creating a temporary form
  const token = localStorage.getItem('auth_token')
  if (token) {
    // For file downloads, we need to include auth in URL or use a different approach
    // Since we can't add headers to a direct download link, we'll fetch and create blob
    return fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) throw new Error('Download failed')
      return response.blob()
    })
    .then(blob => {
      const blobUrl = window.URL.createObjectURL(blob)
      link.href = blobUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    })
  } else {
    // Fallback without auth (shouldn't happen in protected routes)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}



// fs.ts (your current file with listFs, mkdirAt, etc.)

export function buildMediaUrl(filePath: string) {
  const base = (api.defaults.baseURL || '').replace(/\/$/, '');
  const url = new URL(base + '/fs/download');
  url.searchParams.set('path', filePath);

  const token = localStorage.getItem('auth_token');
  if (token) url.searchParams.set('token', token);

  return url.toString();
}
