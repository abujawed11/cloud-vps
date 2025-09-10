import { useSearchParams } from "react-router-dom"
import ImageViewer from "@/features/viewer/components/ImageViewer"

export default function ImageViewerPage() {
  const [params] = useSearchParams()
  const path = params.get("path") || ""
  const filename = path.split('/').pop() || ""

  if (!path) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        No image path provided.
      </div>
    )
  }

  // Get auth token and include in URL since img tags can't send headers
  const token = localStorage.getItem("auth_token")
  const imageUrl = `https://cloud.noteshandling.in/api/fs/download?path=${encodeURIComponent(path)}&token=${token}`

  return <ImageViewer src={path} filename={filename} />
}