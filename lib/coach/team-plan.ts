// lib/coach/team-plan.ts
//
// Shared types for surfacing the athlete's TEAM plan on their individual coach
// profile (Phase: team-plan inheritance). Read-only — the team plan is shown as
// the player's planning context, not copied into an AthletePlan (which would
// drift out of sync when the coach edits the team plan).

export interface TeamPlanBlockLite {
  title: string
  focus: string | null
  startDate: string
  endDate: string
  order: number
}

export interface TeamPlanContext {
  id: string
  name: string
  teamName: string
  startDate: string
  endDate: string
  blockCount: number
  /** The block covering "now" (or the next upcoming one), if any. */
  currentBlock: TeamPlanBlockLite | null
}

export interface TeamPlanResponse {
  success: boolean
  teamPlan: TeamPlanContext | null
}
