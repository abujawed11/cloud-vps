export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`
}

export type FileType = 'image' | 'video' | 'text' | 'code' | 'unknown'

const imageExtensions = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif'
])

const videoExtensions = new Set([
  '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.ogv'
])

const textExtensions = new Set([
  '.txt', '.md', '.readme', '.log', '.ini', '.cfg', '.conf'
])

const codeExtensions = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.cs', '.php',
  '.rb', '.go', '.rs', '.kt', '.swift', '.dart', '.scala', '.clj', '.hs', '.ml',
  '.r', '.m', '.pl', '.sh', '.bat', '.ps1', '.sql', '.html', '.htm', '.css', '.scss',
  '.sass', '.less', '.json', '.xml', '.yaml', '.yml', '.toml', '.properties',
  '.gradle', '.makefile', '.dockerfile', '.gitignore', '.env'
])

export function getFileType(filename: string): FileType {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  
  if (imageExtensions.has(ext)) return 'image'
  if (videoExtensions.has(ext)) return 'video'
  if (textExtensions.has(ext)) return 'text'
  if (codeExtensions.has(ext)) return 'code'
  
  return 'unknown'
}

export function getFileIcon(filename: string): string {
  const type = getFileType(filename)
  
  switch (type) {
    case 'image': return '🖼️'
    case 'video': return '🎥'
    case 'text': return '📝'
    case 'code': return '💻'
    default: return '📄'
  }
}