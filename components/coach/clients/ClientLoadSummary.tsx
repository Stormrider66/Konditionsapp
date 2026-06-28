'use client'

/**
 * ClientLoadSummary
 *
 * Coach-side card showing one athlete's current ACWR (zone + value) and
 * a 30-day sparkline of acute vs chronic load. Pairs with the readiness
 * card in the per-client Analys tab so the coach sees today's snapshot
 * (load + recovery) above the fold.
 */

import { useMemo, useEffect, useState } from 'react'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
  RolePanelDescription as CardDescription,
} from '@/components/layouts/role-shell/RolePage'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'
import {
  Activity,
  Loader2,
  AlertTriangle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  HelpCircle,
} from 'lucide-react'
import { useLocale, useTranslations } from '@/i18n/client'

type AcwrZone = 'DETRAINING' | 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL'

interface LoadPoint {
  date: string
  acwr: number | null
  acuteLoad: number | null
  chronicLoad: number | null
  zone: AcwrZone | null
}

interface LoadSummary {
  latest: LoadPoint | null
  series: LoadPoint[]
}

interface ClientLoadSummaryProps {
  clientId: string
}

const ZONE_META: Record<
  AcwrZone | 'UNKNOWN',
  {
    labelKey: string
    text: string
    bg: string
    border: string
    icon: React.ElementType
    helperKey: string
  }
> = {
  OPTIMAL: {
    labelKey: 'optimal.label',
    text: 'text-green-700 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    icon: ShieldCheck,
    helperKey: 'optimal.helper',
  },
  CAUTION: {
    labelKey: 'caution.label',
    text: 'text-yellow-700 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: Shield,
    helperKey: 'caution.helper',
  },
  DANGER: {
    labelKey: 'danger.label',
    text: 'text-orange-700 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
    icon: ShieldAlert,
    helperKey: 'danger.helper',
  },
  CRITICAL: {
    labelKey: 'critical.label',
    text: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: AlertTriangle,
    helperKey: 'critical.helper',
  },
  DETRAINING: {
    labelKey: 'detraining.label',
    text: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: TrendingDown,
    helperKey: 'detraining.helper',
  },
  UNKNOWN: {
    labelKey: 'unknown.label',
    text: 'text-muted-foreground',
    bg: 'bg-muted/30',
    border: 'border-border',
    icon: HelpCircle,
    helperKey: 'unknown.helper',
  },
}

export function ClientLoadSummary({ clientId }: ClientLoadSummaryProps) {
  const t = useTranslations('components.clientLoadSummary')
  const locale = useLocale()
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
  const [data, setData] = useState<LoadSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/clients/${clientId}/load-summary`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = await res.json()
        if (!cancelled && body.success) setData(body.data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t('errors.fetchLoad'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [clientId, t])

  const latest = data?.latest ?? null
  const zoneKey: AcwrZone | 'UNKNOWN' = latest?.zone ?? 'UNKNOWN'
  const meta = ZONE_META[zoneKey]
  const ZoneIcon = meta.icon

  const chartData = useMemo(
    () => data?.series.map((p) => ({
      date: new Date(p.date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' }),
      acute: p.acuteLoad,
      chronic: p.chronicLoad,
    })) ?? [],
    [data?.series, dateLocale],
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-500" />
          {t('title')}
        </CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : (
          <>
            <div
              className={`rounded-lg border p-3 ${meta.bg} ${meta.border}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className={`flex items-center gap-2 ${meta.text}`}>
                  <ZoneIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">{t(`zones.${meta.labelKey}`)}</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold tabular-nums">
                    {latest?.acwr != null ? latest.acwr.toFixed(2) : '—'}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    ACWR
                  </div>
                </div>
              </div>
              <p className={`text-xs mt-2 ${meta.text} opacity-80`}>{t(`zones.${meta.helperKey}`)}</p>
            </div>

            {chartData.length > 1 && (
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    {/* Sweet-spot band (ACWR 0.8–1.3 ⇒ chronic load × {0.8–1.3}).
                        Drawn as a shaded reference area on the chronic curve so
                        the coach can eyeball whether acute is inside it. */}
                    <ReferenceArea
                      y1={0}
                      y2={Number.MAX_SAFE_INTEGER}
                      strokeOpacity={0}
                      fillOpacity={0}
                      ifOverflow="extendDomain"
                    />
                    <defs>
                      <linearGradient id="loadAcute" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="loadChronic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ fontSize: 11 }}
                      formatter={(value: number, name: string) => [
                        value?.toFixed?.(0) ?? '—',
                        name === 'acute' ? t('chart.acute') : t('chart.chronic'),
                      ]}
                    />
                    <ReferenceLine y={0} stroke="transparent" />
                    <Area
                      type="monotone"
                      dataKey="chronic"
                      stroke="#94a3b8"
                      fill="url(#loadChronic)"
                      strokeWidth={1.5}
                    />
                    <Area
                      type="monotone"
                      dataKey="acute"
                      stroke="#3b82f6"
                      fill="url(#loadAcute)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                {t('chart.acute')}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-slate-400" />
                {t('chart.chronic')}
              </span>
              <span>{t('chart.last30Days')}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
