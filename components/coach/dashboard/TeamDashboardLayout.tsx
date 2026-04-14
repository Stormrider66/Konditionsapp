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
  visible?: Set<string>
  orderMap?: Map<string, number>
}

export function TeamDashboardLayout({
  basePath,
  pendingFeedbackCount,
  readinessDistribution,
  visible,
  orderMap,
}: TeamDashboardLayoutProps) {
  const isVisible = (key: string) => (visible ? visible.has(key) : true)
  const orderOf = (key: string) => orderMap?.get(key) ?? 9999
  const sortByOrder = <T extends { key: string }>(items: T[]) =>
    [...items].sort((a, b) => orderOf(a.key) - orderOf(b.key))

  const leftWidgets = sortByOrder([
    {
      key: 'today-timeline',
      node: <TodayTimeline basePath={basePath} readinessDistribution={readinessDistribution} />,
    },
  ])

  const rightWidgets = sortByOrder([
    {
      key: 'coach-quick-actions',
      node: (
        <CoachQuickActions
          mode="TEAM"
          basePath={basePath}
          pendingFeedbackCount={pendingFeedbackCount}
        />
      ),
    },
    { key: 'team-roster-grid', node: <TeamRosterGrid basePath={basePath} compact /> },
    { key: 'coach-ai-assistant', node: <CoachAIAssistantPanel /> },
  ])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left — Timeline (60%) */}
      <div className="lg:col-span-3 space-y-6">
        {leftWidgets.filter(w => isVisible(w.key)).map(w => <div key={w.key}>{w.node}</div>)}
      </div>

      {/* Right — Roster + Actions + AI (40%) */}
      <div className="lg:col-span-2 space-y-6">
        {rightWidgets.filter(w => isVisible(w.key)).map(w => <div key={w.key}>{w.node}</div>)}
      </div>
    </div>
  )
}
