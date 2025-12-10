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
} from 'lucide-react'
import { FormFeedbackPanel } from './FormFeedbackPanel'

// BlazePose landmark indices
const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const

export interface PoseLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export interface PoseFrame {
  timestamp: number
  landmarks: PoseLandmark[]
}

interface JointAngle {
  name: string
  angle: number
  status: 'good' | 'warning' | 'critical'
}

interface PoseAnalyzerProps {
  videoUrl: string
  videoType: 'STRENGTH' | 'RUNNING_GAIT' | 'SPORT_SPECIFIC'
  exerciseName?: string
  exerciseNameSv?: string
  onAnalysisComplete?: (data: {
    frames: PoseFrame[]
    angles: JointAngle[]
    summary: string
  }) => void
  isSaving?: boolean
}

// Calculate angle between three points
function calculateAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs(radians * 180 / Math.PI)
  if (angle > 180) angle = 360 - angle
  return angle
}

// Evaluate angle against expected range
function evaluateAngle(angle: number, min: number, max: number): 'good' | 'warning' | 'critical' {
  if (angle >= min && angle <= max) return 'good'
  const deviation = angle < min ? min - angle : angle - max
  if (deviation < 15) return 'warning'
  return 'critical'
}

export function PoseAnalyzer({
  videoUrl,
  videoType,
  exerciseName,
  exerciseNameSv,
  onAnalysisComplete,
  isSaving = false,
}: PoseAnalyzerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [poseLoaded, setPoseLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [frames, setFrames] = useState<PoseFrame[]>([])
  const [currentAngles, setCurrentAngles] = useState<JointAngle[]>([])
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false)
  const poseRef = useRef<any>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Load MediaPipe Pose
  useEffect(() => {
    const loadPose = async () => {
      try {
        // Dynamic import for client-side only
        const { Pose } = await import('@mediapipe/pose')

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
            setFrames(prev => [...prev, { timestamp, landmarks }])

            // Calculate joint angles
            const angles = calculateJointAngles(landmarks, videoType)
            setCurrentAngles(angles)

            // Draw landmarks on canvas
            drawLandmarks(results.poseLandmarks, results.image)
          }
        })

        poseRef.current = pose
        setPoseLoaded(true)
      } catch (err) {
        console.error('Failed to load MediaPipe Pose:', err)
        setError('Kunde inte ladda poseanalys. Försök igen.')
      }
    }

    loadPose()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [videoType])

  // Calculate joint angles based on video type
  const calculateJointAngles = useCallback((landmarks: PoseLandmark[], type: string): JointAngle[] => {
    const angles: JointAngle[] = []

    // Common angles for all types
    // Knee angles
    const leftKneeAngle = calculateAngle(
      landmarks[POSE_LANDMARKS.LEFT_HIP],
      landmarks[POSE_LANDMARKS.LEFT_KNEE],
      landmarks[POSE_LANDMARKS.LEFT_ANKLE]
    )
    const rightKneeAngle = calculateAngle(
      landmarks[POSE_LANDMARKS.RIGHT_HIP],
      landmarks[POSE_LANDMARKS.RIGHT_KNEE],
      landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
    )

    // Hip angles
    const leftHipAngle = calculateAngle(
      landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
      landmarks[POSE_LANDMARKS.LEFT_HIP],
      landmarks[POSE_LANDMARKS.LEFT_KNEE]
    )
    const rightHipAngle = calculateAngle(
      landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
      landmarks[POSE_LANDMARKS.RIGHT_HIP],
      landmarks[POSE_LANDMARKS.RIGHT_KNEE]
    )

    // Elbow angles
    const leftElbowAngle = calculateAngle(
      landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
      landmarks[POSE_LANDMARKS.LEFT_ELBOW],
      landmarks[POSE_LANDMARKS.LEFT_WRIST]
    )
    const rightElbowAngle = calculateAngle(
      landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
      landmarks[POSE_LANDMARKS.RIGHT_ELBOW],
      landmarks[POSE_LANDMARKS.RIGHT_WRIST]
    )

    if (type === 'STRENGTH') {
      // Squat/deadlift specific ranges
      angles.push({
        name: 'Vänster knä',
        angle: Math.round(leftKneeAngle),
        status: evaluateAngle(leftKneeAngle, 80, 170), // Good squat depth
      })
      angles.push({
        name: 'Höger knä',
        angle: Math.round(rightKneeAngle),
        status: evaluateAngle(rightKneeAngle, 80, 170),
      })
      angles.push({
        name: 'Vänster höft',
        angle: Math.round(leftHipAngle),
        status: evaluateAngle(leftHipAngle, 70, 180),
      })
      angles.push({
        name: 'Höger höft',
        angle: Math.round(rightHipAngle),
        status: evaluateAngle(rightHipAngle, 70, 180),
      })
    } else if (type === 'RUNNING_GAIT') {
      // Running specific angles
      angles.push({
        name: 'Knälyft vänster',
        angle: Math.round(180 - leftKneeAngle),
        status: evaluateAngle(180 - leftKneeAngle, 30, 90),
      })
      angles.push({
        name: 'Knälyft höger',
        angle: Math.round(180 - rightKneeAngle),
        status: evaluateAngle(180 - rightKneeAngle, 30, 90),
      })
      angles.push({
        name: 'Armsving vänster',
        angle: Math.round(leftElbowAngle),
        status: evaluateAngle(leftElbowAngle, 70, 110), // ~90 degrees ideal
      })
      angles.push({
        name: 'Armsving höger',
        angle: Math.round(rightElbowAngle),
        status: evaluateAngle(rightElbowAngle, 70, 110),
      })
    } else {
      // Sport-specific (general)
      angles.push({
        name: 'Vänster knä',
        angle: Math.round(leftKneeAngle),
        status: evaluateAngle(leftKneeAngle, 60, 180),
      })
      angles.push({
        name: 'Höger knä',
        angle: Math.round(rightKneeAngle),
        status: evaluateAngle(rightKneeAngle, 60, 180),
      })
      angles.push({
        name: 'Vänster armbåge',
        angle: Math.round(leftElbowAngle),
        status: evaluateAngle(leftElbowAngle, 30, 180),
      })
      angles.push({
        name: 'Höger armbåge',
        angle: Math.round(rightElbowAngle),
        status: evaluateAngle(rightElbowAngle, 30, 180),
      })
    }

    return angles
  }, [])

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

  // Process video frame
  const processFrame = useCallback(async () => {
    const video = videoRef.current
    const pose = poseRef.current

    if (!video || !pose || video.paused || video.ended) {
      setIsPlaying(false)
      if (frames.length > 0) {
        setIsAnalysisComplete(true)
      }
      return
    }

    await pose.send({ image: video })
    setProgress((video.currentTime / video.duration) * 100)

    animationFrameRef.current = requestAnimationFrame(processFrame)
  }, [frames])

  // Save analysis
  const saveAnalysis = () => {
    if (frames.length > 0 && onAnalysisComplete) {
      const goodCount = currentAngles.filter(a => a.status === 'good').length
      const summary = `Analyserade ${frames.length} frames. ${goodCount}/${currentAngles.length} ledvinklar inom optimalt intervall.`
      onAnalysisComplete({ frames, angles: currentAngles, summary })
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
    setProgress(0)
    setCurrentAngles([])
    setIsAnalysisComplete(false)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }

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
            Pose-analys
          </CardTitle>
          <CardDescription>
            MediaPipe BlazePose - Skelettspårning i realtid
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Video and Canvas overlay */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              className={isAnalyzing ? 'hidden' : 'w-full h-full object-contain'}
              crossOrigin="anonymous"
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className={`w-full h-full object-contain ${!isAnalyzing ? 'hidden' : ''}`}
            />

            {!poseLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center text-white">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Laddar posemodell...</p>
                </div>
              </div>
            )}
          </div>

          {/* Progress */}
          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Analyserar video...</span>
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
                disabled={!poseLoaded}
                className="flex-1"
              >
                {poseLoaded ? (
                  <>
                    <Scan className="h-4 w-4 mr-2" />
                    Starta poseanalys
                  </>
                ) : (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Laddar...
                  </>
                )}
              </Button>
            ) : isAnalysisComplete ? (
              <>
                <Button
                  onClick={saveAnalysis}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sparar...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Spara poseanalys
                    </>
                  )}
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
              <h4 className="font-medium text-sm">Ledvinklar i realtid</h4>
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
            </div>
          )}

          {/* Frame count */}
          {frames.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Analyserade frames: {frames.length}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercise Form Feedback Panel */}
      {currentAngles.length > 0 && (
        <FormFeedbackPanel
          angles={currentAngles}
          videoType={videoType}
          exerciseName={exerciseName}
          exerciseNameSv={exerciseNameSv}
        />
      )}
    </div>
  )
}
