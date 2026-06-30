'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { Loader2, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react'
import { useLocale, useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'
import { BODY_PARTS, ILLNESSES, getInjuryById } from '@/lib/injury-detection/sport-injuries'
import type { WellnessPoint, InjuryEntry } from '@/lib/coach/wellness-trends'

// Reuse the canonical injury/illness labels (the same source the check-in
// selector writes from) so enum values localize instead of showing raw English.
const BODY_PART_MAP = new Map(BODY_PARTS.map((b) => [b.id as string, b]))
const ILLNESS_MAP = new Map(ILLNESSES.map((i) => [i.id as string, i]))
const SIDE_LABELS: Record<string, { en: string; sv: string }> = {
  LEFT: { en: 'Left', sv: 'Vänster' },
  RIGHT: { en: 'Right', sv: 'Höger' },
  BOTH: { en: 'Both', sv: 'Båda' },
  NA: { en: 'Not applicable', sv: 'Ej aktuellt' },
}

interface WellnessTrendsProps {
  clientId: string
  days?: number
}

type ComponentKey = 'energy' | 'mood' | 'sleepQuality' | 'soreness' | 'stress'

const COMPONENTS: { key: ComponentKey; field: keyof WellnessPoint; higherBetter: boolean }[] = [
  { key: 'energy', field: 'energy', higherBetter: true },
  { key: 'mood', field: 'mood', higherBetter: true },
  { key: 'sleepQuality', field: 'sleepQuality', higherBetter: true },
  { key: 'soreness', field: 'soreness', higherBetter: false },
  { key: 'stress', field: 'stress', higherBetter: false },
]

function humanizeEnum(value: string | null): string | null {
  if (!value) return null
  const lower = value.toLowerCase().replace(/_/g, ' ').trim()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function WellnessTrends({ clientId, days = 30 }: WellnessTrendsProps) {
  const t = useTranslations('coach.pages.clientDetail')
  const locale = useLocale()
  const dateFnsLocale = locale === 'sv' ? sv : enUS

  const pickLabel = (def?: { labelSv: string; labelEn: string } | null) =>
    def ? (locale === 'sv' ? def.labelSv : def.labelEn) : null
  const bodyPartLabel = (v: string | null) => (v ? (pickLabel(BODY_PART_MAP.get(v)) ?? humanizeEnum(v)) : null)
  const illnessLabel = (v: string | null) => (v ? (pickLabel(ILLNESS_MAP.get(v)) ?? humanizeEnum(v)) : null)
  const specificLabel = (v: string | null) => (v ? (pickLabel(getInjuryById(v)) ?? humanizeEnum(v)) : null)
  const sideLabel = (v: string | null) => {
    if (!v) return null
    const s = SIDE_LABELS[v]
    return s ? (locale === 'sv' ? s.sv : s.en) : humanizeEnum(v)
  }

  const [series, setSeries] = useState<WellnessPoint[]>([])
  const [injuries, setInjuries] = useState<InjuryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const response = await fetch(`/api/clients/${clientId}/wellness-trends?days=${days}`)
      const result = await response.json()
      if (result.success) {
        setSeries(result.series ?? [])
        setInjuries(result.injuries ?? [])
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [clientId, days])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [load])

  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-blue-500" />
        <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('wellnessTrends.title')}</h2>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{t('wellnessTrends.description', { days })}</p>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          {t('wellnessTrends.loading')}
        </div>
      ) : error ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{t('wellnessTrends.error')}</div>
      ) : series.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{t('wellnessTrends.empty')}</div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COMPONENTS.map((component) => (
              <TrendRow
                key={component.key}
                label={t(`wellnessTrends.components.${component.key}`)}
                values={series.map((p) => p[component.field] as number | null)}
                higherBetter={component.higherBetter}
              />
            ))}
          </div>

          <div className="mt-5 border-t border-gray-200 dark:border-white/10 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('wellnessTrends.injuriesTitle')}</h3>
            {injuries.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('wellnessTrends.noInjuries')}</p>
            ) : (
              <ul className="space-y-2">
                {injuries.slice(0, 8).map((injury, idx) => (
                  <li key={`${injury.date}-${idx}`} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {injury.isIllness
                          ? (illnessLabel(injury.illnessType) ?? t('wellnessTrends.illness'))
                          : (bodyPartLabel(injury.bodyPart) ?? t('wellnessTrends.injury'))}
                      </span>
                      {!injury.isIllness && injury.specificType && (
                        <span className="text-muted-foreground"> · {specificLabel(injury.specificType)}</span>
                      )}
                      {!injury.isIllness && injury.side && injury.side !== 'NA' && (
                        <span className="text-muted-foreground"> ({sideLabel(injury.side)})</span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                      {injury.painLevel != null && <span>{t('wellnessTrends.pain', { value: injury.painLevel })}</span>}
                      <span>{format(new Date(injury.date), 'PP', { locale: dateFnsLocale })}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function TrendRow({
  label,
  values,
  higherBetter,
}: {
  label: string
  values: Array<number | null>
  higherBetter: boolean
}) {
  const valid = values.filter((v): v is number => v != null)
  const latest = valid.length > 0 ? valid[valid.length - 1] : null

  // Compare the last third of the window against the earlier portion.
  const splitAt = Math.max(1, Math.floor(valid.length * 2 / 3))
  const recentAvg = mean(valid.slice(splitAt))
  const priorAvg = mean(valid.slice(0, splitAt))
  const delta = recentAvg != null && priorAvg != null ? recentAvg - priorAvg : null

  const improved = delta == null || Math.abs(delta) < 0.05
    ? 'flat'
    : (delta > 0) === higherBetter
      ? 'good'
      : 'bad'

  return (
    <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className={cn(
          'inline-flex items-center gap-0.5 text-xs font-medium',
          improved === 'good' && 'text-emerald-600 dark:text-emerald-300',
          improved === 'bad' && 'text-red-600 dark:text-red-300',
          improved === 'flat' && 'text-muted-foreground',
        )}>
          {improved === 'good' ? <TrendingUp className="h-3.5 w-3.5" />
            : improved === 'bad' ? <TrendingDown className="h-3.5 w-3.5" />
            : <Minus className="h-3.5 w-3.5" />}
          {delta != null && Math.abs(delta) >= 0.05 ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}` : '—'}
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
          {latest != null ? latest : '–'}
          <span className="text-xs font-normal text-muted-foreground"> /10</span>
        </p>
        <Sparkline values={values} domainMin={1} domainMax={10} />
      </div>
    </div>
  )
}

function Sparkline({
  values,
  domainMin,
  domainMax,
}: {
  values: Array<number | null>
  domainMin: number
  domainMax: number
}) {
  const width = 88
  const height = 28
  const points = values
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => p.v != null)

  if (points.length < 2) {
    return <svg width={width} height={height} aria-hidden="true" />
  }

  const n = values.length - 1
  const range = domainMax - domainMin || 1
  const coords = points.map((p) => {
    const x = (p.i / n) * (width - 2) + 1
    const y = height - 1 - ((p.v - domainMin) / range) * (height - 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <svg width={width} height={height} aria-hidden="true" className="overflow-visible">
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="text-blue-500/70 dark:text-blue-300/70"
      />
    </svg>
  )
}
