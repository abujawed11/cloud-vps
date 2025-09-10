import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildMediaUrl } from "@/features/fs/api"; // <— import helper

interface ImageViewerProps {
  src: string
  filename: string
}

export default function ImageViewer({ src, filename }: ImageViewerProps) {
  const navigate = useNavigate()
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const mediaSrc = useMemo(() => buildMediaUrl(src), [src]); // <— build URL with token

  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 5))
  const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.1))
  const handleResetZoom = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      handleZoomIn()
    } else {
      handleZoomOut()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 z-10">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="text-lg font-medium truncate">{filename}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="px-3 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-all"
            >
              −
            </button>
            <span className="text-sm min-w-[4rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="px-3 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-all"
            >
              +
            </button>
            <button
              onClick={handleResetZoom}
              className="px-3 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-all text-sm"
            >
              Reset
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Image Container */}
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <img
          src={mediaSrc}
          crossOrigin="anonymous"             // <— allow CORS
          alt={filename}
          className="max-w-full max-h-full object-contain select-none transition-transform duration-200"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default'
          }}
          draggable={false}
        />
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-4 py-2 rounded">
        Mouse wheel to zoom • Click and drag to pan • ESC to close
      </div>

      {/* Keyboard handler */}
      <div
        tabIndex={0}
        className="fixed inset-0 outline-none"
        onKeyDown={(e) => {
          if (e.key === 'Escape') navigate(-1)
          else if (e.key === '+' || e.key === '=') handleZoomIn()
          else if (e.key === '-') handleZoomOut()
          else if (e.key === '0') handleResetZoom()
        }}
        autoFocus
      />
    </div>
  )
}