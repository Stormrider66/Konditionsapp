// lib/coach/assessment-feed.ts
//
// Shared types for the unified test/assessment timeline (Phase 1 of the
// athlete-profile IA redesign). One chronological feed across all five test
// models: endurance Test, HockeyPhysicalTest, SportTest, ErgometerFieldTest,
// and CustomTestResult. Imported by both the API route and the client component.

export type AssessmentKind =
  | 'ENDURANCE'
  | 'HOCKEY_PHYSICAL'
  | 'SPORT_TEST'
  | 'ERGOMETER'
  | 'CUSTOM'

export interface AssessmentEntry {
  id: string
  /** ISO date string. */
  date: string
  kind: AssessmentKind
  /** Human, already-localized label (test type / protocol / sport). */
  label: string
  /** One-line key-metric summary, or null when there's nothing to show. */
  summary: string | null
  /** True when this row is tied to a team (team test) rather than an individual. */
  isTeamTest: boolean
  /** Lifecycle status — only ENDURANCE rows have one (null for other kinds). */
  status: 'COMPLETED' | 'DRAFT' | 'ARCHIVED' | null
  /** Quality review status — only ENDURANCE rows use the Phase 1 review gate. */
  qualityReviewStatus?: 'CLEAR' | 'REVIEW_REQUIRED' | 'APPROVED' | null
  qualityWarningCount?: number
}

export interface AssessmentCounts {
  endurance: number
  hockey: number
  sport: number
  ergometer: number
  custom: number
  reviewRequired: number
  total: number
}

export interface AssessmentFeedResponse {
  success: boolean
  data: AssessmentEntry[]
  counts: AssessmentCounts
}

/** Maps a {@link AssessmentKind} to its count bucket key. */
export const ASSESSMENT_COUNT_KEY: Record<AssessmentKind, keyof Omit<AssessmentCounts, 'total'>> = {
  ENDURANCE: 'endurance',
  HOCKEY_PHYSICAL: 'hockey',
  SPORT_TEST: 'sport',
  ERGOMETER: 'ergometer',
  CUSTOM: 'custom',
}
