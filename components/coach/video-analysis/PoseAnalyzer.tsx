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
// FormFeedbackPanel removed - redundant with Gemini AI pose analysis

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

interface AngleRange {
  name: string
  current: number
  min: number
  max: number
  status: 'good' | 'warning' | 'critical'
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

// Calculate shin angle (tibia angle relative to vertical - 0° is vertical)
function calculateShinAngle(knee: PoseLandmark, ankle: PoseLandmark): number {
  const dx = knee.x - ankle.x
  const dy = knee.y - ankle.y
  // Angle from vertical (y-axis)
  const radians = Math.atan2(Math.abs(dx), Math.abs(dy))
  return Math.abs(radians * 180 / Math.PI)
}

// Calculate ankle/foot angle (dorsiflexion angle)
function calculateAnkleAngle(knee: PoseLandmark, ankle: PoseLandmark, footIndex: PoseLandmark): number {
  return calculateAngle(knee, ankle, footIndex)
}

// Calculate trunk lean angle (torso angle relative to vertical - 0° is upright)
function calculateTrunkAngle(shoulder: PoseLandmark, hip: PoseLandmark): number {
  const dx = shoulder.x - hip.x
  const dy = shoulder.y - hip.y
  // Angle from vertical (y-axis pointing down in screen coords)
  // Positive = forward lean, negative = backward lean
  const radians = Math.atan2(dx, -dy) // negative dy because y increases downward
  return radians * 180 / Math.PI
}

// Calculate lateral trunk sway (for frontal view)
function calculateLateralTrunkSway(leftShoulder: PoseLandmark, rightShoulder: PoseLandmark, leftHip: PoseLandmark, rightHip: PoseLandmark): number {
  // Midpoint of shoulders vs midpoint of hips
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
  const hipMidX = (leftHip.x + rightHip.x) / 2
  // Sway = horizontal displacement as percentage of hip width
  const hipWidth = Math.abs(rightHip.x - leftHip.x)
  if (hipWidth < 0.01) return 0
  return ((shoulderMidX - hipMidX) / hipWidth) * 100
}

// Calculate hip drop (for frontal view - pelvic tilt in frontal plane)
function calculateHipDrop(leftHip: PoseLandmark, rightHip: PoseLandmark): number {
  // Difference in Y position between left and right hip
  // Positive = left hip dropped, Negative = right hip dropped
  const dy = (leftHip.y - rightHip.y)
  const dx = Math.abs(rightHip.x - leftHip.x)
  if (dx < 0.01) return 0
  const radians = Math.atan2(dy, dx)
  return radians * 180 / Math.PI
}

// Calculate knee valgus/varus (for frontal view)
function calculateKneeAlignment(hip: PoseLandmark, knee: PoseLandmark, ankle: PoseLandmark): number {
  // Horizontal alignment: positive = valgus (knee in), negative = varus (knee out)
  // Compare knee X position relative to line from hip to ankle
  const expectedKneeX = hip.x + (ankle.x - hip.x) * ((knee.y - hip.y) / (ankle.y - hip.y + 0.001))
  return (knee.x - expectedKneeX) * 1000 // Scale to meaningful number
}

// Detect camera viewing angle based on landmark positions
type CameraAngle = 'SAGITTAL' | 'FRONTAL' | 'UNKNOWN'

function detectCameraAngle(landmarks: PoseLandmark[]): CameraAngle {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 'UNKNOWN'

  // Calculate horizontal distance between left and right shoulders
  const shoulderXDistance = Math.abs(rightShoulder.x - leftShoulder.x)
  const hipXDistance = Math.abs(rightHip.x - leftHip.x)

  // If we can see significant width between shoulders/hips, we're viewing from front/back
  // Typical values: frontal view ~0.15-0.3, sagittal view ~0.02-0.08
  const avgWidthVisible = (shoulderXDistance + hipXDistance) / 2

  if (avgWidthVisible > 0.12) {
    return 'FRONTAL' // Behind or front view
  } else if (avgWidthVisible < 0.08) {
    return 'SAGITTAL' // Side view
  }
  return 'UNKNOWN' // Ambiguous angle
}

export function PoseAnalyzer({
  videoUrl,
  videoType,
  exerciseName,
  exerciseNameSv,
  aiAnalysis,
  onAnalysisComplete,
  onAIPoseAnalysis,
  isSaving = false,
}: PoseAnalyzerProps) {
  const { toast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [poseLoaded, setPoseLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  // Calculate joint angles based on video type AND camera angle
  const calculateJointAngles = useCallback((landmarks: PoseLandmark[], type: string, cameraAngle: CameraAngle): JointAngle[] => {
    const angles: JointAngle[] = []

    if (type === 'RUNNING_GAIT') {
      // CAMERA ANGLE SPECIFIC CALCULATIONS FOR RUNNING
      if (cameraAngle === 'FRONTAL') {
        // ============================================
        // FRONTAL VIEW (Behind/Front) - Different angles!
        // Can measure: hip drop, knee valgus, lateral sway, foot alignment
        // CANNOT accurately measure: trunk forward lean, hip flexion/extension, knee lift
        // ============================================

        // Hip drop / Pelvic tilt (frontal plane)
        const hipDrop = calculateHipDrop(
          landmarks[POSE_LANDMARKS.LEFT_HIP],
          landmarks[POSE_LANDMARKS.RIGHT_HIP]
        )
        angles.push({
          name: 'Bäckentippning (sidovinkel)',
          angle: Math.round(Math.abs(hipDrop)),
          status: evaluateAngle(Math.abs(hipDrop), 0, 8), // 0-8° is acceptable
        })

        // Lateral trunk sway
        const trunkSway = calculateLateralTrunkSway(
          landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
          landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
          landmarks[POSE_LANDMARKS.LEFT_HIP],
          landmarks[POSE_LANDMARKS.RIGHT_HIP]
        )
        angles.push({
          name: 'Överkroppssväng (sidled)',
          angle: Math.round(Math.abs(trunkSway)),
          status: evaluateAngle(Math.abs(trunkSway), 0, 15), // Low sway is better
        })

        // Knee valgus/varus (left)
        const leftKneeAlignment = calculateKneeAlignment(
          landmarks[POSE_LANDMARKS.LEFT_HIP],
          landmarks[POSE_LANDMARKS.LEFT_KNEE],
          landmarks[POSE_LANDMARKS.LEFT_ANKLE]
        )
        angles.push({
          name: 'Knästabilitet vänster',
          angle: Math.round(Math.abs(leftKneeAlignment)),
          status: evaluateAngle(Math.abs(leftKneeAlignment), 0, 30), // Near 0 is good
        })

        // Knee valgus/varus (right)
        const rightKneeAlignment = calculateKneeAlignment(
          landmarks[POSE_LANDMARKS.RIGHT_HIP],
          landmarks[POSE_LANDMARKS.RIGHT_KNEE],
          landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
        )
        angles.push({
          name: 'Knästabilitet höger',
          angle: Math.round(Math.abs(rightKneeAlignment)),
          status: evaluateAngle(Math.abs(rightKneeAlignment), 0, 30),
        })

        // Shoulder symmetry (arm swing in frontal plane - crossing body)
        const shoulderWidth = Math.abs(landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].x - landmarks[POSE_LANDMARKS.LEFT_SHOULDER].x)
        const leftArmCross = Math.abs(landmarks[POSE_LANDMARKS.LEFT_WRIST].x - landmarks[POSE_LANDMARKS.LEFT_SHOULDER].x) / (shoulderWidth + 0.01) * 100
        const rightArmCross = Math.abs(landmarks[POSE_LANDMARKS.RIGHT_WRIST].x - landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].x) / (shoulderWidth + 0.01) * 100

        angles.push({
          name: 'Armkorsning vänster',
          angle: Math.round(leftArmCross),
          status: evaluateAngle(leftArmCross, 0, 50), // Arms should stay near body
        })
        angles.push({
          name: 'Armkorsning höger',
          angle: Math.round(rightArmCross),
          status: evaluateAngle(rightArmCross, 0, 50),
        })

        // Elbow angles (still relevant from behind)
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
        angles.push({
          name: 'Armbågsvinkel vänster',
          angle: Math.round(leftElbowAngle),
          status: evaluateAngle(leftElbowAngle, 70, 120),
        })
        angles.push({
          name: 'Armbågsvinkel höger',
          angle: Math.round(rightElbowAngle),
          status: evaluateAngle(rightElbowAngle, 70, 120),
        })

      } else {
        // ============================================
        // SAGITTAL VIEW (Side) - Standard running angles
        // Can measure: trunk forward lean, hip flexion/extension, knee lift, foot strike
        // ============================================

        // Knee angles (knee lift/flexion during swing)
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

        // Hip angles (hip flexion/extension)
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
        angles.push({
          name: 'Höftvinkel vänster',
          angle: Math.round(leftHipAngle),
          status: evaluateAngle(leftHipAngle, 140, 180),
        })
        angles.push({
          name: 'Höftvinkel höger',
          angle: Math.round(rightHipAngle),
          status: evaluateAngle(rightHipAngle, 140, 180),
        })

        // Foot/Ankle angles (dorsiflexion)
        const leftAnkleAngle = calculateAnkleAngle(
          landmarks[POSE_LANDMARKS.LEFT_KNEE],
          landmarks[POSE_LANDMARKS.LEFT_ANKLE],
          landmarks[POSE_LANDMARKS.LEFT_FOOT_INDEX]
        )
        const rightAnkleAngle = calculateAnkleAngle(
          landmarks[POSE_LANDMARKS.RIGHT_KNEE],
          landmarks[POSE_LANDMARKS.RIGHT_ANKLE],
          landmarks[POSE_LANDMARKS.RIGHT_FOOT_INDEX]
        )
        angles.push({
          name: 'Fotvinkel vänster',
          angle: Math.round(leftAnkleAngle),
          status: evaluateAngle(leftAnkleAngle, 80, 130),
        })
        angles.push({
          name: 'Fotvinkel höger',
          angle: Math.round(rightAnkleAngle),
          status: evaluateAngle(rightAnkleAngle, 80, 130),
        })

        // Trunk lean (forward lean from vertical)
        const leftTrunkAngle = calculateTrunkAngle(
          landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
          landmarks[POSE_LANDMARKS.LEFT_HIP]
        )
        const rightTrunkAngle = calculateTrunkAngle(
          landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
          landmarks[POSE_LANDMARKS.RIGHT_HIP]
        )
        const trunkAngle = (leftTrunkAngle + rightTrunkAngle) / 2
        angles.push({
          name: 'Bålvinkel (framåtlutning)',
          angle: Math.round(Math.abs(trunkAngle)),
          status: evaluateAngle(Math.abs(trunkAngle), 5, 20),
        })

        // Arm swing angles
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
        angles.push({
          name: 'Armsving vänster',
          angle: Math.round(leftElbowAngle),
          status: evaluateAngle(leftElbowAngle, 70, 110),
        })
        angles.push({
          name: 'Armsving höger',
          angle: Math.round(rightElbowAngle),
          status: evaluateAngle(rightElbowAngle, 70, 110),
        })
      }
    } else if (type === 'STRENGTH') {
      // Strength exercises - camera angle less critical but still relevant
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
      const leftShinAngle = calculateShinAngle(
        landmarks[POSE_LANDMARKS.LEFT_KNEE],
        landmarks[POSE_LANDMARKS.LEFT_ANKLE]
      )
      const rightShinAngle = calculateShinAngle(
        landmarks[POSE_LANDMARKS.RIGHT_KNEE],
        landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
      )
      const leftAnkleAngle = calculateAnkleAngle(
        landmarks[POSE_LANDMARKS.LEFT_KNEE],
        landmarks[POSE_LANDMARKS.LEFT_ANKLE],
        landmarks[POSE_LANDMARKS.LEFT_FOOT_INDEX]
      )
      const rightAnkleAngle = calculateAnkleAngle(
        landmarks[POSE_LANDMARKS.RIGHT_KNEE],
        landmarks[POSE_LANDMARKS.RIGHT_ANKLE],
        landmarks[POSE_LANDMARKS.RIGHT_FOOT_INDEX]
      )

      angles.push({
        name: 'Vänster knä',
        angle: Math.round(leftKneeAngle),
        status: evaluateAngle(leftKneeAngle, 80, 170),
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
      angles.push({
        name: 'Vänster skenben',
        angle: Math.round(leftShinAngle),
        status: evaluateAngle(leftShinAngle, 5, 35),
      })
      angles.push({
        name: 'Höger skenben',
        angle: Math.round(rightShinAngle),
        status: evaluateAngle(rightShinAngle, 5, 35),
      })
      angles.push({
        name: 'Vänster fotled',
        angle: Math.round(leftAnkleAngle),
        status: evaluateAngle(leftAnkleAngle, 70, 130),
      })
      angles.push({
        name: 'Höger fotled',
        angle: Math.round(rightAnkleAngle),
        status: evaluateAngle(rightAnkleAngle, 70, 130),
      })
    } else {
      // Sport-specific (general)
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
        setError('Kunde inte ladda poseanalys. Försök igen.')
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
  }, [videoType, calculateJointAngles, drawLandmarks])

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
      setError('Posemodellen kunde inte bearbeta videon. Kontrollera att videon är tillgänglig.')
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
      const editNote = hasEdits ? ' (med manuella korrigeringar)' : ''
      const summary = `Analyserade ${frames.length} frames. ${goodCount}/${currentAngles.length} ledvinklar inom optimalt intervall.${editNote}`
      onAnalysisComplete({ frames, angles: currentAngles, summary })
    } else if (frames.length === 0) {
      toast({
        title: 'Ingen data att spara',
        description: 'Kör analysen först för att få data att spara.',
        variant: 'destructive',
      })
    }
  }

  // Analyze pose data with Gemini AI
  const analyzeWithGemini = async () => {
    if (currentAngles.length === 0) {
      toast({
        title: 'Ingen data',
        description: 'Kör poseanalysen först för att få data att analysera.',
        variant: 'destructive',
      })
      return
    }

    setIsAnalyzingWithAI(true)
    setAiPoseAnalysis(null)

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
        throw new Error(data.error || 'AI-analysen misslyckades')
      }

      setAiPoseAnalysis(data.analysis)

      // Notify parent about the AI analysis for page context
      if (onAIPoseAnalysis) {
        onAIPoseAnalysis(data.analysis)
      }

      toast({
        title: 'AI-analys klar',
        description: `Gemini har analyserat ${currentAngles.length} ledvinklar från ${frames.length} frames.`,
      })
    } catch (err) {
      console.error('Gemini analysis error:', err)
      toast({
        title: 'Analysfel',
        description: err instanceof Error ? err.message : 'Kunde inte analysera med AI',
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
    [POSE_LANDMARKS.NOSE]: 'Näsa',
    [POSE_LANDMARKS.LEFT_SHOULDER]: 'Vänster axel',
    [POSE_LANDMARKS.RIGHT_SHOULDER]: 'Höger axel',
    [POSE_LANDMARKS.LEFT_ELBOW]: 'Vänster armbåge',
    [POSE_LANDMARKS.RIGHT_ELBOW]: 'Höger armbåge',
    [POSE_LANDMARKS.LEFT_WRIST]: 'Vänster handled',
    [POSE_LANDMARKS.RIGHT_WRIST]: 'Höger handled',
    [POSE_LANDMARKS.LEFT_HIP]: 'Vänster höft',
    [POSE_LANDMARKS.RIGHT_HIP]: 'Höger höft',
    [POSE_LANDMARKS.LEFT_KNEE]: 'Vänster knä',
    [POSE_LANDMARKS.RIGHT_KNEE]: 'Höger knä',
    [POSE_LANDMARKS.LEFT_ANKLE]: 'Vänster fotled',
    [POSE_LANDMARKS.RIGHT_ANKLE]: 'Höger fotled',
    [POSE_LANDMARKS.LEFT_HEEL]: 'Vänster häl',
    [POSE_LANDMARKS.RIGHT_HEEL]: 'Höger häl',
    [POSE_LANDMARKS.LEFT_FOOT_INDEX]: 'Vänster tå',
    [POSE_LANDMARKS.RIGHT_FOOT_INDEX]: 'Höger tå',
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
            Pose-analys
          </CardTitle>
          <CardDescription>
            MediaPipe BlazePose - Skelettspårning i realtid
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                  <p>Kunde inte ladda videon</p>
                  <p className="text-sm text-gray-400 mt-1">Kontrollera att videon fortfarande finns tillgänglig</p>
                </div>
              </div>
            )}

            {!videoError && (!poseLoaded || !blobUrl || !videoReady) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center text-white">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>{!blobUrl ? 'Laddar video...' : !videoReady ? 'Buffrar video...' : 'Laddar posemodell...'}</p>
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
                disabled={!poseLoaded || !videoReady || videoError}
                className="flex-1"
              >
                {poseLoaded && videoReady ? (
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
                      onClick={startReviewMode}
                      disabled={isSaving || frames.length === 0}
                      title="Granska analysen"
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
                        title="Hoppa tillbaka 10 frames"
                      >
                        <Rewind className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={stepBackward}
                        disabled={currentFrameIndex === 0}
                        title="Föregående frame"
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
                            Paus
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Spela
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={stepForward}
                        disabled={currentFrameIndex === frames.length - 1}
                        title="Nästa frame"
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={jumpForward}
                        disabled={currentFrameIndex === frames.length - 1}
                        title="Hoppa framåt 10 frames"
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
                        title="Byt uppspelningshastighet"
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
                        title={isEditMode ? "Avsluta redigeringsläge" : "Redigera landmärken"}
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
                        Avsluta granskning
                      </Button>
                    </div>
                    {/* Edit mode indicator */}
                    {isEditMode && (
                      <div className="text-center text-xs">
                        <span className="text-yellow-600 font-medium">
                          Redigeringsläge aktivt
                        </span>
                        {hoveredLandmark !== null && (
                          <span className="ml-2 text-blue-600">
                            {landmarkNames[hoveredLandmark] || `Punkt ${hoveredLandmark}`}
                          </span>
                        )}
                        {hasEdits && (
                          <span className="ml-2 text-green-600">
                            (ändringar sparade i sessionen)
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

              {/* Min/Max angle summary - shown after some frames are analyzed */}
              {angleRanges.size > 0 && frames.length > 10 && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium text-sm">Vinkelintervall (min/max)</h4>
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
                <span>Analyserade frames: {frames.length}</span>
                {detectedCameraAngle !== 'UNKNOWN' && (
                  <Badge variant="outline" className={detectedCameraAngle === 'SAGITTAL' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}>
                    {detectedCameraAngle === 'SAGITTAL' ? '📐 Sidovy' : '👀 Fram-/Bakvy'}
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
                      Analyserar med AI...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4" />
                      Analysera med Gemini
                    </>
                  )}
                </Button>
              )}
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

      {/* AI Pose Analysis Results */}
      {aiPoseAnalysis && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-purple-600" />
              Gemini AI-analys av posedata
              <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                Gemini
              </Badge>
            </CardTitle>
            {aiPoseAnalysis.score !== undefined && (
              <CardDescription className="flex items-center gap-2">
                <span>AI-poäng:</span>
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
                Tolkning
              </h4>
              <p className="text-sm text-muted-foreground">{aiPoseAnalysis.interpretation}</p>
            </div>

            {/* Technical Feedback */}
            {aiPoseAnalysis.technicalFeedback.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Teknisk feedback</h4>
                {aiPoseAnalysis.technicalFeedback.map((fb, i) => (
                  <div key={i} className="p-3 bg-white rounded-lg border">
                    <div className="font-medium text-sm text-purple-700">{fb.area}</div>
                    <p className="text-sm mt-1"><strong>Observation:</strong> {fb.observation}</p>
                    <p className="text-sm text-orange-600"><strong>Påverkan:</strong> {fb.impact}</p>
                    <p className="text-sm text-green-600"><strong>Förslag:</strong> {fb.suggestion}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Patterns */}
            {aiPoseAnalysis.patterns.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Identifierade mönster</h4>
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
                <h4 className="text-sm font-medium">Rekommendationer</h4>
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
              <h4 className="text-sm font-medium mb-1 text-purple-800">Sammanfattning</h4>
              <p className="text-sm text-purple-700">{aiPoseAnalysis.overallAssessment}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Note: FormFeedbackPanel removed - redundant with Gemini AI pose analysis above */}
    </div>
  )
}
