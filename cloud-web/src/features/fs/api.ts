// import { api } from "@/lib/axios"

// export type FsEntry = {
//   name: string
//   path: string
//   type: "file" | "dir"
//   size?: number
//   isDir?: boolean
//   isDirectory?: boolean
// }

// function guessName(it: any): string {
//   if (!it) return ""
//   return (
//     it.name ??
//     it.filename ??
//     it.base ??
//     (typeof it.path === "string" ? it.path.split("/").filter(Boolean).pop() : undefined) ??
//     ""
//   )
// }

// function joinPath(base: string, name: string) {
//   if (!base || base === "/") return `/${name}`.replace(/\/+/, "/")
//   return `${base.replace(/\/+$/, "")}/${name}`.replace(/\/+/, "/")
// }

// function mapItem(it: any, basePath: string, forceType?: "file" | "dir"): FsEntry {
//   const name = guessName(it)
//   const type: "file" | "dir" =
//     forceType ??
//     (it.type === "dir" || it.isDir || it.isDirectory ? "dir" : it.type === "file" ? "file" : "file")

//   return {
//     name,
//     path: it.path ?? joinPath(basePath, name),
//     type,
//     size: it.size ?? it.bytes ?? it.length,
//     isDir: it.isDir,
//     isDirectory: it.isDirectory,
//   }
// }

// /**
//  * Accepts many possible shapes and always returns FsEntry[]
//  * Supported shapes:
//  * - Array<item>
//  * - { entries: Array }, { items: Array }, { list: Array }, { children: Array }, { result: Array }, { data: Array }
//  * - { files: Array, dirs|directories|folders: Array }
//  */
// function normalizeFsResponse(raw: any, basePath: string): FsEntry[] {
//   try {
//     // Direct array
//     if (Array.isArray(raw)) {
//       return raw.map((it) => mapItem(it, basePath, (it?.type === "dir" || it?.isDir || it?.isDirectory) ? "dir" : undefined))
//     }

//     // Common container keys
//     const arr =
//       raw?.entries ??
//       raw?.items ??
//       raw?.list ??
//       raw?.children ??
//       raw?.result ??
//       raw?.data

//     if (Array.isArray(arr)) {
//       return arr.map((it: any) =>
//         mapItem(it, basePath, (it?.type === "dir" || it?.isDir || it?.isDirectory) ? "dir" : undefined)
//       )
//     }

//     // Separate file/dir arrays
//     const dirArr = raw?.dirs ?? raw?.directories ?? raw?.folders
//     const fileArr = raw?.files ?? raw?.file

//     const out: FsEntry[] = []
//     if (Array.isArray(dirArr)) {
//       out.push(...dirArr.map((it: any) => mapItem(it, basePath, "dir")))
//     }
//     if (Array.isArray(fileArr)) {
//       out.push(...fileArr.map((it: any) => mapItem(it, basePath, "file")))
//     }
//     if (out.length) return out

//     // Fallback: nothing usable
//     return []
//   } catch {
//     return []
//   }
// }

// export async function listFs(path: string): Promise<FsEntry[]> {
//   const { data: raw } = await api.get("/fs/list", { params: { path } })
//   const entries = normalizeFsResponse(raw, path)
//   // Helpful during integration:
//   if (import.meta.env.DEV && !Array.isArray(raw)) {
//     // eslint-disable-next-line no-console
//     console.debug("[fs:list] raw shape:", raw)
//   }
//   return entries
// }




import { api } from "@/lib/axios"

export type FsEntry = {
  name: string
  path: string
  type: "file" | "dir"
  size?: number
  isDir?: boolean
  isDirectory?: boolean
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

function joinPath(base: string, name: string) {
  if (!base || base === "/") return `/${name}`.replace(/\/+/, "/")
  return `${base.replace(/\/+$/, "")}/${name}`.replace(/\/+/, "/")
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
      raw?.entries ??
      raw?.items ??
      raw?.list ??
      raw?.children ??
      raw?.result ??
      raw?.data

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

export async function listFs(path: string): Promise<FsEntry[]> {
  const { data: raw } = await api.get("/fs/list", { params: { path } })
  const entries = normalizeFsResponse(raw, path)
  if (import.meta.env.DEV && !Array.isArray(raw)) console.debug("[fs:list] raw shape:", raw)
  return entries
}

/** Create folder under current path */
export async function mkdirAt(currentPath: string, name: string) {
  const full = joinPath(currentPath, name)
  // Your backend: POST /api/fs/mkdir with { path } (adjust if it expects { dest } + name)
  await api.post("/fs/mkdir", { path: full })
}

/** Upload a single file to current path (multipart dest + file) */
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

/** Remote download into current path (optionally transcode) */
export async function remoteDownload(url: string, destPath: string, transcode?: boolean) {
  const { data } = await api.post("/remote/download", { url, dest: destPath, transcode: !!transcode })
  return data // backend returns { jobId?, ... }—we’ll just refresh listing for now
}
