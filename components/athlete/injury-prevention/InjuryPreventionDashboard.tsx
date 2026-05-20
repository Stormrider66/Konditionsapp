'use client'

/**
 * InjuryPreventionDashboard
 *
 * Main dashboard combining ACWR gauge, load trend, injury status, and recommendations.
 */

import { useEffect } from 'react'
import useSWR from 'swr'
import { Loader2, AlertCircle, Shield } from 'lucide-react'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { ACWRGauge } from './ACWRGauge'
import { LoadTrendChart } from './LoadTrendChart'
import { InjuryStatusList } from './InjuryStatusCard'
import { AIRecommendations } from './AIRecommendations'
import { cn } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { usePageContextOptional } from '@/components/ai-studio/PageContextProvider'
import { useLocale, useTranslations } from '@/i18n/client'

type ACWRZone = 'DETRAINING' | 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL'
type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH'
type LoadTrend = 'RISING' | 'FALLING' | 'STABLE'
type RecommendationType = 'WARNING' | 'SUGGESTION' | 'POSITIVE'

interface InjuryPreventionResponse {
  success: boolean
  data: {
    acwr: {
      current: number | null
      zone: ACWRZone | null
      riskLevel: RiskLevel | null
      trend: LoadTrend
      lastCalculated: string | null
    }
    loadHistory: Array<{
      date: string
      acuteLoad: number
      chronicLoad: number
      acwr: number
    }>
    activeInjuries: Array<{
      id: string
      bodyPart: string | null
      injuryType: string | null
      status: string
      phase: string | null
      painLevel: number
      startDate: string
      recommendedProtocol: unknown
    }>
    recommendations: Array<{
      type: RecommendationType
      title: string
      message: string
      priority: number
    }>
  }
}

interface InjuryPreventionDashboardProps {
  className?: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function InjuryPreventionDashboard({ className }: InjuryPreventionDashboardProps) {
  const t = useTranslations('components.injuryPreventionDashboard')
  const locale = useLocale()
  const pageCtx = usePageContextOptional()
  const { data, error, isLoading } = useSWR<InjuryPreventionResponse>(
    '/api/athlete/injury-prevention',
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
      revalidateOnFocus: true,
    }
  )

  // Set rich page context for AI chat
  useEffect(() => {
    if (!data?.success || !data.data) return
    const { acwr, activeInjuries, recommendations } = data.data
    const warningCount = recommendations.filter(r => r.type === 'WARNING').length
    const acwrValue = acwr.current?.toFixed(2) ?? t('context.notCalculated')
    pageCtx?.setPageContext({
      type: 'injury-prevention',
      title: t('context.title'),
      conceptKeys: ['acwr', 'delawarePain'],
      data: {
        acwrValue: acwr.current,
        acwrZone: acwr.zone,
        acwrRiskLevel: acwr.riskLevel,
        acwrTrend: acwr.trend,
        activeInjuriesCount: activeInjuries.length,
        activeInjuries: activeInjuries.map(i => ({
          bodyPart: i.bodyPart,
          status: i.status,
          phase: i.phase,
          painLevel: i.painLevel,
        })),
        recommendationCount: recommendations.length,
        warningCount,
      },
      summary: t('context.summary', {
        acwr: acwrValue,
        zone: acwr.zone ?? t('context.unknownZone'),
        injuries: activeInjuries.length,
        recommendations: recommendations.length,
        warnings: warningCount,
      }),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, locale])

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data?.success) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-muted-foreground', className)}>
        <AlertCircle className="h-8 w-8 mb-2 text-red-500" />
        <p className="text-sm">{t('error')}</p>
      </div>
    )
  }

  const { acwr, loadHistory, activeInjuries, recommendations } = data.data

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">{t('header.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('header.description')}
          </p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ACWR Gauge Card */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-sm">
              {t('cards.acwrTitle')} <InfoTooltip conceptKey="acwr" />
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <ACWRGauge
              value={acwr.current}
              zone={acwr.zone}
            />
            <p className="text-xs text-center text-muted-foreground mt-4">
              {t('cards.acwrDescription')}
            </p>
          </GlassCardContent>
        </GlassCard>

        {/* Load Trend Card */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-sm">
              {t('cards.loadTrendTitle')}
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <LoadTrendChart
              loadHistory={loadHistory}
              trend={acwr.trend}
            />
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Active injuries and recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Injuries */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-sm">
              {t('cards.activeInjuriesTitle')} <InfoTooltip conceptKey="delawarePain" />
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <InjuryStatusList injuries={activeInjuries} />
          </GlassCardContent>
        </GlassCard>

        {/* AI Recommendations */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-sm">
              {t('cards.recommendationsTitle')}
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <AIRecommendations recommendations={recommendations} />
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Info footer */}
      <div className="text-xs text-muted-foreground text-center space-y-1">
        <p>
          {t('footer.calculation')}
        </p>
        <p>
          {t('footer.zones')}
        </p>
      </div>
    </div>
  )
}
