'use client'

import { useEffect, useMemo } from 'react'
import { usePageContextOptional } from '@/components/ai-studio/PageContextProvider'
import type { PageContext } from '@/components/ai-studio/FloatingAIChat'
import type { CoachOperatorAIContext } from '@/lib/coach/proactive-operator'

export interface CoachDashboardAIContextData {
  locale: 'en' | 'sv'
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

function contextText(locale: CoachDashboardAIContextData['locale'], en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export function CoachDashboardAIContext({ data }: CoachDashboardAIContextProps) {
  const pageContextApi = usePageContextOptional()
  const setPageContext = pageContextApi?.setPageContext

  const pageContext = useMemo<PageContext>(() => ({
    type: 'coach-dashboard',
    title: 'Coach Dashboard',
    summary:
      contextText(
        data.locale,
        `Current coach dashboard for ${data.businessName}. Mode: ${data.mode}. Includes aggregated prioritization signals without personally identifying athlete data.`,
        `Aktuell coachdashboard för ${data.businessName}. Läge: ${data.mode}. Innehåller aggregerade signaler för prioritering, utan individidentifierande atletdata.`
      ),
    conceptKeys: ['readiness', 'tss', 'acwr', 'coachAlerts'],
    data: { dashboard: data },
  }), [data])

  useEffect(() => {
    setPageContext?.(pageContext)
  }, [pageContext, setPageContext])

  return null
}
