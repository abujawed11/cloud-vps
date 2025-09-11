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
      {/* <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-white text-xs bg-black/50 px-3 py-1 rounded opacity-70">
        Space: Play/Pause • F: Fullscreen • M: Mute • ←/→: Seek • ↑/↓: Volume • ESC: Close
      </div> */}
    </div>
  )
}








// import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
// import { useNavigate } from 'react-router-dom'
// import { buildMediaUrl } from "@/features/fs/api"

// interface VideoPlayerProps {
//   src: string
//   filename: string
// }

// type Menu = 'none' | 'settings'

// const LS_KEY = (path: string) => `vp:${path}`

// export default function VideoPlayer({ src, filename }: VideoPlayerProps) {
//   const navigate = useNavigate()
//   const videoRef = useRef<HTMLVideoElement>(null)
//   const containerRef = useRef<HTMLDivElement>(null)
//   const progressRef = useRef<HTMLDivElement>(null)
//   const hoverRef = useRef<HTMLDivElement>(null)

//   const [isPlaying, setIsPlaying] = useState(false)
//   const [currentTime, setCurrentTime] = useState(0)
//   const [duration, setDuration] = useState(0)
//   const [volume, setVolume] = useState(1)
//   const [isMuted, setIsMuted] = useState(false)
//   const [isFullscreen, setIsFullscreen] = useState(false)
//   const [showControls, setShowControls] = useState(true)
//   const [playbackRate, setPlaybackRate] = useState(1)
//   const [isBuffering, setIsBuffering] = useState(false)
//   const [bufferedRanges, setBufferedRanges] = useState<TimeRanges | null>(null)
//   const [menu, setMenu] = useState<Menu>('none')
//   const [hoverPct, setHoverPct] = useState<number | null>(null)

//   const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

//   const mediaSrc = useMemo(() => buildMediaUrl(src), [src])

//   // restore persisted prefs
//   useEffect(() => {
//     const raw = localStorage.getItem(LS_KEY(src))
//     if (!raw) return
//     try {
//       const { t, v, m, r } = JSON.parse(raw)
//       if (typeof t === 'number') setCurrentTime(t)
//       if (typeof v === 'number') setVolume(Math.min(1, Math.max(0, v)))
//       if (typeof m === 'boolean') setIsMuted(m)
//       if (typeof r === 'number') setPlaybackRate(r)
//     } catch {}
//   }, [src])

//   // persist on changes (throttle-ish)
//   useEffect(() => {
//     const id = setTimeout(() => {
//       localStorage.setItem(LS_KEY(src), JSON.stringify({
//         t: currentTime, v: volume, m: isMuted, r: playbackRate
//       }))
//     }, 300)
//     return () => clearTimeout(id)
//   }, [src, currentTime, volume, isMuted, playbackRate])

//   const hideControls = useCallback(() => {
//     if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current)
//     hideControlsTimeoutRef.current = setTimeout(() => {
//       if (isPlaying && menu === 'none') setShowControls(false)
//     }, 2500)
//   }, [isPlaying, menu])

//   const showControlsTemporarily = useCallback(() => {
//     setShowControls(true)
//     hideControls()
//   }, [hideControls])

//   useEffect(() => {
//     const video = videoRef.current
//     if (!video) return

//     const applyPrefs = () => {
//       video.volume = volume
//       video.muted = isMuted
//       video.playbackRate = playbackRate
//       if (currentTime > 0 && video.currentTime < 1) {
//         // seek only once after metadata
//         video.currentTime = currentTime
//       }
//     }

//     const handleTimeUpdate = () => setCurrentTime(video.currentTime)
//     const handleDurationChange = () => setDuration(video.duration || 0)
//     const handlePlay = () => setIsPlaying(true)
//     const handlePause = () => setIsPlaying(false)
//     const handleWaiting = () => setIsBuffering(true)
//     const handleCanPlay = () => setIsBuffering(false)
//     const handleProgress = () => setBufferedRanges(video.buffered)
//     const handleVolumeChange = () => {
//       setVolume(video.volume)
//       setIsMuted(video.muted)
//     }
//     const handleLoadedMeta = () => applyPrefs()

//     video.addEventListener('timeupdate', handleTimeUpdate)
//     video.addEventListener('durationchange', handleDurationChange)
//     video.addEventListener('play', handlePlay)
//     video.addEventListener('pause', handlePause)
//     video.addEventListener('waiting', handleWaiting)
//     video.addEventListener('canplay', handleCanPlay)
//     video.addEventListener('progress', handleProgress)
//     video.addEventListener('volumechange', handleVolumeChange)
//     video.addEventListener('loadedmetadata', handleLoadedMeta)

//     // initial
//     applyPrefs()

//     return () => {
//       video.removeEventListener('timeupdate', handleTimeUpdate)
//       video.removeEventListener('durationchange', handleDurationChange)
//       video.removeEventListener('play', handlePlay)
//       video.removeEventListener('pause', handlePause)
//       video.removeEventListener('waiting', handleWaiting)
//       video.removeEventListener('canplay', handleCanPlay)
//       video.removeEventListener('progress', handleProgress)
//       video.removeEventListener('volumechange', handleVolumeChange)
//       video.removeEventListener('loadedmetadata', handleLoadedMeta)
//     }
//   }, [currentTime, isMuted, playbackRate, volume])

//   useEffect(() => {
//     hideControls()
//     return () => {
//       if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current)
//     }
//   }, [hideControls])

//   const togglePlayPause = () => {
//     const video = videoRef.current
//     if (!video) return
//     if (video.paused) video.play()
//     else video.pause()
//   }

//   const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
//     const video = videoRef.current
//     const progressBar = progressRef.current
//     if (!video || !progressBar || !duration) return

//     const rect = progressBar.getBoundingClientRect()
//     const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
//     video.currentTime = pct * duration
//   }

//   const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
//     if (!progressRef.current || !duration) {
//       setHoverPct(null); 
//       return
//     }
//     const rect = progressRef.current.getBoundingClientRect()
//     const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
//     setHoverPct(pct)
//     if (hoverRef.current) {
//       hoverRef.current.style.left = `${pct * 100}%`
//     }
//   }

//   const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const video = videoRef.current
//     if (!video) return
//     const newVolume = parseFloat(e.target.value)
//     video.volume = newVolume
//     video.muted = newVolume === 0
//   }

//   const toggleMute = () => {
//     const video = videoRef.current
//     if (!video) return
//     video.muted = !video.muted
//   }

//   const toggleFullscreen = async () => {
//     const container = containerRef.current
//     if (!container) return
//     try {
//       if (!document.fullscreenElement) {
//         await container.requestFullscreen()
//         setIsFullscreen(true)
//       } else {
//         await document.exitFullscreen()
//         setIsFullscreen(false)
//       }
//     } catch (error) {
//       console.error('Fullscreen error:', error)
//     }
//   }

//   const requestPiP = async () => {
//     const v = videoRef.current
//     if (!v) return
//     try {
//       // @ts-ignore
//       if (document.pictureInPictureElement) {
//         // @ts-ignore
//         await document.exitPictureInPicture()
//       } else if (document.pictureInPictureEnabled) {
//         // @ts-ignore
//         await v.requestPictureInPicture()
//       }
//     } catch (e) {
//       console.warn('PiP not available', e)
//     }
//   }

//   const changePlaybackRate = (rate: number) => {
//     const video = videoRef.current
//     if (!video) return
//     video.playbackRate = rate
//     setPlaybackRate(rate)
//   }

//   const skip = (seconds: number) => {
//     const video = videoRef.current
//     if (!video) return
//     const d = duration || video.duration || 0
//     video.currentTime = Math.max(0, Math.min(d, video.currentTime + seconds))
//   }

//   const formatTime = (time: number) => {
//     const hours = Math.floor(time / 3600)
//     const minutes = Math.floor((time % 3600) / 60)
//     const seconds = Math.floor(time % 60)
//     if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
//     return `${minutes}:${seconds.toString().padStart(2, '0')}`
//   }

//   const getBufferedWidth = () => {
//     if (!bufferedRanges || !duration) return 0
//     let end = 0
//     for (let i = 0; i < bufferedRanges.length; i++) {
//       end = Math.max(end, bufferedRanges.end(i))
//     }
//     return (end / duration) * 100
//   }

//   // keyboard shortcuts
//   const onKey = (e: React.KeyboardEvent) => {
//     if ((e.target as HTMLElement)?.tagName === 'INPUT') return
//     switch (e.key) {
//       case ' ':
//         e.preventDefault()
//         togglePlayPause()
//         break
//       case 'Escape':
//         if (isFullscreen) toggleFullscreen()
//         else navigate(-1)
//         break
//       case 'f':
//       case 'F':
//         toggleFullscreen()
//         break
//       case 'm':
//       case 'M':
//         toggleMute()
//         break
//       case 'p':
//       case 'P':
//         requestPiP()
//         break
//       case 'ArrowLeft':
//         skip(-10)
//         break
//       case 'ArrowRight':
//         skip(10)
//         break
//       case ',':
//         // frame-ish step back (~0.04s)
//         skip(-0.04)
//         break
//       case '.':
//         // frame-ish step forward
//         skip(0.04)
//         break
//     }
//   }

//   return (
//     <div
//       ref={containerRef}
//       className="fixed inset-0 bg-black text-white z-50"
//       onMouseMove={showControlsTemporarily}
//       onKeyDown={onKey}
//       tabIndex={0}
//       style={{ outline: 'none' }}
//     >
//       {/* Left & right double-click seek zones (like Netflix) */}
//       <div
//         className="absolute inset-y-0 left-0 w-1/3 cursor-pointer"
//         onDoubleClick={() => skip(-10)}
//         title="Double-click: back 10s"
//       />
//       <div
//         className="absolute inset-y-0 right-0 w-1/3 cursor-pointer"
//         onDoubleClick={() => skip(10)}
//         title="Double-click: forward 10s"
//       />

//       {/* Video Element (native controls hidden via CSS) */}
//       <video
//         ref={videoRef}
//         src={mediaSrc}
//         preload="metadata"
//         crossOrigin="anonymous"
//         className="w-full h-full object-contain"
//         onClick={togglePlayPause}
//         onDoubleClick={toggleFullscreen}
//       />

//       {/* Buffering Indicator */}
//       {isBuffering && (
//         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
//           <div className="w-14 h-14 border-4 border-white/60 border-t-transparent rounded-full animate-spin" />
//         </div>
//       )}

//       {/* Overlay UI */}
//       <div
//         className={`absolute inset-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
//         style={{ pointerEvents: showControls ? 'auto' : 'none' }}
//       >
//         {/* Top bar */}
//         <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4">
//           <div className="flex items-center justify-between">
//             <h1 className="text-lg font-medium truncate">{filename}</h1>
//             <div className="flex items-center gap-2">
//               {/* Settings (speed) */}
//               <div className="relative">
//                 <button
//                   onClick={() => setMenu(m => (m === 'settings' ? 'none' : 'settings'))}
//                   className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded"
//                 >
//                   ⚙️
//                 </button>
//                 {menu === 'settings' && (
//                   <div
//                     className="absolute right-0 mt-2 w-40 bg-black/80 border border-white/10 rounded-lg backdrop-blur p-2 z-10"
//                     onMouseDown={e => e.stopPropagation()}
//                   >
//                     <div className="text-xs uppercase text-white/60 px-2 pb-1">Playback speed</div>
//                     {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
//                       <button
//                         key={r}
//                         className={`w-full text-left px-2 py-1 rounded hover:bg-white/10 ${r === playbackRate ? 'bg-white/10' : ''}`}
//                         onClick={() => { changePlaybackRate(r); setMenu('none'); }}
//                       >
//                         {r}x
//                       </button>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               {/* Close */}
//               <button
//                 onClick={() => navigate(-1)}
//                 className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded"
//               >
//                 ✕
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Center Play/Pause */}
//         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
//           <button
//             onClick={togglePlayPause}
//             className="pointer-events-auto w-20 h-20 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-3xl"
//           >
//             {isPlaying ? '⏸️' : '▶️'}
//           </button>
//         </div>

//         {/* Bottom Controls */}
//         <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
//           {/* Progress Bar with hover time */}
//           <div
//             ref={progressRef}
//             className="relative w-full h-2 bg-white/30 rounded-full cursor-pointer mb-4"
//             onClick={handleSeek}
//             onMouseMove={handleProgressHover}
//             onMouseLeave={() => setHoverPct(null)}
//           >
//             {/* Buffered */}
//             <div
//               className="absolute h-full bg-white/50 rounded-full pointer-events-none"
//               style={{ width: `${getBufferedWidth()}%` }}
//             />
//             {/* Current */}
//             <div
//               className="absolute h-full bg-red-500 rounded-full pointer-events-none"
//               style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
//             />
//             {/* Handle */}
//             <div
//               className="absolute w-4 h-4 bg-red-500 rounded-full -top-1 transform -translate-x-2 pointer-events-none"
//               style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
//             />
//             {/* Hover label */}
//             {hoverPct !== null && (
//               <div
//                 ref={hoverRef}
//                 className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 text-xs bg-black/80 rounded border border-white/10 pointer-events-none"
//                 style={{ left: `${hoverPct * 100}%` }}
//               >
//                 {formatTime((hoverPct || 0) * (duration || 0))}
//               </div>
//             )}
//           </div>

//           {/* Buttons row */}
//           <div className="flex items-center justify-between text-white">
//             <div className="flex items-center gap-3">
//               <button onClick={() => skip(-10)} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded">⏪ 10s</button>
//               <button onClick={togglePlayPause} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xl">
//                 {isPlaying ? '⏸️' : '▶️'}
//               </button>
//               <button onClick={() => skip(10)} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded">10s ⏩</button>

//               {/* Volume */}
//               <button onClick={toggleMute} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded">
//                 {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
//               </button>
//               <input
//                 type="range"
//                 min="0"
//                 max="1"
//                 step="0.05"
//                 value={isMuted ? 0 : volume}
//                 onChange={handleVolumeChange}
//                 className="w-24"
//               />

//               {/* Time */}
//               <div className="text-sm tabular-nums">
//                 {formatTime(currentTime)} / {formatTime(duration)}
//               </div>
//             </div>

//             <div className="flex items-center gap-3">
//               <button onClick={requestPiP} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded">PiP</button>
//               <button onClick={toggleFullscreen} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded">
//                 {isFullscreen ? '⤢' : '⤢'}
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Keyboard help */}
//       {/* <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white text-[11px] bg-black/50 px-3 py-1 rounded opacity-70">
//         Space: Play/Pause • F: Fullscreen • M: Mute • ←/→: Seek • ,/.: Step • P: PiP • ESC: Close
//       </div> */}
//     </div>
//   )
// }
