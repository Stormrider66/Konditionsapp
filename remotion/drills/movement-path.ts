/**
 * Shared geometry helpers for drill movements.
 *
 * A movement is a straight line from (fromX, fromY) to (toX, toY) unless it
 * has a control point (controlX, controlY), in which case it follows a
 * quadratic bezier curve — used for realistic curved skating paths.
 */

export interface MovementGeometry {
  fromX: number
  fromY: number
  toX: number
  toY: number
  controlX?: number
  controlY?: number
}

export function isCurved(m: MovementGeometry): boolean {
  return typeof m.controlX === 'number' && typeof m.controlY === 'number'
}

/** SVG path `d` for the full movement (line or quadratic bezier). */
export function movementPathD(m: MovementGeometry): string {
  if (isCurved(m)) {
    return `M ${m.fromX} ${m.fromY} Q ${m.controlX} ${m.controlY} ${m.toX} ${m.toY}`
  }
  return `M ${m.fromX} ${m.fromY} L ${m.toX} ${m.toY}`
}

/** Point along the movement at t ∈ [0, 1]. */
export function pointOnMovement(m: MovementGeometry, t: number): { x: number; y: number } {
  if (isCurved(m)) {
    const u = 1 - t
    return {
      x: u * u * m.fromX + 2 * u * t * (m.controlX as number) + t * t * m.toX,
      y: u * u * m.fromY + 2 * u * t * (m.controlY as number) + t * t * m.toY,
    }
  }
  return {
    x: m.fromX + (m.toX - m.fromX) * t,
    y: m.fromY + (m.toY - m.fromY) * t,
  }
}

/** Visual midpoint of the movement (used for phase badges). */
export function movementMidpoint(m: MovementGeometry): { x: number; y: number } {
  return pointOnMovement(m, 0.5)
}

/** Direction of travel (degrees) at t ∈ [0, 1]. */
export function angleOnMovement(m: MovementGeometry, t: number): number {
  let dx: number
  let dy: number
  if (isCurved(m)) {
    // Derivative of the quadratic bezier: 2(1-t)(P1-P0) + 2t(P2-P1)
    const u = 1 - t
    dx = 2 * u * ((m.controlX as number) - m.fromX) + 2 * t * (m.toX - (m.controlX as number))
    dy = 2 * u * ((m.controlY as number) - m.fromY) + 2 * t * (m.toY - (m.controlY as number))
  } else {
    dx = m.toX - m.fromX
    dy = m.toY - m.fromY
  }
  return Math.atan2(dy, dx) * (180 / Math.PI)
}

/**
 * SVG path `d` for the part of the movement from 0 to t (De Casteljau split
 * for curves). Used to "draw" the path progressively during animation.
 */
export function partialMovementPathD(m: MovementGeometry, t: number): string {
  if (isCurved(m)) {
    // Split control point: lerp(P0, P1, t); split end point: point on curve at t
    const ax = m.fromX + ((m.controlX as number) - m.fromX) * t
    const ay = m.fromY + ((m.controlY as number) - m.fromY) * t
    const p = pointOnMovement(m, t)
    return `M ${m.fromX} ${m.fromY} Q ${ax} ${ay} ${p.x} ${p.y}`
  }
  const p = pointOnMovement(m, t)
  return `M ${m.fromX} ${m.fromY} L ${p.x} ${p.y}`
}

/**
 * Default control point for turning a straight movement into a curve:
 * offset perpendicular from the midpoint, proportional to the length.
 */
export function defaultControlPoint(m: MovementGeometry): { x: number; y: number } {
  const dx = m.toX - m.fromX
  const dy = m.toY - m.fromY
  const len = Math.hypot(dx, dy) || 1
  const offset = Math.min(Math.max(len * 0.25, 6), 18)
  return {
    x: (m.fromX + m.toX) / 2 - (dy / len) * offset,
    y: (m.fromY + m.toY) / 2 + (dx / len) * offset,
  }
}
