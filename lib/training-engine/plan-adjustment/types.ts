/**
 * Types for the readiness → plan feedback loop.
 *
 * This module formalises the "given current readiness/ACWR/pain
 * signals, what should we do with the athlete's next scheduled
 * session?" question. It is intentionally a pure recommendation
 * layer — the returned decision describes what the coach (or a
 * future auto-apply job) SHOULD do, but this module never mutates
 * the database itself.
 */

/**
 * The set of actions we can recommend for an athlete's next
 * scheduled session. Ordered from least to most disruptive so
 * severity comparisons work naturally.
 */
export type AdjustmentAction =
  | 'PROCEED'          // No change. Athlete is fresh; run the session as planned.
  | 'REDUCE_VOLUME'    // Keep the session type and intensity, drop sets/reps/duration ~20%.
  | 'REDUCE_INTENSITY' // Keep the session type, drop zones/loads a notch.
  | 'SWAP_TO_EASY'     // Replace with an easy / recovery version of the same modality.
  | 'DEFER_ONE_DAY'    // Push the session's assignedDate by +1 day.
  | 'SKIP'             // Mark as SKIPPED and rest today.

/**
 * Machine-readable severity of the decision. Mirrors the zone
 * language used by the ACWR monitor so downstream UIs can share
 * colour schemes.
 */
export type AdjustmentSeverity = 'INFO' | 'CAUTION' | 'WARNING' | 'CRITICAL'

/**
 * Inputs to the decision engine. Everything is optional so callers
 * can pass whatever signals they have; the engine degrades
 * gracefully when data is missing (it defaults to PROCEED with a
 * low-confidence reason).
 */
export interface AdjustmentInputs {
  /** ACWR zone from TrainingLoad.acwrZone (OPTIMAL/CAUTION/DANGER/CRITICAL/DETRAINING). */
  acwrZone?: string | null
  /** Raw ACWR value for display. Not used by the rules directly. */
  acwrValue?: number | null
  /** 0–100 integer score from DailyCheckIn.readinessScore. */
  readinessScore?: number | null
  /** 'PROCEED' | 'REDUCE' | 'EASY' | 'REST' from DailyCheckIn.readinessDecision. */
  readinessDecision?: string | null
  /** Highest pain level (0–10) reported in the last ~24 hours, if any. */
  recentPainLevel?: number | null
}

/**
 * The decision returned by the engine. Contains both machine-readable
 * fields (for programmatic consumers like a future auto-adjust cron)
 * and human-readable fields (for UI and notes to write back to the
 * assignment if the coach chooses to apply the decision).
 */
export interface AdjustmentDecision {
  action: AdjustmentAction
  severity: AdjustmentSeverity
  /** Human-readable explanation in Swedish, suitable for coach UI. */
  reason: string
  /**
   * Machine-readable trigger tags that fired. Useful for analytics
   * and for testing which rule matched. Example: ['ACWR_DANGER'].
   */
  triggers: string[]
  /**
   * Short note suitable for writing to assignment.notes if the
   * coach applies the decision. Already includes the "why".
   */
  noteForAthlete: string
  /**
   * Confidence heuristic: true when the decision had enough signal
   * to make a real call, false when we defaulted to PROCEED due to
   * missing data.
   */
  hadSufficientSignal: boolean
}
