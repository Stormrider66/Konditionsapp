'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Play,
  Pause,
  RotateCcw,
  Loader2,
  Scan,
  CheckCircle2,
  AlertTriangle,
  Save,
  Sparkles,
  Brain,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Eye,
  Pencil,
  MousePointer,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  type AiAllowanceExhaustedError,
  getAiAllowanceUpgradeMessage,
  isAiAllowanceExhaustedError,
  parseAiAllowanceError,
} from '@/lib/ai/billing/client-errors'
import {
  AiAllowanceBlockedAction,
  type AiAllowanceAction,
} from '@/components/athlete/ai/AiAllowanceBlockedAction'
// FormFeedbackPanel removed - redundant with Gemini AI pose analysis

// BlazePose landmark indices
// Pose-math utilities, types, and MediaPipe BlazePose landmark indices
// live in ./pose-analyzer/utils (Phase 7i extraction).
import {
  POSE_LANDMARKS,
  detectCameraAngle,
  type PoseLandmark,
  type PoseFrame,
  type CameraAngle,
} from './pose-analyzer/utils'
import {
  calculateJointAngles,
  type JointAngle,
} from './pose-analyzer/calculate-joint-angles'
import { useLocale } from '@/i18n/client'

export type { PoseLandmark, PoseFrame }

interface AngleRange {
  name: string
  current: number
  min: number
  max: number
  status: 'good' | 'warning' | 'critical'
}

type AppLocale = 'en' | 'sv'

function text(locale: AppLocale, sv: string, en: string): string {
  return locale === 'sv' ? sv : en
}

// AI Analysis data from Gemini
interface AIAnalysisData {
  formScore: number | null
  issuesDetected: Array<{
    issue: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
    timestamp?: string
    description: string
  }> | null
  recommendations: Array<{
    priority: number
    recommendation: string
    explanation: string
  }> | null
  aiAnalysis: string | null
}

interface PoseAnalyzerProps {
  videoUrl: string
  clientId?: string
  videoType: 'STRENGTH' | 'RUNNING_GAIT' | 'SPORT_SPECIFIC'
  exerciseName?: string
  exerciseNameSv?: string
  aiAnalysis?: AIAnalysisData
  onAnalysisComplete?: (data: {
    frames: PoseFrame[]
    angles: JointAngle[]
    summary: string
  }) => void
  /** Called when secondary AI pose analysis (Gemini) completes */
  onAIPoseAnalysis?: (data: Record<string, unknown>) => void
  isSaving?: boolean
  hasSavedPoseData?: boolean
  savedFrameCount?: number | null
  poseSavedAt?: string | null
}

export function PoseAnalyzer({
  videoUrl,
  clientId,
  videoType,
  exerciseName,
  exerciseNameSv,
  aiAnalysis,
  onAnalysisComplete,
  onAIPoseAnalysis,
  isSaving = false,
  hasSavedPoseData = false,
  savedFrameCount,
  poseSavedAt,
}: PoseAnalyzerProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const { toast } = useToast()
  const localeRef = useRef(locale)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [poseLoaded, setPoseLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiAllowanceAction, setAiAllowanceAction] = useState<AiAllowanceAction | null>(null)
  const [frames, setFrames] = useState<PoseFrame[]>([])
  const [currentAngles, setCurrentAngles] = useState<JointAngle[]>([])
  const [angleRanges, setAngleRanges] = useState<Map<string, AngleRange>>(new Map())
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false)
  const [isAnalyzingWithAI, setIsAnalyzingWithAI] = useState(false)
  const [detectedCameraAngle, setDetectedCameraAngle] = useState<CameraAngle>('UNKNOWN')
  const [aiPoseAnalysis, setAiPoseAnalysis] = useState<{
    interpretation: string
    technicalFeedback: Array<{
      area: string
      observation: string
      impact: string
      suggestion: string
    }>
    patterns: Array<{
      pattern: string
      significance: string
    }>
    recommendations: Array<{
      priority: number
      title: string
      description: string
      exercises: string[]
    }>
    overallAssessment: string
    score?: number
  } | null>(null)
  const poseRef = useRef<any>(null)
  const framesRef = useRef<PoseFrame[]>([])
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [videoError, setVideoError] = useState(false)

  useEffect(() => {
    localeRef.current = locale
  }, [locale])

  const clearError = () => {
    setError(null)
    setAiAllowanceAction(null)
  }

  const showAiAllowanceError = (allowanceError: AiAllowanceExhaustedError) => {
    const description = `${allowanceError.message} ${getAiAllowanceUpgradeMessage(allowanceError)}`
    setError(description)
    setAiAllowanceAction({
      label: allowanceError.actionLabel,
      url: allowanceError.actionUrl,
    })
    return description
  }

  // Fetch video as blob to bypass CORS restrictions on signed URLs
  useEffect(() => {
    let revoke: string | null = null
    setVideoReady(false)
    setVideoError(false)
    const fetchBlob = async () => {
      try {
        const res = await fetch(videoUrl, { mode: 'cors' })
        if (!res.ok) throw new Error(`Failed to fetch video: ${res.status}`)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        revoke = url
        setBlobUrl(url)
      } catch (err) {
        console.error('Failed to load video as blob:', err)
        // Fallback to direct URL with crossOrigin for canvas access
        setBlobUrl(videoUrl)
      }
    }
    fetchBlob()
    return () => {
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [videoUrl])

  // Playback review state
  const [isReviewMode, setIsReviewMode] = useState(false)
  const [isReviewPlaying, setIsReviewPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0)
  const reviewIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Landmark editing state
  const [isEditMode, setIsEditMode] = useState(false)
  const [draggingLandmark, setDraggingLandmark] = useState<number | null>(null)
  const [hoveredLandmark, setHoveredLandmark] = useState<number | null>(null)
  const [hasEdits, setHasEdits] = useState(false)

  // Draw landmarks on canvas
  const drawLandmarks = useCallback((landmarks: any[], image: any) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // Clear and draw video frame
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    // Draw skeleton connections
    const connections = [
      // Torso
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
      [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
      [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
      // Left arm
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
      [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
      // Right arm
      [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
      [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
      // Left leg
      [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
      [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
      // Right leg
      [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
      [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
    ]

    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 2

    for (const [start, end] of connections) {
      const startLm = landmarks[start]
      const endLm = landmarks[end]
      if (startLm.visibility > 0.5 && endLm.visibility > 0.5) {
        ctx.beginPath()
        ctx.moveTo(startLm.x * canvas.width, startLm.y * canvas.height)
        ctx.lineTo(endLm.x * canvas.width, endLm.y * canvas.height)
        ctx.stroke()
      }
    }

    // Draw landmarks
    ctx.fillStyle = '#ff0000'
    for (const lm of landmarks) {
      if (lm.visibility > 0.5) {
        ctx.beginPath()
        ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 5, 0, 2 * Math.PI)
        ctx.fill()
      }
    }
  }, [])

  // Load MediaPipe Pose via CDN script (more reliable than npm package with Webpack 5)
  useEffect(() => {
    const loadPose = async () => {
      try {
        // Check if already loaded globally
        if ((window as any).Pose) {
          initializePose((window as any).Pose)
          return
        }

        // Load MediaPipe Pose from CDN
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js'
        script.crossOrigin = 'anonymous'

        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load MediaPipe Pose from CDN'))
          document.head.appendChild(script)
        })

        // Wait for Pose to be available on window
        let attempts = 0
        while (!(window as any).Pose && attempts < 50) {
          await new Promise(r => setTimeout(r, 100))
          attempts++
        }

        if (!(window as any).Pose) {
          throw new Error('MediaPipe Pose not available after loading script')
        }

        initializePose((window as any).Pose)
      } catch (err) {
        console.error('Error loading MediaPipe Pose:', err)
        setError(err instanceof Error ? err.message : 'Failed to load pose detection')
      }
    }

    const initializePose = (Pose: any) => {
      try {
        const pose = new Pose({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
          },
        })

        pose.setOptions({
          modelComplexity: 1, // 0=Lite, 1=Full, 2=Heavy
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        pose.onResults((results: any) => {
          if (results.poseLandmarks) {
            const landmarks = results.poseLandmarks.map((lm: any) => ({
              x: lm.x,
              y: lm.y,
              z: lm.z,
              visibility: lm.visibility,
            }))

            const timestamp = videoRef.current?.currentTime || 0
            const newFrame = { timestamp, landmarks }
            framesRef.current = [...framesRef.current, newFrame]
            setFrames(prev => [...prev, newFrame])

            // Detect camera angle (only on first few frames to establish)
            if (framesRef.current.length <= 5) {
              const detected = detectCameraAngle(landmarks)
              if (detected !== 'UNKNOWN') {
                setDetectedCameraAngle(detected)
              }
            }

            // Calculate joint angles based on detected camera view
            const currentCameraAngle = detectedCameraAngle !== 'UNKNOWN' ? detectedCameraAngle : detectCameraAngle(landmarks)
            const angles = calculateJointAngles(landmarks, videoType, currentCameraAngle)
            setCurrentAngles(angles)

            // Update min/max angle ranges
            setAngleRanges(prevRanges => {
              const newRanges = new Map(prevRanges)
              angles.forEach(angle => {
                const existing = newRanges.get(angle.name)
                if (existing) {
                  newRanges.set(angle.name, {
                    ...existing,
                    current: angle.angle,
                    min: Math.min(existing.min, angle.angle),
                    max: Math.max(existing.max, angle.angle),
                    status: angle.status,
                  })
                } else {
                  newRanges.set(angle.name, {
                    name: angle.name,
                    current: angle.angle,
                    min: angle.angle,
                    max: angle.angle,
                    status: angle.status,
                  })
                }
              })
              return newRanges
            })

            // Draw landmarks on canvas
            drawLandmarks(results.poseLandmarks, results.image)
          }
        })

        poseRef.current = pose
        setPoseLoaded(true)
      } catch (err) {
        console.error('Failed to initialize MediaPipe Pose:', err)
        setError(text(locale, 'Kunde inte ladda poseanalys. Försök igen.', 'Could not load pose analysis. Try again.'))
      }
    }

    loadPose()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
    // detectedCameraAngle is intentionally excluded - we don't want to reinitialize pose on camera angle detection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoType, calculateJointAngles, drawLandmarks, locale])

  // Process video frame
  const processFrame = useCallback(async () => {
    const video = videoRef.current
    const pose = poseRef.current

    if (!video || !pose || video.paused || video.ended) {
      setIsPlaying(false)
      if (framesRef.current.length > 0) {
        setIsAnalysisComplete(true)
      }
      return
    }

    try {
      await pose.send({ image: video })
    } catch (err) {
      console.error('MediaPipe pose.send() error:', err)
      setError(text(localeRef.current, 'Posemodellen kunde inte bearbeta videon. Kontrollera att videon är tillgänglig.', 'The pose model could not process the video. Check that the video is available.'))
      setIsAnalyzing(false)
      setIsPlaying(false)
      video.pause()
      return
    }
    setProgress((video.currentTime / video.duration) * 100)

    animationFrameRef.current = requestAnimationFrame(processFrame)
  }, [])

  // Save analysis
  const saveAnalysis = () => {
    if (frames.length > 0 && onAnalysisComplete) {
      const goodCount = currentAngles.filter(a => a.status === 'good').length
      const editNote = hasEdits ? text(locale, ' (med manuella korrigeringar)', ' (with manual corrections)') : ''
      const summary = text(
        locale,
        `Analyserade ${frames.length} frames. ${goodCount}/${currentAngles.length} ledvinklar inom optimalt intervall.${editNote}`,
        `Analyzed ${frames.length} frames. ${goodCount}/${currentAngles.length} joint angles within the optimal range.${editNote}`
      )
      onAnalysisComplete({ frames, angles: currentAngles, summary })
    } else if (frames.length === 0) {
      toast({
        title: text(locale, 'Ingen data att spara', 'No data to save'),
        description: text(locale, 'Kör analysen först för att få data att spara.', 'Run the analysis first to get data to save.'),
        variant: 'destructive',
      })
    }
  }

  // Analyze pose data with Gemini AI
  const analyzeWithGemini = async () => {
    if (currentAngles.length === 0) {
      toast({
        title: text(locale, 'Ingen data', 'No data'),
        description: text(locale, 'Kör poseanalysen först för att få data att analysera.', 'Run the pose analysis first to get data to analyze.'),
        variant: 'destructive',
      })
      return
    }

    setIsAnalyzingWithAI(true)
    setAiPoseAnalysis(null)
    clearError()

    try {
      // Convert angleRanges Map to array with full range data (min/max/avg)
      // This gives Gemini the FULL motion data, not just one frame
      const angleRangesArray = Array.from(angleRanges.values()).map(range => ({
        name: range.name,
        current: range.current,
        min: range.min,
        max: range.max,
        range: range.max - range.min, // Total range of motion
        status: range.status,
      }))

      const response = await fetch('/api/video-analysis/analyze-pose-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          videoType,
          exerciseName,
          exerciseNameSv,
          angles: currentAngles,
          angleRanges: angleRangesArray, // Send the full range data!
          frames,
          frameCount: frames.length,
          cameraAngle: detectedCameraAngle, // Send detected camera viewing angle
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const allowanceError = parseAiAllowanceError(data)
        if (allowanceError) throw allowanceError
        throw new Error(data.error || text(locale, 'AI-analysen misslyckades', 'AI analysis failed'))
      }

      setAiPoseAnalysis(data.analysis)

      // Notify parent about the AI analysis for page context
      if (onAIPoseAnalysis) {
        onAIPoseAnalysis(data.analysis)
      }

      toast({
        title: text(locale, 'AI-analys klar', 'AI analysis complete'),
        description: text(
          locale,
          `Gemini har analyserat ${currentAngles.length} ledvinklar från ${frames.length} frames.`,
          `Gemini analyzed ${currentAngles.length} joint angles from ${frames.length} frames.`
        ),
      })
    } catch (err) {
      console.error('Gemini analysis error:', err)
      const description = isAiAllowanceExhaustedError(err)
        ? showAiAllowanceError(err)
        : err instanceof Error ? err.message : text(locale, 'Kunde inte analysera med AI', 'Could not analyze with AI')
      if (!isAiAllowanceExhaustedError(err)) {
        setError(description)
        setAiAllowanceAction(null)
      }
      toast({
        title: text(locale, 'Analysfel', 'Analysis error'),
        description,
        variant: 'destructive',
      })
    } finally {
      setIsAnalyzingWithAI(false)
    }
  }

  // Start analysis
  const startAnalysis = async () => {
    const video = videoRef.current
    if (!video || !poseLoaded) return

    setIsAnalyzing(true)
    setFrames([])
    setProgress(0)
    setError(null)

    video.currentTime = 0
    await video.play()
    setIsPlaying(true)
    processFrame()
  }

  // Pause/Resume
  const togglePlayback = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
      setIsPlaying(true)
      processFrame()
    } else {
      video.pause()
      setIsPlaying(false)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }

  // Reset
  const resetAnalysis = () => {
    const video = videoRef.current
    if (video) {
      video.pause()
      video.currentTime = 0
    }
    setIsAnalyzing(false)
    setIsPlaying(false)
    setFrames([])
    framesRef.current = []
    setProgress(0)
    setCurrentAngles([])
    setAngleRanges(new Map())
    setIsAnalysisComplete(false)
    setDetectedCameraAngle('UNKNOWN')
    setIsReviewMode(false)
    setIsReviewPlaying(false)
    setCurrentFrameIndex(0)
    setPlaybackSpeed(1)
    setIsEditMode(false)
    setDraggingLandmark(null)
    setHoveredLandmark(null)
    setHasEdits(false)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    if (reviewIntervalRef.current) {
      clearInterval(reviewIntervalRef.current)
    }
  }

  // Draw a specific frame from the recorded frames
  const drawFrameAtIndex = useCallback((index: number) => {
    if (index < 0 || index >= frames.length) return

    const frame = frames[index]
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')

    if (!canvas || !ctx || !video) return

    // Seek video to frame timestamp
    video.currentTime = frame.timestamp

    // Draw the frame with landmarks
    const landmarks = frame.landmarks

    // Clear and prepare canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    } catch {
      // Cross-origin video may taint canvas - fill with dark background instead
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    // Draw connections
    const connections = [
      // Torso
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
      [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
      [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
      // Left arm
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
      [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
      // Right arm
      [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
      [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
      // Left leg
      [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
      [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
      [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_HEEL],
      [POSE_LANDMARKS.LEFT_HEEL, POSE_LANDMARKS.LEFT_FOOT_INDEX],
      [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_FOOT_INDEX],
      // Right leg
      [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
      [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
      [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_HEEL],
      [POSE_LANDMARKS.RIGHT_HEEL, POSE_LANDMARKS.RIGHT_FOOT_INDEX],
      [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_FOOT_INDEX],
    ]

    ctx.strokeStyle = '#00FF00'
    ctx.lineWidth = 2
    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start]
      const endPoint = landmarks[end]
      if (startPoint && endPoint) {
        ctx.beginPath()
        ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height)
        ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height)
        ctx.stroke()
      }
    })

    // Important landmarks that can be edited
    const editableLandmarks = new Set<number>([
      POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER,
      POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.RIGHT_ELBOW,
      POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.RIGHT_WRIST,
      POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
      POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.RIGHT_KNEE,
      POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE,
      POSE_LANDMARKS.LEFT_HEEL, POSE_LANDMARKS.RIGHT_HEEL,
      POSE_LANDMARKS.LEFT_FOOT_INDEX, POSE_LANDMARKS.RIGHT_FOOT_INDEX,
    ])

    // Draw landmarks
    landmarks.forEach((landmark, i) => {
      if (landmark.visibility && landmark.visibility < 0.5) return
      const x = landmark.x * canvas.width
      const y = landmark.y * canvas.height

      const isEditable = editableLandmarks.has(i)
      const isHovered = hoveredLandmark === i
      const isDragging = draggingLandmark === i

      // Determine size and color based on state
      let radius = 4
      let fillColor = '#FF0000'
      let strokeColor = ''

      if (isEditMode && isEditable) {
        radius = 8
        fillColor = isDragging ? '#FFD700' : isHovered ? '#00BFFF' : '#FF6B6B'
        strokeColor = '#FFFFFF'
      }

      ctx.beginPath()
      ctx.arc(x, y, radius, 0, 2 * Math.PI)
      ctx.fillStyle = fillColor
      ctx.fill()

      if (strokeColor) {
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })

    // Update current angles for this frame (using detected camera angle)
    const angles = calculateJointAngles(landmarks, videoType, detectedCameraAngle)
    setCurrentAngles(angles)
    setCurrentFrameIndex(index)
  }, [frames, calculateJointAngles, videoType, isEditMode, hoveredLandmark, draggingLandmark, detectedCameraAngle])

  // Start review mode
  const startReviewMode = useCallback(() => {
    setIsReviewMode(true)
    setCurrentFrameIndex(0)
    if (frames.length > 0) {
      drawFrameAtIndex(0)
    }
  }, [frames.length, drawFrameAtIndex])

  // Play/pause review
  const toggleReviewPlayback = useCallback(() => {
    if (isReviewPlaying) {
      // Stop playback
      if (reviewIntervalRef.current) {
        clearInterval(reviewIntervalRef.current)
        reviewIntervalRef.current = null
      }
      setIsReviewPlaying(false)
    } else {
      // Start playback
      setIsReviewPlaying(true)
      const frameInterval = 1000 / (30 * playbackSpeed) // Assuming ~30fps original

      reviewIntervalRef.current = setInterval(() => {
        setCurrentFrameIndex(prev => {
          const next = prev + 1
          if (next >= frames.length) {
            // Loop back to start
            if (reviewIntervalRef.current) {
              clearInterval(reviewIntervalRef.current)
              reviewIntervalRef.current = null
            }
            setIsReviewPlaying(false)
            return 0
          }
          drawFrameAtIndex(next)
          return next
        })
      }, frameInterval)
    }
  }, [isReviewPlaying, playbackSpeed, frames.length, drawFrameAtIndex])

  // Step frame forward
  const stepForward = useCallback(() => {
    const nextIndex = Math.min(currentFrameIndex + 1, frames.length - 1)
    drawFrameAtIndex(nextIndex)
  }, [currentFrameIndex, frames.length, drawFrameAtIndex])

  // Step frame backward
  const stepBackward = useCallback(() => {
    const prevIndex = Math.max(currentFrameIndex - 1, 0)
    drawFrameAtIndex(prevIndex)
  }, [currentFrameIndex, drawFrameAtIndex])

  // Jump forward 10 frames
  const jumpForward = useCallback(() => {
    const nextIndex = Math.min(currentFrameIndex + 10, frames.length - 1)
    drawFrameAtIndex(nextIndex)
  }, [currentFrameIndex, frames.length, drawFrameAtIndex])

  // Jump backward 10 frames
  const jumpBackward = useCallback(() => {
    const prevIndex = Math.max(currentFrameIndex - 10, 0)
    drawFrameAtIndex(prevIndex)
  }, [currentFrameIndex, drawFrameAtIndex])

  // Change playback speed
  const cyclePlaybackSpeed = useCallback(() => {
    setPlaybackSpeed(prev => {
      if (prev === 1) return 0.5
      if (prev === 0.5) return 0.25
      return 1
    })
  }, [])

  // Exit review mode
  const exitReviewMode = useCallback(() => {
    if (reviewIntervalRef.current) {
      clearInterval(reviewIntervalRef.current)
    }
    setIsReviewMode(false)
    setIsReviewPlaying(false)
    setCurrentFrameIndex(0)
  }, [])

  // Cleanup review interval on unmount
  useEffect(() => {
    return () => {
      if (reviewIntervalRef.current) {
        clearInterval(reviewIntervalRef.current)
      }
    }
  }, [])

  // Redraw when edit state changes for visual feedback
  useEffect(() => {
    if (isReviewMode && isEditMode && frames.length > 0 && draggingLandmark === null) {
      drawFrameAtIndex(currentFrameIndex)
    }
  }, [hoveredLandmark, isEditMode, isReviewMode, frames.length, currentFrameIndex, draggingLandmark, drawFrameAtIndex])

  // Landmark names for display
  const landmarkNames: Record<number, string> = {
    [POSE_LANDMARKS.NOSE]: text(locale, 'Näsa', 'Nose'),
    [POSE_LANDMARKS.LEFT_SHOULDER]: text(locale, 'Vänster axel', 'Left shoulder'),
    [POSE_LANDMARKS.RIGHT_SHOULDER]: text(locale, 'Höger axel', 'Right shoulder'),
    [POSE_LANDMARKS.LEFT_ELBOW]: text(locale, 'Vänster armbåge', 'Left elbow'),
    [POSE_LANDMARKS.RIGHT_ELBOW]: text(locale, 'Höger armbåge', 'Right elbow'),
    [POSE_LANDMARKS.LEFT_WRIST]: text(locale, 'Vänster handled', 'Left wrist'),
    [POSE_LANDMARKS.RIGHT_WRIST]: text(locale, 'Höger handled', 'Right wrist'),
    [POSE_LANDMARKS.LEFT_HIP]: text(locale, 'Vänster höft', 'Left hip'),
    [POSE_LANDMARKS.RIGHT_HIP]: text(locale, 'Höger höft', 'Right hip'),
    [POSE_LANDMARKS.LEFT_KNEE]: text(locale, 'Vänster knä', 'Left knee'),
    [POSE_LANDMARKS.RIGHT_KNEE]: text(locale, 'Höger knä', 'Right knee'),
    [POSE_LANDMARKS.LEFT_ANKLE]: text(locale, 'Vänster fotled', 'Left ankle'),
    [POSE_LANDMARKS.RIGHT_ANKLE]: text(locale, 'Höger fotled', 'Right ankle'),
    [POSE_LANDMARKS.LEFT_HEEL]: text(locale, 'Vänster häl', 'Left heel'),
    [POSE_LANDMARKS.RIGHT_HEEL]: text(locale, 'Höger häl', 'Right heel'),
    [POSE_LANDMARKS.LEFT_FOOT_INDEX]: text(locale, 'Vänster tå', 'Left toe'),
    [POSE_LANDMARKS.RIGHT_FOOT_INDEX]: text(locale, 'Höger tå', 'Right toe'),
  }

  // Find landmark at position (hit detection)
  const findLandmarkAtPosition = useCallback((clientX: number, clientY: number): number | null => {
    const canvas = canvasRef.current
    if (!canvas || currentFrameIndex >= frames.length) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY

    const frame = frames[currentFrameIndex]
    if (!frame) return null

    const hitRadius = 15 // pixels

    // Check important landmarks (the ones we use for angles)
    const importantLandmarks = [
      POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER,
      POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.RIGHT_ELBOW,
      POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.RIGHT_WRIST,
      POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
      POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.RIGHT_KNEE,
      POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE,
      POSE_LANDMARKS.LEFT_HEEL, POSE_LANDMARKS.RIGHT_HEEL,
      POSE_LANDMARKS.LEFT_FOOT_INDEX, POSE_LANDMARKS.RIGHT_FOOT_INDEX,
    ]

    for (const idx of importantLandmarks) {
      const lm = frame.landmarks[idx]
      if (!lm || (lm.visibility && lm.visibility < 0.3)) continue

      const lmX = lm.x * canvas.width
      const lmY = lm.y * canvas.height
      const distance = Math.sqrt((x - lmX) ** 2 + (y - lmY) ** 2)

      if (distance < hitRadius) {
        return idx
      }
    }

    return null
  }, [frames, currentFrameIndex])

  // Handle mouse down on canvas
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditMode || !isReviewMode) return

    const landmarkIdx = findLandmarkAtPosition(e.clientX, e.clientY)
    if (landmarkIdx !== null) {
      setDraggingLandmark(landmarkIdx)
      e.preventDefault()
    }
  }, [isEditMode, isReviewMode, findLandmarkAtPosition])

  // Handle mouse move on canvas
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isReviewMode) return

    const canvas = canvasRef.current
    if (!canvas) return

    // Update hovered landmark for cursor feedback
    if (isEditMode && draggingLandmark === null) {
      const landmarkIdx = findLandmarkAtPosition(e.clientX, e.clientY)
      setHoveredLandmark(landmarkIdx)
    }

    // Handle dragging
    if (draggingLandmark !== null && currentFrameIndex < frames.length) {
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = (e.clientX - rect.left) * scaleX / canvas.width
      const y = (e.clientY - rect.top) * scaleY / canvas.height

      // Clamp to canvas bounds
      const clampedX = Math.max(0, Math.min(1, x))
      const clampedY = Math.max(0, Math.min(1, y))

      // Update the landmark position
      setFrames(prevFrames => {
        const newFrames = [...prevFrames]
        const frame = { ...newFrames[currentFrameIndex] }
        const landmarks = [...frame.landmarks]
        landmarks[draggingLandmark] = {
          ...landmarks[draggingLandmark],
          x: clampedX,
          y: clampedY,
        }
        frame.landmarks = landmarks
        newFrames[currentFrameIndex] = frame
        return newFrames
      })

      // Also update framesRef
      const frame = { ...framesRef.current[currentFrameIndex] }
      const landmarks = [...frame.landmarks]
      landmarks[draggingLandmark] = {
        ...landmarks[draggingLandmark],
        x: clampedX,
        y: clampedY,
      }
      frame.landmarks = landmarks
      framesRef.current[currentFrameIndex] = frame

      // Redraw
      drawFrameAtIndex(currentFrameIndex)
      setHasEdits(true)
    }
  }, [isReviewMode, isEditMode, draggingLandmark, currentFrameIndex, frames.length, findLandmarkAtPosition, drawFrameAtIndex])

  // Handle mouse up
  const handleCanvasMouseUp = useCallback(() => {
    if (draggingLandmark !== null) {
      // Recalculate angles after edit (using detected camera angle)
      if (currentFrameIndex < frames.length) {
        const angles = calculateJointAngles(frames[currentFrameIndex].landmarks, videoType, detectedCameraAngle)
        setCurrentAngles(angles)
      }
      setDraggingLandmark(null)
    }
  }, [draggingLandmark, currentFrameIndex, frames, calculateJointAngles, videoType, detectedCameraAngle])

  // Handle mouse leave
  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredLandmark(null)
    if (draggingLandmark !== null) {
      setDraggingLandmark(null)
    }
  }, [draggingLandmark])

  const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'critical': return 'bg-red-100 text-red-800'
    }
  }

  const getStatusIcon = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good': return <CheckCircle2 className="h-3 w-3" />
      case 'warning': return <AlertTriangle className="h-3 w-3" />
      case 'critical': return <AlertTriangle className="h-3 w-3" />
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            {text(locale, 'Pose-analys', 'Pose analysis')}
          </CardTitle>
          <CardDescription>
            {text(locale, 'MediaPipe BlazePose - Skelettspårning i realtid', 'MediaPipe BlazePose - real-time skeleton tracking')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Scan className="h-4 w-4 text-blue-600" />
                {text(locale, '1. Starta', '1. Start')}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{text(locale, 'Skannar videon och ritar skelettspår.', 'Scans the video and draws skeleton tracking.')}</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Eye className="h-4 w-4 text-blue-600" />
                {text(locale, '2. Granska', '2. Review')}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{text(locale, 'Spela frame för frame och justera punkter vid behov.', 'Play frame by frame and adjust points when needed.')}</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Save className="h-4 w-4 text-blue-600" />
                {text(locale, '3. Spara', '3. Save')}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{text(locale, 'Sparas på videon och visas under resultat.', 'Saved on the video and shown under results.')}</p>
            </div>
          </div>

          {hasSavedPoseData && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">{text(locale, 'Poseanalys är sparad', 'Pose analysis is saved')}</span>
              {savedFrameCount ? <span>{savedFrameCount} frames</span> : null}
              {poseSavedAt ? <span>{poseSavedAt}</span> : null}
            </div>
          )}

          {/* Video and Canvas overlay */}
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', maxHeight: '50vh' }}>
            <video
              ref={videoRef}
              src={blobUrl || videoUrl}
              crossOrigin="anonymous"
              preload="auto"
              className={isAnalyzing || isReviewMode ? 'hidden' : 'w-full h-full object-contain'}
              playsInline
              muted
              onLoadedData={() => setVideoReady(true)}
              onError={() => {
                console.error('Video failed to load:', blobUrl || videoUrl)
                setVideoError(true)
                // If blob URL failed, try direct URL
                if (blobUrl && blobUrl !== videoUrl) {
                  setBlobUrl(videoUrl)
                  setVideoError(false)
                }
              }}
              onEnded={() => {
                setIsPlaying(false)
                if (framesRef.current.length > 0) {
                  setIsAnalysisComplete(true)
                }
              }}
            />
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className={`w-full h-full object-contain ${!isAnalyzing && !isReviewMode ? 'hidden' : ''}`}
              style={{ cursor: isEditMode && hoveredLandmark !== null ? 'grab' : isEditMode ? 'crosshair' : 'default' }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseLeave}
            />

            {videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center text-white">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
                  <p>{text(locale, 'Kunde inte ladda videon', 'Could not load the video')}</p>
                  <p className="text-sm text-gray-400 mt-1">{text(locale, 'Kontrollera att videon fortfarande finns tillgänglig', 'Check that the video is still available')}</p>
                </div>
              </div>
            )}

            {!videoError && (!poseLoaded || !blobUrl || !videoReady) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center text-white">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>
                    {!blobUrl
                      ? text(locale, 'Laddar video...', 'Loading video...')
                      : !videoReady
                        ? text(locale, 'Buffrar video...', 'Buffering video...')
                        : text(locale, 'Laddar posemodell...', 'Loading pose model...')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Progress */}
          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{text(locale, 'Analyserar video...', 'Analyzing video...')}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            {!isAnalyzing && !isAnalysisComplete ? (
              <Button
                onClick={startAnalysis}
                disabled={!poseLoaded || !videoReady || videoError}
                className="flex-1"
              >
                {poseLoaded && videoReady ? (
                  <>
                    <Scan className="h-4 w-4 mr-2" />
                    {text(locale, 'Starta poseanalys', 'Start pose analysis')}
                  </>
                ) : (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {text(locale, 'Laddar...', 'Loading...')}
                  </>
                )}
              </Button>
            ) : isAnalysisComplete ? (
              <>
                {!isReviewMode ? (
                  <>
                    <Button
                      onClick={saveAnalysis}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {text(locale, 'Sparar...', 'Saving...')}
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {hasSavedPoseData ? text(locale, 'Uppdatera poseanalys', 'Update pose analysis') : text(locale, 'Spara poseanalys', 'Save pose analysis')}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={startReviewMode}
                      disabled={isSaving || frames.length === 0}
                      title={text(locale, 'Granska analysen', 'Review analysis')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={resetAnalysis}
                      disabled={isSaving}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  // Review mode controls
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Frame {currentFrameIndex + 1} / {frames.length}</span>
                      <span>{frames[currentFrameIndex]?.timestamp.toFixed(2)}s</span>
                    </div>
                    {/* Frame slider */}
                    <input
                      type="range"
                      min={0}
                      max={frames.length - 1}
                      value={currentFrameIndex}
                      onChange={(e) => drawFrameAtIndex(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex gap-2 items-center justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={jumpBackward}
                        disabled={currentFrameIndex === 0}
                        title={text(locale, 'Hoppa tillbaka 10 frames', 'Jump back 10 frames')}
                      >
                        <Rewind className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={stepBackward}
                        disabled={currentFrameIndex === 0}
                        title={text(locale, 'Föregående frame', 'Previous frame')}
                      >
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={toggleReviewPlayback}
                        className="min-w-[80px]"
                      >
                        {isReviewPlaying ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            {text(locale, 'Paus', 'Pause')}
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            {text(locale, 'Spela', 'Play')}
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={stepForward}
                        disabled={currentFrameIndex === frames.length - 1}
                        title={text(locale, 'Nästa frame', 'Next frame')}
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={jumpForward}
                        disabled={currentFrameIndex === frames.length - 1}
                        title={text(locale, 'Hoppa framåt 10 frames', 'Jump forward 10 frames')}
                      >
                        <FastForward className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2 items-center justify-center flex-wrap">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={cyclePlaybackSpeed}
                        className="min-w-[70px]"
                        title={text(locale, 'Byt uppspelningshastighet', 'Change playback speed')}
                      >
                        {playbackSpeed}x
                      </Button>
                      <Button
                        variant={isEditMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setIsEditMode(!isEditMode)
                          // Redraw to show/hide edit indicators
                          if (frames.length > 0) {
                            drawFrameAtIndex(currentFrameIndex)
                          }
                        }}
                        title={isEditMode ? text(locale, 'Avsluta redigeringsläge', 'Exit edit mode') : text(locale, 'Redigera landmärken', 'Edit landmarks')}
                        className={isEditMode ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                      >
                        {isEditMode ? <MousePointer className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditMode(false)
                          exitReviewMode()
                        }}
                      >
                        {text(locale, 'Avsluta granskning', 'Exit review')}
                      </Button>
                    </div>
                    {/* Edit mode indicator */}
                    {isEditMode && (
                      <div className="text-center text-xs">
                        <span className="text-yellow-600 font-medium">
                          {text(locale, 'Redigeringsläge aktivt', 'Edit mode active')}
                        </span>
                        {hoveredLandmark !== null && (
                          <span className="ml-2 text-blue-600">
                            {landmarkNames[hoveredLandmark] || text(locale, `Punkt ${hoveredLandmark}`, `Point ${hoveredLandmark}`)}
                          </span>
                        )}
                        {hasEdits && (
                          <span className="ml-2 text-green-600">
                            {text(locale, '(ändringar sparade i sessionen)', '(changes saved in the session)')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={togglePlayback}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetAnalysis}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Joint angles display */}
          {currentAngles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">{text(locale, 'Ledvinklar i realtid', 'Real-time joint angles')}</h4>
              <div className="grid grid-cols-2 gap-2">
                {currentAngles.map((angle, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted"
                  >
                    <span className="text-sm">{angle.name}</span>
                    <Badge className={getStatusColor(angle.status)}>
                      {getStatusIcon(angle.status)}
                      <span className="ml-1">{angle.angle}°</span>
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Min/Max angle summary - shown after some frames are analyzed */}
              {angleRanges.size > 0 && frames.length > 10 && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium text-sm">{text(locale, 'Vinkelintervall (min/max)', 'Angle range (min/max)')}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from(angleRanges.values()).map((range, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-lg bg-muted/50 border"
                      >
                        <div className="text-sm font-medium">{range.name}</div>
                        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                          <span>Min: <span className="font-mono font-bold text-blue-600">{range.min}°</span></span>
                          <span>Max: <span className="font-mono font-bold text-orange-600">{range.max}°</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Frame count, camera angle, and AI analysis button */}
          {frames.length > 0 && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{text(locale, 'Analyserade frames', 'Analyzed frames')}: {frames.length}</span>
                {detectedCameraAngle !== 'UNKNOWN' && (
                  <Badge variant="outline" className={detectedCameraAngle === 'SAGITTAL' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}>
                    {detectedCameraAngle === 'SAGITTAL' ? text(locale, 'Sidovy', 'Side view') : text(locale, 'Fram-/Bakvy', 'Front/back view')}
                  </Badge>
                )}
              </div>
              {currentAngles.length > 0 && !isPlaying && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={analyzeWithGemini}
                  disabled={isAnalyzingWithAI}
                  className="gap-2"
                >
                  {isAnalyzingWithAI ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {text(locale, 'Analyserar med AI...', 'Analyzing with AI...')}
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4" />
                      {text(locale, 'Analysera med Gemini', 'Analyze with Gemini')}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="space-y-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <p>{error}</p>
              <AiAllowanceBlockedAction action={aiAllowanceAction} tone="red" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Pose Analysis Results */}
      {aiPoseAnalysis && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-purple-600" />
              {text(locale, 'Gemini AI-analys av posedata', 'Gemini AI analysis of pose data')}
              <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                Gemini
              </Badge>
            </CardTitle>
            {aiPoseAnalysis.score !== undefined && (
              <CardDescription className="flex items-center gap-2">
                <span>{text(locale, 'AI-poäng:', 'AI score:')}</span>
                <span className={`font-bold ${aiPoseAnalysis.score >= 70 ? 'text-green-600' : aiPoseAnalysis.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {aiPoseAnalysis.score}%
                </span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Interpretation */}
            <div className="p-3 bg-white rounded-lg border">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                {text(locale, 'Tolkning', 'Interpretation')}
              </h4>
              <p className="text-sm text-muted-foreground">{aiPoseAnalysis.interpretation}</p>
            </div>

            {/* Technical Feedback */}
            {aiPoseAnalysis.technicalFeedback.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{text(locale, 'Teknisk feedback', 'Technical feedback')}</h4>
                {aiPoseAnalysis.technicalFeedback.map((fb, i) => (
                  <div key={i} className="p-3 bg-white rounded-lg border">
                    <div className="font-medium text-sm text-purple-700">{fb.area}</div>
                    <p className="text-sm mt-1"><strong>{text(locale, 'Observation:', 'Observation:')}</strong> {fb.observation}</p>
                    <p className="text-sm text-orange-600"><strong>{text(locale, 'Påverkan:', 'Impact:')}</strong> {fb.impact}</p>
                    <p className="text-sm text-green-600"><strong>{text(locale, 'Förslag:', 'Suggestion:')}</strong> {fb.suggestion}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Patterns */}
            {aiPoseAnalysis.patterns.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{text(locale, 'Identifierade mönster', 'Identified patterns')}</h4>
                <div className="grid gap-2">
                  {aiPoseAnalysis.patterns.map((p, i) => (
                    <div key={i} className="p-2 bg-white rounded-lg border flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-sm font-medium">{p.pattern}</span>
                        <p className="text-xs text-muted-foreground">{p.significance}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {aiPoseAnalysis.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{text(locale, 'Rekommendationer', 'Recommendations')}</h4>
                {aiPoseAnalysis.recommendations
                  .sort((a, b) => a.priority - b.priority)
                  .map((rec, i) => (
                    <div key={i} className="p-3 bg-white rounded-lg border">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          #{rec.priority}
                        </Badge>
                        <span className="font-medium text-sm">{rec.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                      {rec.exercises.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {rec.exercises.map((ex, j) => (
                            <Badge key={j} variant="secondary" className="text-xs">
                              {ex}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* Overall Assessment */}
            <div className="p-3 bg-purple-100 rounded-lg border border-purple-200">
              <h4 className="text-sm font-medium mb-1 text-purple-800">{text(locale, 'Sammanfattning', 'Summary')}</h4>
              <p className="text-sm text-purple-700">{aiPoseAnalysis.overallAssessment}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Note: FormFeedbackPanel removed - redundant with Gemini AI pose analysis above */}
    </div>
  )
}
