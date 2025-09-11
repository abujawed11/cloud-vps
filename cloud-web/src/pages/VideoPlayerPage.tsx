import { useSearchParams } from "react-router-dom"
import NetflixVideoPlayer from "@/features/viewer/components/NetflixVideoPlayer"

export default function VideoPlayerPage() {
  const [params] = useSearchParams()
  const path = params.get("path") || ""
  const filename = path.split('/').pop() || ""

  if (!path) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        No video path provided.
      </div>
    )
  }

  // Get auth token and include in URL since video tags can't send headers
  const token = localStorage.getItem("auth_token")
  const videoUrl = `https://cloud.noteshandling.in/api/fs/download?path=${encodeURIComponent(path)}&token=${token}`

  return <NetflixVideoPlayer src={path} filename={filename} />
}