'use client'

/**
 * InjuryPreventionWidget
 *
 * Compact widget for the athlete dashboard showing ACWR status
 * and linking to the full Injury Prevention Dashboard.
 */

import useSWR from 'swr'
import Link from 'next/link'
import { Loader2, AlertCircle, Shield, ChevronRight, Activity } from 'lucide-react'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useBasePath } from '@/lib/contexts/BasePathContext'

type ACWRZone = 'DETRAINING' | 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL'

interface InjuryPreventionResponse {
  success: boolean
  data: {
    acwr: {
      current: number | null
      zone: ACWRZone | null
      riskLevel: string | null
      trend: string
      lastCalculated: string | null
    }
    activeInjuries: Array<{ id: string }>
    recommendations: Array<{ type: string }>
  }
}

interface InjuryPreventionWidgetProps {
  className?: string
}

const ZONE_CONFIG: Record<ACWRZone, { label: string; color: string; bgColor: string }> = {
  DETRAINING: {
    label: 'Avträning',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
  },
  OPTIMAL: {
    label: 'Optimal',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  CAUTION: {
    label: 'Varning',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  DANGER: {
    label: 'Fara',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  CRITICAL: {
    label: 'Kritisk',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function InjuryPreventionWidget({ className }: InjuryPreventionWidgetProps) {
  const basePath = useBasePath()
  const { data, error, isLoading } = useSWR<InjuryPreventionResponse>(
    '/api/athlete/injury-prevention',
    fetcher,
    {
      refreshInterval: 10 * 60 * 1000, // Refresh every 10 minutes
      revalidateOnFocus: true,
    }
  )

  if (isLoading) {
    return (
      <GlassCard className={className}>
        <GlassCardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </GlassCardContent>
      </GlassCard>
    )
  }

  if (error || !data?.success) {
    return (
      <GlassCard className={className}>
        <GlassCardContent className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <AlertCircle className="h-6 w-6 mb-2 text-red-500" />
          <p className="text-sm">Kunde inte ladda skadedata</p>
        </GlassCardContent>
      </GlassCard>
    )
  }

  const { acwr, activeInjuries, recommendations } = data.data
  const zoneConfig = acwr.zone ? ZONE_CONFIG[acwr.zone] : null
  const warningCount = recommendations.filter((r) => r.type === 'WARNING').length

  return (
    <GlassCard className={className}>
      <GlassCardHeader className="pb-2">
        <GlassCardTitle className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-blue-500" />
          Skadeförebyggande
        </GlassCardTitle>
      </GlassCardHeader>

      <GlassCardContent className="pt-0 space-y-3">
        {/* ACWR Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Belastningskvot</span>
          <div className="flex items-center gap-2">
            {acwr.current !== null ? (
              <>
                <span className={cn('text-lg font-bold', zoneConfig?.color || 'text-muted-foreground')}>
                  {acwr.current.toFixed(2)}
                </span>
                {zoneConfig && (
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      zoneConfig.bgColor,
                      zoneConfig.color
                    )}
                  >
                    {zoneConfig.label}
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Ingen data</span>
            )}
          </div>
        </div>

        {/* Active injuries count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Aktiva skador</span>
          <div className="flex items-center gap-1">
            <Activity
              className={cn(
                'h-4 w-4',
                activeInjuries.length > 0 ? 'text-orange-500' : 'text-green-500'
              )}
            />
            <span
              className={cn(
                'text-sm font-medium',
                activeInjuries.length > 0 ? 'text-orange-500' : 'text-green-500'
              )}
            >
              {activeInjuries.length > 0 ? activeInjuries.length : 'Inga'}
            </span>
          </div>
        </div>

        {/* Warnings indicator */}
        {warningCount > 0 && (
          <div className="flex items-center gap-2 text-orange-500 bg-orange-500/10 rounded-md px-2 py-1.5">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs font-medium">
              {warningCount} {warningCount === 1 ? 'varning' : 'varningar'}
            </span>
          </div>
        )}

        {/* Link to full dashboard */}
        <Link href={`${basePath}/athlete/injury-prevention`} className="block">
          <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
            <span>Visa dashboard</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </GlassCardContent>
    </GlassCard>
  )
}
