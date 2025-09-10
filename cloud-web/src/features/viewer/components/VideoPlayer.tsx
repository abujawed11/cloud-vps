import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildMediaUrl } from "@/features/fs/api"; // <— import helper

interface VideoPlayerProps {
  src: string
  filename: string
}

export default function VideoPlayer({ src, filename }: VideoPlayerProps) {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isBuffering, setIsBuffering] = useState(false)
  const [bufferedRanges, setBufferedRanges] = useState<TimeRanges | null>(null)
  
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mediaSrc = useMemo(() => buildMediaUrl(src), [src]); // <— build URL with token

  const hideControls = useCallback(() => {
    if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current)
    hideControlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
  }, [isPlaying])

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    hideControls()
  }, [hideControls])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleDurationChange = () => setDuration(video.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleWaiting = () => setIsBuffering(true)
    const handleCanPlay = () => setIsBuffering(false)
    const handleProgress = () => setBufferedRanges(video.buffered)
    const handleVolumeChange = () => {
      setVolume(video.volume)
      setIsMuted(video.muted)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('progress', handleProgress)
    video.addEventListener('volumechange', handleVolumeChange)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('progress', handleProgress)
      video.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [])

  useEffect(() => {
    hideControls()
    return () => {
      if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current)
    }
  }, [hideControls])

  const togglePlayPause = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    const progressBar = progressRef.current
    if (!video || !progressBar) return

    const rect = progressBar.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const newTime = (clickX / width) * duration
    video.currentTime = newTime
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const newVolume = parseFloat(e.target.value)
    video.volume = newVolume
    video.muted = newVolume === 0
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
  }

  const toggleFullscreen = async () => {
    const container = containerRef.current
    if (!container) return

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = rate
    setPlaybackRate(rate)
  }

  const skip = (seconds: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds))
  }

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getBufferedWidth = () => {
    if (!bufferedRanges || !duration) return 0
    
    let buffered = 0
    for (let i = 0; i < bufferedRanges.length; i++) {
      const start = bufferedRanges.start(i)
      const end = bufferedRanges.end(i)
      if (start <= currentTime && end >= currentTime) {
        buffered = end
        break
      }
    }
    return (buffered / duration) * 100
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black flex items-center justify-center z-50"
      onMouseMove={showControlsTemporarily}
      onKeyDown={(e) => {
        e.preventDefault()
        switch (e.key) {
          case ' ':
            togglePlayPause()
            break
          case 'Escape':
            if (isFullscreen) toggleFullscreen()
            else navigate(-1)
            break
          case 'f':
          case 'F':
            toggleFullscreen()
            break
          case 'm':
          case 'M':
            toggleMute()
            break
          case 'ArrowLeft':
            skip(-10)
            break
          case 'ArrowRight':
            skip(10)
            break
          case 'ArrowUp':
            setVolume(prev => Math.min(1, prev + 0.1))
            if (videoRef.current) videoRef.current.volume = Math.min(1, volume + 0.1)
            break
          case 'ArrowDown':
            setVolume(prev => Math.max(0, prev - 0.1))
            if (videoRef.current) videoRef.current.volume = Math.max(0, volume - 0.1)
            break
        }
      }}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={mediaSrc}
        controls                         // (you already toggle play yourself; controls optional)
        preload="metadata"               // helps Range requests for duration
        crossOrigin="anonymous"          // <— allow CORS
        className="w-full h-full object-contain"
        onClick={togglePlayPause}
        onDoubleClick={toggleFullscreen}
      />

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ pointerEvents: showControls ? 'auto' : 'none' }}
      >
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-white text-lg font-medium truncate">{filename}</h1>
            <div className="flex items-center gap-2">
              {/* Playback Speed */}
              <select
                value={playbackRate}
                onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                className="bg-black/50 text-white text-sm rounded px-2 py-1"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
              <button
                onClick={() => navigate(-1)}
                className="text-white hover:text-gray-300 text-xl"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Center Play/Pause */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlayPause}
            className="w-20 h-20 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white text-3xl transition-all"
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          {/* Progress Bar */}
          <div
            ref={progressRef}
            className="w-full h-2 bg-white/30 rounded-full cursor-pointer mb-4 relative"
            onClick={handleSeek}
          >
            {/* Buffered Progress */}
            <div
              className="absolute h-full bg-white/50 rounded-full"
              style={{ width: `${getBufferedWidth()}%` }}
            />
            {/* Current Progress */}
            <div
              className="absolute h-full bg-red-500 rounded-full"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            {/* Progress Handle */}
            <div
              className="absolute w-4 h-4 bg-red-500 rounded-full -top-1 transform -translate-x-2"
              style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <button onClick={() => skip(-10)} className="hover:text-gray-300">
                ⏪ 10s
              </button>
              <button
                onClick={togglePlayPause}
                className="hover:text-gray-300 text-2xl"
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              <button onClick={() => skip(10)} className="hover:text-gray-300">
                10s ⏩
              </button>
              
              {/* Volume Control */}
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="hover:text-gray-300">
                  {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Time Display */}
              <div className="text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
              
              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="hover:text-gray-300 text-xl"
              >
                {isFullscreen ? '⛶' : '⛶'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Instructions */}
      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-white text-xs bg-black/50 px-3 py-1 rounded opacity-70">
        Space: Play/Pause • F: Fullscreen • M: Mute • ←/→: Seek • ↑/↓: Volume • ESC: Close
      </div>
    </div>
  )
}