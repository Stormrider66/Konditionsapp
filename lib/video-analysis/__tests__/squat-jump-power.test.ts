import { describe, expect, it } from 'vitest'
import { estimateMeanPowerFromJumpHeight, estimateSquatJumpPower } from '../squat-jump-power'
import type { PoseFrame, PoseLandmark } from '@/components/coach/video-analysis/pose-analyzer/utils'

function makeLandmarks(centerY: number, footY: number): PoseLandmark[] {
  const landmarks = Array.from({ length: 33 }, (): PoseLandmark => ({
    x: 0.5,
    y: centerY,
    z: 0,
    visibility: 0.95,
  }))

  landmarks[0] = { x: 0.5, y: centerY - 0.34, z: 0, visibility: 0.95 }
  landmarks[11] = { x: 0.49, y: centerY - 0.2, z: 0, visibility: 0.95 }
  landmarks[12] = { x: 0.51, y: centerY - 0.2, z: 0, visibility: 0.95 }
  landmarks[23] = { x: 0.49, y: centerY + 0.02, z: 0, visibility: 0.95 }
  landmarks[24] = { x: 0.51, y: centerY + 0.02, z: 0, visibility: 0.95 }
  landmarks[25] = { x: 0.49, y: centerY + 0.2, z: 0, visibility: 0.95 }
  landmarks[26] = { x: 0.51, y: centerY + 0.2, z: 0, visibility: 0.95 }

  for (const index of [27, 28, 29, 30, 31, 32]) {
    landmarks[index] = { x: 0.5, y: footY, z: 0, visibility: 0.95 }
  }

  return landmarks
}

function makeJumpFrames(): PoseFrame[] {
  const frames: PoseFrame[] = []

  for (let i = 0; i <= 36; i += 1) {
    const timestamp = i / 30
    const airborne = timestamp >= 0.5 && timestamp <= 0.9
    const bottom = Math.abs(timestamp - 0.34) < 0.04
    const centerY = bottom ? 0.58 : airborne ? 0.44 : 0.48
    frames.push({
      timestamp,
      landmarks: makeLandmarks(centerY, airborne ? 0.78 : 0.9),
    })
  }

  return frames
}

describe('estimateSquatJumpPower', () => {
  it('estimates jump metrics from the airborne phase', () => {
    const estimate = estimateSquatJumpPower({
      frames: makeJumpFrames(),
      bodyMassKg: 82,
      externalLoadKg: 20,
      athleteHeightCm: 184,
      cameraAngle: 'SAGITTAL',
    })

    expect(estimate.status).toBe('ready')
    expect(estimate.movement).toBe('LOADED_JUMP_SQUAT')
    expect(estimate.metrics?.flightTimeMs).toBeGreaterThan(380)
    expect(estimate.metrics?.jumpHeightCm).toBeGreaterThan(18)
    expect(estimate.metrics?.takeoffVelocityMps).toBeGreaterThan(1.8)
    expect(estimate.metrics?.estimatedMeanPowerW).toBeGreaterThan(1000)
    expect(estimate.metrics?.relativePeakPowerWPerKg).toBeGreaterThan(10)
    expect(estimate.phase.repetitionsDetected).toBe(1)
  })

  it('returns jump height but no watts when body mass is missing', () => {
    const estimate = estimateSquatJumpPower({
      frames: makeJumpFrames(),
      cameraAngle: 'SAGITTAL',
    })

    expect(estimate.status).toBe('ready')
    expect(estimate.metrics?.jumpHeightCm).toBeGreaterThan(18)
    expect(estimate.metrics?.estimatedMeanPowerW).toBeNull()
    expect(estimate.warnings.map((item) => item.code)).toContain('body_mass_missing')
  })

  it('keeps mean power in a realistic range for a 77 kg, 15 cm jump', () => {
    expect(Math.round(estimateMeanPowerFromJumpHeight(15.3, 77))).toBe(702)
    expect(Math.round(estimateMeanPowerFromJumpHeight(15.8, 77))).toBe(713)
  })

  it('refuses power metrics when no airborne phase is visible', () => {
    const frames = makeJumpFrames().map((frame) => ({
      ...frame,
      landmarks: makeLandmarks(0.5, 0.9),
    }))

    const estimate = estimateSquatJumpPower({
      frames,
      bodyMassKg: 82,
      cameraAngle: 'SAGITTAL',
    })

    expect(estimate.status).toBe('insufficient_data')
    expect(estimate.metrics).toBeNull()
    expect(estimate.warnings.map((item) => item.code)).toContain('no_airborne_phase')
  })
})
