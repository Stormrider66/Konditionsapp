/**
 * Quadratic-bezier geometry for curved skating paths. The same helpers
 * drive the editor, the static rink renderers, and the Remotion animation,
 * so endpoints and midpoints must be exact.
 */

import { describe, expect, it } from 'vitest'
import {
  angleOnMovement,
  defaultControlPoint,
  isCurved,
  movementMidpoint,
  movementPathD,
  partialMovementPathD,
  pointOnMovement,
} from '@/remotion/drills/movement-path'

const straight = { fromX: 0, fromY: 0, toX: 100, toY: 0 }
const curved = { fromX: 0, fromY: 0, toX: 100, toY: 0, controlX: 50, controlY: 40 }

describe('movement geometry', () => {
  it('detects curves only when both control coordinates are set', () => {
    expect(isCurved(straight)).toBe(false)
    expect(isCurved(curved)).toBe(true)
    expect(isCurved({ ...straight, controlX: 50 })).toBe(false)
  })

  it('hits exact endpoints at t=0 and t=1 for both line and curve', () => {
    for (const m of [straight, curved]) {
      expect(pointOnMovement(m, 0)).toEqual({ x: 0, y: 0 })
      expect(pointOnMovement(m, 1)).toEqual({ x: 100, y: 0 })
    }
  })

  it('places the curve midpoint between the chord and the control point', () => {
    const mid = movementMidpoint(curved)
    // Quadratic bezier at t=0.5: 0.25·P0 + 0.5·P1 + 0.25·P2 → y = 20
    expect(mid).toEqual({ x: 50, y: 20 })
    expect(movementMidpoint(straight)).toEqual({ x: 50, y: 0 })
  })

  it('emits a Q path for curves and an L path for straight movements', () => {
    expect(movementPathD(straight)).toBe('M 0 0 L 100 0')
    expect(movementPathD(curved)).toBe('M 0 0 Q 50 40 100 0')
  })

  it('partial path at t=1 reaches the movement end', () => {
    expect(partialMovementPathD(curved, 1)).toContain('100 0')
    expect(partialMovementPathD(straight, 0.5)).toBe('M 0 0 L 50 0')
  })

  it('tangent angle follows the curve direction', () => {
    // At t=0 the curve heads toward the control point (up-right ≈ 38.7°)
    expect(angleOnMovement(curved, 0)).toBeCloseTo(Math.atan2(40, 50) * (180 / Math.PI), 5)
    // Straight movement: flat
    expect(angleOnMovement(straight, 0.5)).toBe(0)
  })

  it('default control point sits perpendicular to the midpoint', () => {
    const control = defaultControlPoint(straight)
    expect(control.x).toBe(50)
    expect(control.y).not.toBe(0) // offset off the line
  })
})
