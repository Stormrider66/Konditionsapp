'use client'

import { CoachAIAssistantPanel } from '@/components/coach/CoachAIAssistantPanel'
import { CoachQuickActions } from '@/components/coach/dashboard/CoachQuickActions'
import { TeamRosterGrid } from '@/components/coach/dashboard/TeamRosterGrid'
import { TodayTimeline } from '@/components/coach/dashboard/TodayTimeline'

interface TeamDashboardLayoutProps {
  basePath: string
  pendingFeedbackCount: number
  readinessDistribution: {
    high: number
    medium: number
    low: number
    total: number
  }
}

export function TeamDashboardLayout({
  basePath,
  pendingFeedbackCount,
  readinessDistribution,
}: TeamDashboardLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left — Timeline (60%) */}
      <div className="lg:col-span-3">
        <TodayTimeline
          basePath={basePath}
          readinessDistribution={readinessDistribution}
        />
      </div>

      {/* Right — Roster + Actions + AI (40%) */}
      <div className="lg:col-span-2 space-y-6">
        <CoachQuickActions
          mode="TEAM"
          basePath={basePath}
          pendingFeedbackCount={pendingFeedbackCount}
        />
        <TeamRosterGrid basePath={basePath} compact />
        <CoachAIAssistantPanel />
      </div>
    </div>
  )
}
