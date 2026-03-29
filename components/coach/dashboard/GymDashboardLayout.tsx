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
}

export function GymDashboardLayout({ basePath, pendingFeedbackCount }: GymDashboardLayoutProps) {
  return (
    <>
      {/* Row 1: Schedule + Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TodaysAppointmentsCard basePath={basePath} variant="default" />
        <GymClassesCard basePath={basePath} />
      </div>

      {/* Row 2: PT Clients + Todo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <GymClientListCard basePath={basePath} />
        <CoachTaskCard />
      </div>

      {/* Row 3: Social Media + Competitions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SocialMediaCard basePath={basePath} />
        <CompetitionCard basePath={basePath} />
      </div>

      {/* Row 4: PR Feed + Quick Actions + AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <StrengthPRFeed recentPRs={[]} />
          <CoachAIAssistantPanel />
        </div>
        <div className="space-y-6">
          <CoachQuickActions
            mode="GYM"
            basePath={basePath}
            pendingFeedbackCount={pendingFeedbackCount}
          />
        </div>
      </div>
    </>
  )
}
