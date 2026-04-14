'use client'

import { TodaysAppointmentsCard } from '@/components/coach/dashboard/TodaysAppointmentsCard'
import { GymClassesCard } from '@/components/coach/dashboard/GymClassesCard'
import { GymClientListCard } from '@/components/coach/dashboard/GymClientListCard'
import { CoachTaskCard } from '@/components/coach/dashboard/CoachTaskCard'
import { SocialMediaCard } from '@/components/coach/dashboard/SocialMediaCard'
import { CompetitionCard } from '@/components/coach/dashboard/CompetitionCard'
import { StrengthPRFeed } from '@/components/coach/dashboard/StrengthPRFeed'
import { CoachQuickActions } from '@/components/coach/dashboard/CoachQuickActions'
import { CoachAIAssistantPanel } from '@/components/coach/CoachAIAssistantPanel'

interface GymDashboardLayoutProps {
  basePath: string
  pendingFeedbackCount: number
  visible?: Set<string>
  orderMap?: Map<string, number>
}

export function GymDashboardLayout({
  basePath,
  pendingFeedbackCount,
  visible,
  orderMap,
}: GymDashboardLayoutProps) {
  const isVisible = (key: string) => (visible ? visible.has(key) : true)
  const orderOf = (key: string) => orderMap?.get(key) ?? 9999
  const sortByOrder = <T extends { key: string }>(items: T[]) =>
    [...items].sort((a, b) => orderOf(a.key) - orderOf(b.key))

  // GYM dashboard widgets (rendered as a single ordered list in a 2-column grid).
  // The original 4-row pairing is preserved by default order in the registry.
  const widgets = sortByOrder([
    { key: 'todays-appointments', node: <TodaysAppointmentsCard basePath={basePath} variant="default" /> },
    { key: 'gym-classes', node: <GymClassesCard basePath={basePath} /> },
    { key: 'gym-client-list', node: <GymClientListCard basePath={basePath} /> },
    { key: 'coach-tasks', node: <CoachTaskCard /> },
    { key: 'social-media', node: <SocialMediaCard basePath={basePath} /> },
    { key: 'competitions', node: <CompetitionCard basePath={basePath} /> },
    { key: 'strength-pr-feed', node: <StrengthPRFeed recentPRs={[]} /> },
    { key: 'coach-ai-assistant', node: <CoachAIAssistantPanel /> },
  ]).filter(w => isVisible(w.key))

  const quickActions = isVisible('coach-quick-actions') ? (
    <CoachQuickActions
      mode="GYM"
      basePath={basePath}
      pendingFeedbackCount={pendingFeedbackCount}
    />
  ) : null

  return (
    <>
      {/* Pair widgets into 2-column rows preserving order */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {widgets.map(w => <div key={w.key}>{w.node}</div>)}
      </div>

      {/* Quick actions (kept in a separate row to preserve original sticky behavior) */}
      {quickActions && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-start-3">{quickActions}</div>
        </div>
      )}
    </>
  )
}
