import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Play, Pause, CheckCircle, AlertTriangle, Clock } from 'lucide-react'

interface YouTubeVideoPlayerProps {
  videoId: string
  onComplete: () => void
  language?: 'en' | 'es'
  minimumWatchPercentage?: number
}

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

const YouTubeVideoPlayer: React.FC<YouTubeVideoPlayerProps> = ({
  videoId,
  onComplete,
  language = 'en',
  minimumWatchPercentage = 95
}) => {
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [watchedPercentage, setWatchedPercentage] = useState(0)
  const [hasCompleted, setHasCompleted] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const watchedSegmentsRef = useRef<Set<number>>(new Set())

  const translations = {
    en: {
      loading: 'Loading video...',
      error: 'Error loading video. Please refresh the page and try again.',
      instructions: 'You must watch at least 95% of this video to continue. Fast-forwarding is disabled.',
      progress: 'Video Progress',
      completed: 'Video completed! You may now proceed.',
      remainingTime: 'Time remaining',
      watchedTime: 'Watched',
      requiredWatch: 'Required to watch 95% of video',
      skipWarning: 'Fast-forwarding is not allowed. Please watch the video in order.'
    },
    es: {
      loading: 'Cargando video...',
      error: 'Error al cargar el video. Por favor actualice la página e intente nuevamente.',
      instructions: 'Debe ver al menos el 95% de este video para continuar. El avance rápido está deshabilitado.',
      progress: 'Progreso del Video',
      completed: '¡Video completado! Ahora puede continuar.',
      remainingTime: 'Tiempo restante',
      watchedTime: 'Visto',
      requiredWatch: 'Requerido ver 95% del video',
      skipWarning: 'No se permite el avance rápido. Por favor vea el video en orden.'
    }
  }

  const t = translations[language]

  // State to track saved position
  const [savedPosition, setSavedPosition] = useState<number>(0)

  // Load saved progress from sessionStorage
  useEffect(() => {
    const savedProgress = sessionStorage.getItem(`video_progress_${videoId}`)
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress)
        watchedSegmentsRef.current = new Set(parsed.watchedSegments || [])
        setWatchedPercentage(parsed.percentage || 0)
        if (parsed.currentTime) {
          setSavedPosition(parsed.currentTime)
          setCurrentTime(parsed.currentTime)
        }
        if (parsed.percentage >= minimumWatchPercentage) {
          setHasCompleted(true)
        }
      } catch (e) {
        console.error('Failed to load video progress:', e)
      }
    }
  }, [videoId, minimumWatchPercentage])

  // Save progress to sessionStorage
  const saveProgress = useCallback((time: number, percentage: number) => {
    const progress = {
      watchedSegments: Array.from(watchedSegmentsRef.current),
      percentage: percentage,
      currentTime: time,
      lastUpdate: new Date().toISOString()
    }
    sessionStorage.setItem(`video_progress_${videoId}`, JSON.stringify(progress))
  }, [videoId])

  // Load YouTube IFrame API
  useEffect(() => {
    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      setIsReady(true)
      return
    }

    // Load the IFrame Player API code asynchronously
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

    // Create callback for when API is ready
    window.onYouTubeIframeAPIReady = () => {
      setIsReady(true)
    }

    return () => {
      // Cleanup interval on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Initialize player when API is ready
  useEffect(() => {
    if (!isReady || !containerRef.current) return

    try {
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: videoId,
        width: '100%',
        height: '450',
        playerVars: {
          autoplay: 0,
          controls: 0, // Disable YouTube controls completely
          disablekb: 1, // Disable keyboard controls
          modestbranding: 1,
          rel: 0, // Don't show related videos
          showinfo: 0,
          fs: 0, // Disable fullscreen
          iv_load_policy: 3, // Hide annotations
          cc_load_policy: 1, // Show captions by default
          cc_lang_pref: language === 'es' ? 'es' : 'en'
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError
        }
      })
    } catch (err) {
      console.error('Error creating YouTube player:', err)
      setError(t.error)
    }
  }, [isReady, videoId, language, t.error, savedPosition])

  const onPlayerReady = (event: any) => {
    const player = event.target
    setDuration(player.getDuration())
    
    // Variable to track last valid position
    let lastValidTime = 0
    
    // If we have saved progress, seek to the last watched position
    if (savedPosition > 0) {
      player.seekTo(savedPosition, true)
      lastValidTime = savedPosition
      setCurrentTime(savedPosition)
      console.log(`Resuming video from ${savedPosition} seconds`)
    } else if (watchedSegmentsRef.current.size > 0) {
      // Fallback to segment-based resume if no exact position saved
      const lastWatchedSegment = Math.max(...Array.from(watchedSegmentsRef.current))
      const resumeTime = lastWatchedSegment * 2 // Each segment is 2 seconds
      player.seekTo(resumeTime, true)
      lastValidTime = resumeTime
      setCurrentTime(resumeTime)
      console.log(`Resuming video from segment ${resumeTime} seconds`)
    }
    
    // Start tracking progress and prevent skipping
    intervalRef.current = setInterval(() => {
      if (player && player.getCurrentTime) {
        const current = player.getCurrentTime()
        
        // Check if user tried to skip forward
        const maxAllowedTime = lastValidTime + 1.5 // Allow 1.5 seconds forward max
        
        if (current > maxAllowedTime) {
          // User tried to skip - force them back
          player.seekTo(lastValidTime, true)
          
          // Show warning
          const warningEl = document.getElementById('seek-warning')
          if (warningEl) {
            warningEl.style.display = 'block'
            setTimeout(() => {
              warningEl.style.display = 'none'
            }, 3000)
          }
          return // Don't update progress
        }
        
        // Update valid time
        lastValidTime = current
        setCurrentTime(current)
        
        // Track watched segments (every 2 seconds)
        const segment = Math.floor(current / 2)
        watchedSegmentsRef.current.add(segment)
        
        // Calculate percentage based on unique segments watched
        const totalSegments = Math.ceil(player.getDuration() / 2)
        const watchedSegmentsCount = watchedSegmentsRef.current.size
        const percentage = Math.min((watchedSegmentsCount / totalSegments) * 100, 100)
        
        setWatchedPercentage(percentage)
        saveProgress(current, percentage)
        
        // Check if completed
        if (percentage >= minimumWatchPercentage && !hasCompleted) {
          setHasCompleted(true)
          onComplete()
        }
      }
    }, 250) // Check every 250ms for more responsive skip prevention
  }

  const onPlayerStateChange = (event: any) => {
    const state = event.data
    const player = event.target
    
    // Update playing state
    setIsPlaying(state === window.YT.PlayerState.PLAYING)
    
    // Get current time
    const currentTime = player.getCurrentTime()
    const lastWatchedSegment = Math.max(...Array.from(watchedSegmentsRef.current), -1)
    const maxAllowedTime = (lastWatchedSegment + 1) * 2 + 2 // Allow small buffer
    
    // Check for forward seeking on any state change
    if (currentTime > maxAllowedTime) {
      // Force seek back to last watched position
      player.seekTo(Math.max(0, maxAllowedTime - 1), true)
      
      // Show warning message
      const warningEl = document.getElementById('seek-warning')
      if (warningEl) {
        warningEl.style.display = 'block'
        setTimeout(() => {
          warningEl.style.display = 'none'
        }, 3000)
      }
    }
    
    // Also check when user is seeking
    if (state === window.YT.PlayerState.BUFFERING || state === window.YT.PlayerState.CUED) {
      if (currentTime > maxAllowedTime) {
        player.seekTo(Math.max(0, maxAllowedTime - 1), true)
      }
    }
  }

  const onPlayerError = (event: any) => {
    console.error('YouTube Player Error:', event.data)
    setError(t.error)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handlePlayPause = () => {
    if (!playerRef.current) return
    
    if (isPlaying) {
      playerRef.current.pauseVideo()
    } else {
      playerRef.current.playVideo()
    }
  }

  const remainingTime = duration - currentTime

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          {t.instructions}
        </AlertDescription>
      </Alert>

      {/* Video Container */}
      <Card>
        <CardContent className="p-0">
          <div className="relative">
            <div 
              ref={containerRef} 
              className="w-full aspect-video bg-gray-900 rounded-t-lg overflow-hidden"
            >
              {!isReady && !error && (
                <div className="flex items-center justify-center h-full text-white">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p>{t.loading}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Skip Warning Overlay */}
            <div 
              id="seek-warning"
              className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-t-lg"
              style={{ display: 'none' }}
            >
              <div className="bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg max-w-md text-center">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p className="font-semibold">{t.skipWarning}</p>
              </div>
            </div>
          </div>

          {/* Custom Controls and Progress Bar */}
          <div className="p-4 bg-gray-50 rounded-b-lg">
            {/* Play/Pause Control */}
            <div className="flex items-center justify-center mb-3">
              <button
                onClick={handlePlayPause}
                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors"
                disabled={!isReady || error !== null}
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </button>
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{t.progress}</span>
              <span className="text-sm text-gray-600">
                {Math.round(watchedPercentage)}% {t.watchedTime}
              </span>
            </div>
            <Progress value={watchedPercentage} className="h-3" />
            
            {/* Time Display */}
            <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
              {remainingTime > 0 && (
                <span>{t.remainingTime}: {formatTime(remainingTime)}</span>
              )}
            </div>

            {/* Required Watch Notice */}
            <div className="mt-2 text-xs text-gray-500 text-center">
              {t.requiredWatch}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Completion Message */}
      {hasCompleted && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{t.completed}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default YouTubeVideoPlayer