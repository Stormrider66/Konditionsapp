// Pure pose-math utilities, types, and MediaPipe BlazePose landmark indices.
// Extracted from PoseAnalyzer.tsx in Phase 7i.

export const POSE_LANDMARKS = {
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

export interface JointAngle {
  name: string
  angle: number
  status: 'good' | 'warning' | 'critical'
}

export interface AngleRange {
  name: string
  current: number
  min: number
  max: number
  status: 'good' | 'warning' | 'critical'
}

// AI Analysis data from Gemini
export interface AIAnalysisData {
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

export type CameraAngle = 'SAGITTAL' | 'FRONTAL' | 'UNKNOWN'

// Calculate angle between three points
export function calculateAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs(radians * 180 / Math.PI)
  if (angle > 180) angle = 360 - angle
  return angle
}

// Evaluate angle against expected range
export function evaluateAngle(angle: number, min: number, max: number): 'good' | 'warning' | 'critical' {
  if (angle >= min && angle <= max) return 'good'
  const deviation = angle < min ? min - angle : angle - max
  if (deviation < 15) return 'warning'
  return 'critical'
}

// Calculate shin angle (tibia angle relative to vertical - 0° is vertical)
export function calculateShinAngle(knee: PoseLandmark, ankle: PoseLandmark): number {
  const dx = knee.x - ankle.x
  const dy = knee.y - ankle.y
  // Angle from vertical (y-axis)
  const radians = Math.atan2(Math.abs(dx), Math.abs(dy))
  return Math.abs(radians * 180 / Math.PI)
}

// Calculate ankle/foot angle (dorsiflexion angle)
export function calculateAnkleAngle(knee: PoseLandmark, ankle: PoseLandmark, footIndex: PoseLandmark): number {
  return calculateAngle(knee, ankle, footIndex)
}

// Calculate trunk lean angle (torso angle relative to vertical - 0° is upright)
export function calculateTrunkAngle(shoulder: PoseLandmark, hip: PoseLandmark): number {
  const dx = shoulder.x - hip.x
  const dy = shoulder.y - hip.y
  // Angle from vertical (y-axis pointing down in screen coords)
  // Positive = forward lean, negative = backward lean
  const radians = Math.atan2(dx, -dy) // negative dy because y increases downward
  return radians * 180 / Math.PI
}

// Calculate lateral trunk sway (for frontal view)
export function calculateLateralTrunkSway(leftShoulder: PoseLandmark, rightShoulder: PoseLandmark, leftHip: PoseLandmark, rightHip: PoseLandmark): number {
  // Midpoint of shoulders vs midpoint of hips
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
  const hipMidX = (leftHip.x + rightHip.x) / 2
  // Sway = horizontal displacement as percentage of hip width
  const hipWidth = Math.abs(rightHip.x - leftHip.x)
  if (hipWidth < 0.01) return 0
  return ((shoulderMidX - hipMidX) / hipWidth) * 100
}

// Calculate hip drop (for frontal view - pelvic tilt in frontal plane)
export function calculateHipDrop(leftHip: PoseLandmark, rightHip: PoseLandmark): number {
  // Difference in Y position between left and right hip
  // Positive = left hip dropped, Negative = right hip dropped
  const dy = (leftHip.y - rightHip.y)
  const dx = Math.abs(rightHip.x - leftHip.x)
  if (dx < 0.01) return 0
  const radians = Math.atan2(dy, dx)
  return radians * 180 / Math.PI
}

// Calculate knee valgus/varus (for frontal view)
export function calculateKneeAlignment(hip: PoseLandmark, knee: PoseLandmark, ankle: PoseLandmark): number {
  // Horizontal alignment: positive = valgus (knee in), negative = varus (knee out)
  // Compare knee X position relative to line from hip to ankle
  const expectedKneeX = hip.x + (ankle.x - hip.x) * ((knee.y - hip.y) / (ankle.y - hip.y + 0.001))
  return (knee.x - expectedKneeX) * 1000 // Scale to meaningful number
}

// Detect camera viewing angle based on landmark positions

export function detectCameraAngle(landmarks: PoseLandmark[]): CameraAngle {
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
