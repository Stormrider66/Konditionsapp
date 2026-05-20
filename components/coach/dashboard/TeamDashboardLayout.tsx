'use client'

import { CoachAIAssistantPanel } from '@/components/coach/CoachAIAssistantPanel'
import { CoachOperatorBrief } from '@/components/coach/dashboard/CoachOperatorBrief'
import { CoachQuickActions } from '@/components/coach/dashboard/CoachQuickActions'
import { TeamRosterGrid } from '@/components/coach/dashboard/TeamRosterGrid'
import { TodayTimeline } from '@/components/coach/dashboard/TodayTimeline'
import { TeamQuickAccess } from '@/components/coach/dashboard/TeamQuickAccess'
import { TeamPulsePanel } from '@/components/coach/dashboard/TeamPulsePanel'
import { TeamTestsAndActivity } from '@/components/coach/dashboard/TeamTestsAndActivity'
import type { CoachOperatorBriefData } from '@/lib/coach/proactive-operator'

export interface TeamDashboardData {
  teams: Array<{
    id: string
    name: string
    sportType: string | null
    members: Array<{
      id: string
      name: string
      email: string | null
      jerseyNumber: number | null
      position: string | null
    }>
    athleteCount: number
    sessionsToday: number
    readiness: { high: number; medium: number; low: number; total: number }
    injuryCount: number
    unreadMessageCount: number
    missedWorkoutCount: number
    attentionCount: number
  }>
  upcomingTests: Array<{
    id: string
    teamId: string
    teamName: string
    title: string
    startDate: string
    type: string
  }>
  recentActivity: Array<{
    id: string
    teamName: string
    title: string
    assignedDate: string
    completed: number
    total: number
  }>
}

interface TeamDashboardLayoutProps {
  basePath: string
  pendingFeedbackCount: number
  readinessDistribution: {
    high: number
    medium: number
    low: number
    total: number
  }
  teamDashboardData?: TeamDashboardData
  operatorBriefData?: CoachOperatorBriefData
  visible?: Set<string>
  orderMap?: Map<string, number>
}

export function TeamDashboardLayout({
  basePath,
  pendingFeedbackCount,
  readinessDistribution,
  teamDashboardData,
  operatorBriefData,
  visible,
  orderMap,
}: TeamDashboardLayoutProps) {
  const isVisible = (key: string) => (visible ? visible.has(key) : true)
  const orderOf = (key: string) => orderMap?.get(key) ?? 9999
  const sortByOrder = <T extends { key: string }>(items: T[]) =>
    [...items].sort((a, b) => orderOf(a.key) - orderOf(b.key))

  const leftWidgets = sortByOrder([
    {
      key: 'team-quick-access',
      node: <TeamQuickAccess basePath={basePath} teams={teamDashboardData?.teams ?? []} />,
    },
    {
      key: 'today-timeline',
      node: <TodayTimeline basePath={basePath} readinessDistribution={readinessDistribution} />,
    },
    {
      key: 'team-tests-activity',
      node: (
        <TeamTestsAndActivity
          basePath={basePath}
          upcomingTests={teamDashboardData?.upcomingTests ?? []}
          recentActivity={teamDashboardData?.recentActivity ?? []}
        />
      ),
    },
    ...(operatorBriefData
      ? [
          {
            key: 'coach-operator-brief',
            node: <CoachOperatorBrief data={operatorBriefData} />,
          },
        ]
      : []),
  ])

  const rightWidgets = sortByOrder([
    {
      key: 'coach-quick-actions',
      node: (
        <CoachQuickActions
          mode="TEAM"
          basePath={basePath}
          pendingFeedbackCount={pendingFeedbackCount}
          teams={teamDashboardData?.teams ?? []}
        />
      ),
    },
    {
      key: 'team-pulse-panel',
      node: (
        <TeamPulsePanel
          basePath={basePath}
          teams={teamDashboardData?.teams ?? []}
          readinessDistribution={readinessDistribution}
          pendingFeedbackCount={pendingFeedbackCount}
        />
      ),
    },
    { key: 'team-roster-grid', node: <TeamRosterGrid basePath={basePath} compact /> },
    { key: 'coach-ai-assistant', node: <CoachAIAssistantPanel basePath={basePath} /> },
  ])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left — Timeline (60%) */}
      <div className="lg:col-span-3 space-y-6">
        {leftWidgets
          .filter(w => w.key === 'coach-operator-brief' || isVisible(w.key))
          .map(w => <div key={w.key}>{w.node}</div>)}
      </div>

      {/* Right — Roster + Actions + AI (40%) */}
      <div className="lg:col-span-2 space-y-6">
        {rightWidgets.filter(w => isVisible(w.key)).map(w => <div key={w.key}>{w.node}</div>)}
      </div>
    </div>
  )
}
