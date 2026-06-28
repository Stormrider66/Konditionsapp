'use client'

/**
 * Coach AI Assistant Panel
 *
 * Dashboard panel showing AI-generated alerts for athletes needing attention.
 * Displays readiness drops, missed check-ins, missed workouts, pain mentions, and high ACWR.
 */

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  DashboardCard,
  DashboardCardContent,
  DashboardCardDescription,
  DashboardCardHeader,
  DashboardCardTitle,
} from '@/components/coach/dashboard/DashboardCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Bot,
  AlertTriangle,
  TrendingDown,
  Calendar,
  MessageSquare,
  Activity,
  Bluetooth,
  RefreshCw,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { AthleteAttentionCard } from './AthleteAttentionCard'
import { useLocale } from 'next-intl'

type AppLocale = 'en' | 'sv'

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

interface CoachAlert {
  id: string
  coachId: string
  clientId: string
  alertType: string
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

const QUICK_ERG_ALERT_TYPES = new Set([
  'QUICK_ERG_NEW_SESSION',
  'QUICK_ERG_PERSONAL_BEST',
  'QUICK_ERG_HIGH_LOAD',
  'QUICK_ERG_UNMATCHED_PLAN',
])

function isQuickErgAlertType(alertType: string): boolean {
  return QUICK_ERG_ALERT_TYPES.has(alertType)
}

interface CoachAIAssistantPanelProps {
  basePath?: string
}

export function CoachAIAssistantPanel({ basePath }: CoachAIAssistantPanelProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const [activeTab, setActiveTab] = useState('all')
  const businessSlug = basePath?.split('/').filter(Boolean)[0]
  const alertsUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (businessSlug) params.set('businessSlug', businessSlug)
    const query = params.toString()
    return query ? `/api/coach/alerts?${query}` : '/api/coach/alerts'
  }, [businessSlug])

  const { data, error, isLoading, mutate } = useSWR<AlertsResponse>(
    alertsUrl,
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
      await mutate()
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
      await mutate()
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
      await mutate()
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  // Filter alerts by type
  const alerts = data?.alerts || []
  const filteredAlerts =
    activeTab === 'all'
      ? alerts
      : activeTab === 'QUICK_ERG'
        ? alerts.filter((a) => isQuickErgAlertType(a.alertType))
      : alerts.filter((a) => a.alertType === activeTab)

  const criticalCount = data?.summary?.bySeverity?.CRITICAL || 0
  const highCount = data?.summary?.bySeverity?.HIGH || 0
  const totalActive = alerts.length

  return (
    <DashboardCard className="h-full">
      <DashboardCardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <DashboardCardTitle className="text-lg flex items-center gap-2">
                {copy(locale, 'AI Assistant', 'AI Assistent')}
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
              </DashboardCardTitle>
              <DashboardCardDescription>{copy(locale, 'Athletes who need attention', 'Atleter som behöver uppmärksamhet')}</DashboardCardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void mutate()}
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
      </DashboardCardHeader>

      <DashboardCardContent className="pt-0">
        {error ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p>{copy(locale, 'Could not load alerts', 'Kunde inte ladda alerts')}</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
            <p className="font-medium">{copy(locale, 'No active alerts', 'Inga aktiva alerts')}</p>
            <p className="text-sm mt-1">{copy(locale, 'All athletes look good right now', 'Alla atleter ser bra ut just nu')}</p>
          </div>
        ) : (
          <>
            {/* Filter tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-3">
              <TooltipProvider delayDuration={300}>
                <TabsList className="w-full grid grid-cols-7 h-8 bg-muted/50 dark:bg-slate-900/50">
                  <TabsTrigger value="all" className="text-xs px-1">
                    {copy(locale, 'All', 'Alla')}
                  </TabsTrigger>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger value="READINESS_DROP" className="text-xs px-1">
                        <TrendingDown className="h-3 w-3" />
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent>{copy(locale, 'Readiness drop', 'Beredskapsfall')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger value="MISSED_CHECKINS" className="text-xs px-1">
                        <Calendar className="h-3 w-3" />
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent>{copy(locale, 'Missed check-ins', 'Missade check-ins')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger value="MISSED_WORKOUTS" className="text-xs px-1">
                        <Activity className="h-3 w-3" />
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent>{copy(locale, 'Missed workouts', 'Missade pass')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger value="PAIN_MENTION" className="text-xs px-1">
                        <MessageSquare className="h-3 w-3" />
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent>{copy(locale, 'Pain reports', 'Smärtrapporter')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger value="HIGH_ACWR" className="text-xs px-1">
                        <AlertTriangle className="h-3 w-3" />
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent>{copy(locale, 'High load', 'Hög belastning')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger value="QUICK_ERG" className="text-xs px-1">
                        <Bluetooth className="h-3 w-3" />
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent>{copy(locale, 'Quick Erg', 'Quick Erg')}</TooltipContent>
                  </Tooltip>
                </TabsList>
              </TooltipProvider>
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
                    {copy(locale, 'No alerts of this type', 'Inga alerts av denna typ')}
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </DashboardCardContent>
    </DashboardCard>
  )
}
