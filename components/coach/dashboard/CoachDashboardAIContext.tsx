'use client'

import { useEffect, useMemo } from 'react'
import { usePageContextOptional } from '@/components/ai-studio/PageContextProvider'
import type { PageContext } from '@/components/ai-studio/FloatingAIChat'
import type { CoachOperatorAIContext } from '@/lib/coach/proactive-operator'

export interface CoachDashboardAIContextData {
  mode: 'TEAM' | 'PT' | 'GYM'
  businessName: string
  metrics: {
    athletes: number
    activePrograms: number
    completedLogsThisWeek: number
    totalActivitiesThisWeek: number
    pendingFeedback: number
    activeInjuries: number
    highLoadAthletes: number
    feedbackGiven: number
    averageRpe: string
    recentTests: number
    upcomingEvents: number
  }
  readiness: {
    high: number
    medium: number
    low: number
    total: number
  }
  integrations: {
    stravaActivitiesThisWeek: number
    garminActivitiesThisWeek: number
  }
  gym?: {
    activeAssignments: number
    prsThisWeek: number
    plateauCount: number
  }
  team?: {
    teamCount: number
    teamsWithAttention: number
    totalMissedWorkouts: number
    totalUnreadMessages: number
    upcomingTests: number
    recentActivityItems: number
    teams: Array<{
      name: string
      athleteCount: number
      sessionsToday: number
      readiness: { high: number; medium: number; low: number; total: number }
      injuryCount: number
      unreadMessageCount: number
      missedWorkoutCount: number
      attentionCount: number
    }>
  }
  visibleWidgets: string[]
  signals: string[]
  operator?: CoachOperatorAIContext
}

interface CoachDashboardAIContextProps {
  data: CoachDashboardAIContextData
}

export function CoachDashboardAIContext({ data }: CoachDashboardAIContextProps) {
  const pageContextApi = usePageContextOptional()
  const setPageContext = pageContextApi?.setPageContext

  const pageContext = useMemo<PageContext>(() => ({
    type: 'coach-dashboard',
    title: 'Coach Dashboard',
    summary:
      `Aktuell coachdashboard for ${data.businessName}. ` +
      `Lage: ${data.mode}. ` +
      'Innehaller aggregerade signaler for prioritering, utan individidentifierande atletdata.',
    conceptKeys: ['readiness', 'tss', 'acwr', 'coachAlerts'],
    data: { dashboard: data },
  }), [data])

  useEffect(() => {
    setPageContext?.(pageContext)
  }, [pageContext, setPageContext])

  return null
}
