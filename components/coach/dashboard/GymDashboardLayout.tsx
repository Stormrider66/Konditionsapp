'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { GymClientBoard } from '@/components/coach/dashboard/GymClientBoard'
import { StrengthPRFeed, type PRRecord } from '@/components/coach/dashboard/StrengthPRFeed'
import { BodyCompTrendsCard, type BodyCompSummary } from '@/components/coach/dashboard/BodyCompTrendsCard'
import { TodaysAppointmentsCard } from '@/components/coach/dashboard/TodaysAppointmentsCard'
import { CoachQuickActions } from '@/components/coach/dashboard/CoachQuickActions'
import { CoachAIAssistantPanel } from '@/components/coach/CoachAIAssistantPanel'
import type { GymClientStatus } from '@/components/coach/dashboard/GymClientCard'

interface GymDashboardData {
  clients: GymClientStatus[]
  recentPRs: PRRecord[]
  bodyCompSummary: BodyCompSummary[]
  stats: {
    activeAssignments: number
    prsThisWeek: number
    topPRExercise: string | null
    plateauCount: number
  }
}

interface GymDashboardLayoutProps {
  basePath: string
  pendingFeedbackCount: number
}

export function GymDashboardLayout({ basePath, pendingFeedbackCount }: GymDashboardLayoutProps) {
  const [data, setData] = useState<GymDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/coach/gym-dashboard')
      if (res.ok) {
        const json: GymDashboardData = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Failed to fetch gym dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      {/* GymClientBoard — full width centerpiece */}
      <GymClientBoard
        clients={data?.clients ?? []}
        basePath={basePath}
      />

      {/* Bottom Row: 2/3 + 1/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3) — Appointments + PR Feed + AI */}
        <div className="lg:col-span-2 space-y-6">
          <TodaysAppointmentsCard basePath={basePath} variant="default" />
          <StrengthPRFeed recentPRs={data?.recentPRs ?? []} />
          <CoachAIAssistantPanel />
        </div>

        {/* Right Column (1/3) — Quick Actions + Body Comp */}
        <div className="space-y-6">
          <CoachQuickActions
            mode="GYM"
            basePath={basePath}
            pendingFeedbackCount={pendingFeedbackCount}
          />
          <BodyCompTrendsCard bodyCompSummary={data?.bodyCompSummary ?? []} />
        </div>
      </div>
    </>
  )
}
