import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildMediaUrl } from "@/features/fs/api"
import './NetflixVideoPlayer.css'

interface VideoPlayerProps {
  src: string
  filename: string
}

type Menu = 'none' | 'settings' | 'quality'
type Quality = { label: string; value: string; active: boolean }

const SUPPORTED_FORMATS = ['.mp4', '.mkv', '.webm', '.avi', '.mov', '.wmv', '.flv', '.m4v']

export default function NetflixVideoPlayer({ src, filename }: VideoPlayerProps) {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const hoverRef = useRef<HTMLDivElement>(null)
  const volumeHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isBuffering, setIsBuffering] = useState(false)
  const [bufferedRanges, setBufferedRanges] = useState<TimeRanges | null>(null)
  const [menu, setMenu] = useState<Menu>('none')
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverPosition, setHoverPosition] = useState<number | null>(null)
  const [skipIndicator, setSkipIndicator] = useState<{ type: 'forward' | 'backward'; show: boolean }>({ type: 'forward', show: false })
  const [qualities, setQualities] = useState<Quality[]>([])
  const [selectedQuality, setSelectedQuality] = useState<string>('auto')

  const mediaSrc = useMemo(() => buildMediaUrl(src), [src])

  // Check if file format is supported
  const isFormatSupported = useMemo(() => {
    const extension = '.' + filename.split('.').pop()?.toLowerCase()
    return SUPPORTED_FORMATS.includes(extension)
  }, [filename])

  // Restore user preferences from localStorage
  useEffect(() => {
    const key = `netflix-player:${src}`
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        const { volume: savedVolume, muted, rate, time } = JSON.parse(saved)
        if (typeof savedVolume === 'number') setVolume(savedVolume)
        if (typeof muted === 'boolean') setIsMuted(muted)
        if (typeof rate === 'number') setPlaybackRate(rate)
        if (typeof time === 'number' && time > 5) setCurrentTime(time)
      } catch {}
    }
  }, [src])

  // Save preferences
  useEffect(() => {
    const key = `netflix-player:${src}`
    const data = { volume, muted: isMuted, rate: playbackRate, time: currentTime }
    localStorage.setItem(key, JSON.stringify(data))
  }, [src, volume, isMuted, playbackRate, currentTime])

  // Detect available qualities (simulated - in real app you'd have HLS/DASH)
  useEffect(() => {
    const detectedQualities: Quality[] = [
      { label: 'Auto', value: 'auto', active: true },
      { label: '1080p', value: '1080', active: false },
      { label: '720p', value: '720', active: false },
      { label: '480p', value: '480', active: false },
      { label: '360p', value: '360', active: false }
    ]
    setQualities(detectedQualities)
  }, [src])

  const hideControls = useCallback(() => {
    if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current)
    hideControlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && menu === 'none') {
        setShowControls(false)
        setShowVolumeSlider(false)
      }
    }, 3000)
  }, [isPlaying, menu])

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    hideControls()
  }, [hideControls])

  const showSkipIndicator = useCallback((type: 'forward' | 'backward') => {
    setSkipIndicator({ type, show: true })
    setTimeout(() => setSkipIndicator(prev => ({ ...prev, show: false })), 500)
  }, [])

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleDurationChange = () => setDuration(video.duration || 0)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleWaiting = () => setIsBuffering(true)
    const handleCanPlay = () => setIsBuffering(false)
    const handleProgress = () => setBufferedRanges(video.buffered)
    const handleVolumeChange = () => {
      setVolume(video.volume)
      setIsMuted(video.muted)
    }
    
    const handleLoadedMetadata = () => {
      video.volume = volume
      video.muted = isMuted
      video.playbackRate = playbackRate
      if (currentTime > 5) video.currentTime = currentTime
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('progress', handleProgress)
    video.addEventListener('volumechange', handleVolumeChange)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('progress', handleProgress)
      video.removeEventListener('volumechange', handleVolumeChange)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [volume, isMuted, playbackRate, currentTime])

  useEffect(() => {
    hideControls()
    return () => {
      if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current)
    }
  }, [hideControls])

  const togglePlayPause = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused || video.ended) {
      video.play()
    } else {
      video.pause()
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    const progressBar = progressRef.current
    if (!video || !progressBar || !duration) return

    const rect = progressBar.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, clickX / rect.width))
    video.currentTime = percentage * duration
  }

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = progressRef.current
    if (!progressBar || !duration) return

    const rect = progressBar.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setHoverTime(percentage * duration)
    setHoverPosition(percentage)
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

  const handleVolumeHover = () => {
    if (volumeHoverTimeoutRef.current) clearTimeout(volumeHoverTimeoutRef.current)
    setShowVolumeSlider(true)
  }

  const handleVolumeLeave = () => {
    volumeHoverTimeoutRef.current = setTimeout(() => {
      setShowVolumeSlider(false)
    }, 1000)
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

  const requestPiP = async () => {
    const video = videoRef.current
    if (!video) return
    try {
      if ('pictureInPictureEnabled' in document) {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture()
        } else {
          await video.requestPictureInPicture()
        }
      }
    } catch (error) {
      console.warn('Picture-in-Picture not supported:', error)
    }
  }

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = rate
    setPlaybackRate(rate)
    setMenu('none')
  }

  const changeQuality = (quality: string) => {
    setSelectedQuality(quality)
    setQualities(prev => prev.map(q => ({ ...q, active: q.value === quality })))
    setMenu('none')
    // In a real implementation, you'd switch to a different stream URL here
  }

  const skip = (seconds: number) => {
    const video = videoRef.current
    if (!video) return
    const newTime = Math.max(0, Math.min(duration, video.currentTime + seconds))
    video.currentTime = newTime
    showSkipIndicator(seconds > 0 ? 'forward' : 'backward')
  }

  const formatTime = (time: number) => {
    if (!time || !isFinite(time)) return '0:00'
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
      buffered = Math.max(buffered, bufferedRanges.end(i))
    }
    return Math.min(100, (buffered / duration) * 100)
  }

  // Keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return
    
    switch (e.key) {
      case ' ':
        e.preventDefault()
        togglePlayPause()
        break
      case 'Escape':
        if (menu !== 'none') {
          setMenu('none')
        } else if (isFullscreen) {
          toggleFullscreen()
        } else {
          navigate(-1)
        }
        break
      case 'f':
      case 'F':
        toggleFullscreen()
        break
      case 'm':
      case 'M':
        toggleMute()
        break
      case 'p':
      case 'P':
        requestPiP()
        break
      case 'ArrowLeft':
        skip(-10)
        break
      case 'ArrowRight':
        skip(10)
        break
      case 'ArrowUp':
        e.preventDefault()
        const newVolumeUp = Math.min(1, volume + 0.05)
        if (videoRef.current) {
          videoRef.current.volume = newVolumeUp
          videoRef.current.muted = false
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        const newVolumeDown = Math.max(0, volume - 0.05)
        if (videoRef.current) videoRef.current.volume = newVolumeDown
        break
      case ',':
        skip(-0.04) // Frame step back
        break
      case '.':
        skip(0.04) // Frame step forward
        break
      case 'j':
      case 'J':
        skip(-10)
        break
      case 'l':
      case 'L':
        skip(10)
        break
      case 'k':
      case 'K':
        togglePlayPause()
        break
    }
  }

  if (!isFormatSupported) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white z-50">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Unsupported Format</h1>
          <p className="text-gray-400 mb-4">
            The file format "{filename.split('.').pop()}" is not supported.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Supported formats: {SUPPORTED_FORMATS.join(', ')}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black text-white z-50 overflow-hidden"
      onMouseMove={showControlsTemporarily}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      {/* Double-click zones for seeking */}
      <div
        className="absolute inset-y-0 left-0 w-1/3 z-10"
        onDoubleClick={() => skip(-10)}
      />
      <div
        className="absolute inset-y-0 right-0 w-1/3 z-10"
        onDoubleClick={() => skip(10)}
      />

      {/* Video Element */}
      <video
        ref={videoRef}
        src={mediaSrc}
        preload="metadata"
        crossOrigin="anonymous"
        className="w-full h-full object-contain"
        onClick={togglePlayPause}
        onDoubleClick={toggleFullscreen}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Skip Indicators */}
      {skipIndicator.show && (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-20`}>
          <div className={`flex items-center gap-2 px-4 py-2 bg-black/70 rounded-lg ${
            skipIndicator.type === 'forward' ? 'text-blue-400' : 'text-orange-400'
          }`}>
            {skipIndicator.type === 'forward' ? (
              <>
                <span className="text-2xl">⏩</span>
                <span>+10 seconds</span>
              </>
            ) : (
              <>
                <span className="text-2xl">⏪</span>
                <span>-10 seconds</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="w-16 h-16 border-4 border-white border-t-red-500 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 z-40 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ pointerEvents: showControls ? 'auto' : 'none' }}
      >
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-medium truncate pr-4">{filename}</h1>
              <div className="text-sm text-gray-300 mt-1">
                {selectedQuality !== 'auto' && `${selectedQuality} • `}
                {playbackRate !== 1 && `${playbackRate}x speed • `}
                Format: {filename.split('.').pop()?.toUpperCase()}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Quality Menu */}
              <div className="relative">
                <button
                  onClick={() => setMenu(menu === 'quality' ? 'none' : 'quality')}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  title="Quality"
                >
                  HD
                </button>
                {menu === 'quality' && (
                  <div className="absolute right-0 mt-2 w-48 bg-black/90 backdrop-blur border border-white/20 rounded-lg shadow-2xl">
                    <div className="px-4 py-2 text-xs uppercase text-gray-400 border-b border-white/10">
                      Video Quality
                    </div>
                    {qualities.map((quality) => (
                      <button
                        key={quality.value}
                        onClick={() => changeQuality(quality.value)}
                        className={`w-full text-left px-4 py-2 hover:bg-white/10 transition-colors ${
                          quality.active ? 'text-red-400 bg-white/5' : ''
                        }`}
                      >
                        {quality.label}
                        {quality.active && <span className="float-right">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Settings Menu */}
              <div className="relative">
                <button
                  onClick={() => setMenu(menu === 'settings' ? 'none' : 'settings')}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  title="Settings"
                >
                  ⚙️
                </button>
                {menu === 'settings' && (
                  <div className="absolute right-0 mt-2 w-48 bg-black/90 backdrop-blur border border-white/20 rounded-lg shadow-2xl">
                    <div className="px-4 py-2 text-xs uppercase text-gray-400 border-b border-white/10">
                      Playback Speed
                    </div>
                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changePlaybackRate(rate)}
                        className={`w-full text-left px-4 py-2 hover:bg-white/10 transition-colors ${
                          rate === playbackRate ? 'text-red-400 bg-white/5' : ''
                        }`}
                      >
                        {rate === 1 ? 'Normal' : `${rate}x`}
                        {rate === playbackRate && <span className="float-right">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => navigate(-1)}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                title="Close (ESC)"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Center Play Button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button
            onClick={togglePlayPause}
            className="pointer-events-auto w-24 h-24 bg-black/50 hover:bg-black/70 backdrop-blur rounded-full flex items-center justify-center text-4xl transition-all transform hover:scale-110"
            style={{ display: showControls ? 'flex' : 'none' }}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
          {/* Progress Bar */}
          <div
            ref={progressRef}
            className="relative w-full h-1.5 bg-white/30 rounded-full cursor-pointer mb-6 group"
            onClick={handleSeek}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => {
              setHoverTime(null)
              setHoverPosition(null)
            }}
          >
            {/* Buffered Progress */}
            <div
              className="absolute h-full bg-white/50 rounded-full"
              style={{ width: `${getBufferedWidth()}%` }}
            />
            
            {/* Played Progress */}
            <div
              className="absolute h-full bg-red-500 rounded-full transition-all"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            
            {/* Progress Handle */}
            <div
              className="absolute w-4 h-4 bg-red-500 rounded-full -top-1.5 -ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            
            {/* Hover Time Tooltip */}
            {hoverTime !== null && hoverPosition !== null && (
              <div
                ref={hoverRef}
                className="absolute bottom-6 transform -translate-x-1/2 px-2 py-1 text-xs bg-black/80 backdrop-blur rounded border border-white/20 pointer-events-none"
                style={{ left: `${hoverPosition * 100}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Main Controls */}
              <button
                onClick={() => skip(-10)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Rewind 10s (J)"
              >
                <span className="text-xl">⏪</span>
              </button>
              
              <button
                onClick={togglePlayPause}
                className="p-3 hover:bg-white/10 rounded-lg transition-colors"
                title="Play/Pause (K)"
              >
                <span className="text-2xl">{isPlaying ? '⏸️' : '▶️'}</span>
              </button>
              
              <button
                onClick={() => skip(10)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Forward 10s (L)"
              >
                <span className="text-xl">⏩</span>
              </button>

              {/* Volume Control */}
              <div
                className="flex items-center gap-2 relative"
                onMouseEnter={handleVolumeHover}
                onMouseLeave={handleVolumeLeave}
              >
                <button
                  onClick={toggleMute}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Mute (M)"
                >
                  <span className="text-xl">
                    {isMuted || volume === 0 ? '🔇' : volume < 0.3 ? '🔉' : volume < 0.7 ? '🔊' : '🔊'}
                  </span>
                </button>
                
                <div
                  className={`transition-all duration-200 overflow-hidden ${
                    showVolumeSlider ? 'w-24 opacity-100' : 'w-0 opacity-0'
                  }`}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-full h-1 bg-white/30 rounded-lg appearance-none slider"
                  />
                </div>
              </div>

              {/* Time Display */}
              <div className="text-sm font-mono tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Picture in Picture */}
              <button
                onClick={requestPiP}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Picture in Picture (P)"
              >
                <span className="text-lg">📺</span>
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Fullscreen (F)"
              >
                <span className="text-lg">{isFullscreen ? '⤦' : '⤢'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-xs text-white/60 bg-black/30 px-3 py-1 rounded backdrop-blur opacity-0 hover:opacity-100 transition-opacity">
        Space: Play/Pause • K: Play/Pause • J/L: Seek • F: Fullscreen • M: Mute • P: PiP • ESC: Exit
      </div>
    </div>
  )
}