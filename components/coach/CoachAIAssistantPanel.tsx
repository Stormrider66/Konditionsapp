'use client'

/**
 * Coach AI Assistant Panel
 *
 * Dashboard panel showing AI-generated alerts for athletes needing attention.
 * Displays readiness drops, missed check-ins, missed workouts, pain mentions, and high ACWR.
 */

import { useState } from 'react'
import useSWR from 'swr'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Bot,
  AlertTriangle,
  TrendingDown,
  Calendar,
  MessageSquare,
  Activity,
  RefreshCw,
  Loader2,
  Bell,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'
import { AthleteAttentionCard } from './AthleteAttentionCard'

interface CoachAlert {
  id: string
  coachId: string
  clientId: string
  alertType: 'READINESS_DROP' | 'MISSED_CHECKINS' | 'MISSED_WORKOUTS' | 'PAIN_MENTION' | 'HIGH_ACWR'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  message: string
  contextData: Record<string, unknown>
  status: string
  createdAt: string
  client: {
    id: string
    name: string
    email?: string
    sportProfile?: {
      primarySport: string
    }
  }
}

interface AlertsResponse {
  alerts: CoachAlert[]
  summary: {
    total: number
    byType: Record<string, number>
    bySeverity: Record<string, number>
  }
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const alertTypeIcons: Record<string, React.ReactNode> = {
  READINESS_DROP: <TrendingDown className="h-4 w-4" />,
  MISSED_CHECKINS: <Calendar className="h-4 w-4" />,
  MISSED_WORKOUTS: <Activity className="h-4 w-4" />,
  PAIN_MENTION: <MessageSquare className="h-4 w-4" />,
  HIGH_ACWR: <AlertTriangle className="h-4 w-4" />,
}

const alertTypeLabels: Record<string, string> = {
  READINESS_DROP: 'Readiness',
  MISSED_CHECKINS: 'Check-ins',
  MISSED_WORKOUTS: 'Träning',
  PAIN_MENTION: 'Smärta',
  HIGH_ACWR: 'ACWR',
}

export function CoachAIAssistantPanel() {
  const [activeTab, setActiveTab] = useState('all')

  const { data, error, isLoading, mutate } = useSWR<AlertsResponse>(
    '/api/coach/alerts',
    fetcher,
    { refreshInterval: 60000 } // Refresh every minute
  )

  const handleDismiss = async (alertId: string) => {
    try {
      await fetch(`/api/coach/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      })
      mutate()
    } catch (error) {
      console.error('Error dismissing alert:', error)
    }
  }

  const handleAction = async (alertId: string, note?: string) => {
    try {
      await fetch(`/api/coach/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'action', note }),
      })
      mutate()
    } catch (error) {
      console.error('Error actioning alert:', error)
    }
  }

  const handleResolve = async (alertId: string) => {
    try {
      await fetch(`/api/coach/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve' }),
      })
      mutate()
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  // Filter alerts by type
  const alerts = data?.alerts || []
  const filteredAlerts =
    activeTab === 'all'
      ? alerts
      : alerts.filter((a) => a.alertType === activeTab)

  const criticalCount = data?.summary?.bySeverity?.CRITICAL || 0
  const highCount = data?.summary?.bySeverity?.HIGH || 0
  const totalActive = alerts.length

  return (
    <GlassCard className="h-full">
      <GlassCardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <GlassCardTitle className="text-lg flex items-center gap-2">
                AI Assistent
                {totalActive > 0 && (
                  <Badge
                    variant="secondary"
                    className={
                      criticalCount > 0
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                        : highCount > 0
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                    }
                  >
                    {totalActive}
                  </Badge>
                )}
              </GlassCardTitle>
              <GlassCardDescription>Atleter som behöver uppmärksamhet</GlassCardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => mutate()}
            disabled={isLoading}
            className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </GlassCardHeader>

      <GlassCardContent className="pt-0">
        {error ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p>Kunde inte ladda alerts</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
            <p className="font-medium">Inga aktiva alerts</p>
            <p className="text-sm mt-1">Alla atleter ser bra ut just nu</p>
          </div>
        ) : (
          <>
            {/* Filter tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-3">
              <TabsList className="w-full grid grid-cols-6 h-8 bg-muted/50 dark:bg-slate-900/50">
                <TabsTrigger value="all" className="text-xs px-1">
                  Alla
                </TabsTrigger>
                <TabsTrigger value="READINESS_DROP" className="text-xs px-1">
                  <TrendingDown className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="MISSED_CHECKINS" className="text-xs px-1">
                  <Calendar className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="MISSED_WORKOUTS" className="text-xs px-1">
                  <Activity className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="PAIN_MENTION" className="text-xs px-1">
                  <MessageSquare className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="HIGH_ACWR" className="text-xs px-1">
                  <AlertTriangle className="h-3 w-3" />
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Alert list */}
            <ScrollArea className="h-[400px] pr-3">
              <div className="space-y-3">
                {filteredAlerts.map((alert) => (
                  <AthleteAttentionCard
                    key={alert.id}
                    alert={alert}
                    onDismiss={() => handleDismiss(alert.id)}
                    onAction={() => handleAction(alert.id)}
                    onResolve={() => handleResolve(alert.id)}
                  />
                ))}
                {filteredAlerts.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Inga alerts av denna typ
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
