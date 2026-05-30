/**
 * Pure, prisma-free derivation of a roster member's status-dot level for the
 * Idag cockpit rail. Kept dependency-free so the client rail can import it
 * without pulling server-only code into the bundle.
 *
 * Blend policy (decided 2026-05-30): medical status is the base; readiness and
 * ACWR only ever DOWNGRADE a dot to amber/red. A player with no flags and no
 * readiness/load data stays green ("no news is fine") — we never surface an
 * "unknown" state. Precedence: red > amber > green.
 */

export type RosterDotLevel = 'red' | 'amber' | 'green'

export interface RosterDotInput {
  activeInjuryCount: number
  activeRestrictionCount: number
  /** Latest DailyMetrics.readinessLevel, or null when never checked in. */
  readinessLevel: string | null
  /** Latest TrainingLoad.acwrZone, or null when no load history. */
  acwrZone: string | null
}

const RED_READINESS = new Set(['POOR', 'VERY_POOR'])
const RED_ACWR = new Set(['DANGER', 'CRITICAL'])

/** ACWR zones serious enough for the attention strip's "hög ACWR" chip. */
export function isHighAcwr(zone: string | null): boolean {
  return zone != null && RED_ACWR.has(zone)
}

export function rosterDotLevel(member: RosterDotInput): RosterDotLevel {
  const readiness = member.readinessLevel
  const acwr = member.acwrZone

  if (
    member.activeInjuryCount > 0 ||
    (readiness != null && RED_READINESS.has(readiness)) ||
    isHighAcwr(acwr)
  ) {
    return 'red'
  }

  if (
    member.activeRestrictionCount > 0 ||
    readiness === 'FAIR' ||
    acwr === 'CAUTION'
  ) {
    return 'amber'
  }

  return 'green'
}
