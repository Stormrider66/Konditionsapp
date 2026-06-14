'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Timer, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { useLocale, useTranslations } from '@/i18n/client'

interface Split {
  interval: number
  splitTimeMs: number
}

interface SessionResult {
  sessionId: string
  sessionName: string | null
  sportType: string | null
  date: string
  coachName: string | null
  teamName: string | null
  protocol: { intervalCount?: number; restDurationSeconds?: number } | null
  totalLaps: number
  splits: Split[]
  avgSplitMs: number | null
  bestSplitMs: number | null
  worstSplitMs: number | null
  maxLactate: number | null
}

function formatSplit(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const tenths = Math.floor((ms % 1000) / 100)
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getTrend(current: number | null, previous: number | null): 'faster' | 'slower' | 'same' | null {
  if (current === null || previous === null) return null
  const diff = current - previous
  const threshold = previous * 0.01 // 1% threshold
  if (diff < -threshold) return 'faster'
  if (diff > threshold) return 'slower'
  return 'same'
}

interface IntervalResultsHistoryProps {
  apiUrl?: string // Allow custom API URL (coach vs athlete view)
  hideWhenEmpty?: boolean
  maxAgeHours?: number
}

export function IntervalResultsHistory({
  apiUrl = '/api/athlete/interval-results',
  hideWhenEmpty = false,
  maxAgeHours,
}: IntervalResultsHistoryProps) {
  const t = useTranslations('components.intervalResultsHistory')
  const locale = useLocale()
  const [results, setResults] = useState<SessionResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const requestUrl = new URL(apiUrl, window.location.origin)
        if (maxAgeHours !== undefined && Number.isFinite(maxAgeHours) && maxAgeHours > 0) {
          requestUrl.searchParams.set('maxAgeHours', String(maxAgeHours))
        }
        const fetchUrl = requestUrl.origin === window.location.origin
          ? `${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`
          : requestUrl.toString()
        const res = await fetch(fetchUrl)
        if (res.ok) {
          const data = await res.json()
          setResults(data.results || data.sessions || [])
        }
      } catch {
        toast.error(t('errors.fetch'))
      } finally {
        setLoading(false)
      }
    }
    void fetchResults()
  }, [apiUrl, maxAgeHours, t])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  if (results.length === 0) {
    if (hideWhenEmpty) return null

    return (
      <div className="text-center py-12 text-muted-foreground">
        <Timer className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p>{t('empty')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {results.map((session, idx) => {
        const previousSession = idx < results.length - 1 ? results[idx + 1] : null
        const trend = getTrend(session.avgSplitMs, previousSession?.avgSplitMs ?? null)

        return (
          <Card key={session.sessionId} className="overflow-hidden">
            <CardContent className="p-4">
              {/* Header row */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-sm">
                    {session.sessionName || t('fallbackSessionName')}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(session.date, locale)}
                    {session.teamName && ` · ${session.teamName}`}
                    {session.coachName && ` · ${session.coachName}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {session.sportType && (
                    <Badge variant="outline" className="text-[10px]">
                      {session.sportType}
                    </Badge>
                  )}
                  {trend === 'faster' && (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  )}
                  {trend === 'slower' && (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  )}
                  {trend === 'same' && (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="flex gap-4 text-sm">
                {session.avgSplitMs !== null && (
                  <div>
                    <span className="text-muted-foreground text-xs">{t('stats.average')} </span>
                    <span className="font-mono font-semibold">{formatSplit(session.avgSplitMs)}</span>
                  </div>
                )}
                {session.bestSplitMs !== null && (
                  <div>
                    <span className="text-muted-foreground text-xs">{t('stats.best')} </span>
                    <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                      {formatSplit(session.bestSplitMs)}
                    </span>
                  </div>
                )}
                {session.maxLactate !== null && (
                  <div>
                    <span className="text-muted-foreground text-xs">{t('stats.maxLactate')} </span>
                    <span className="font-mono font-semibold">{session.maxLactate.toFixed(1)}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground text-xs">{t('stats.laps')} </span>
                  <span className="font-semibold">{session.totalLaps}</span>
                </div>
              </div>

              {/* Split bars */}
              {session.splits.length > 0 && (
                <div className="flex gap-1 mt-3">
                  {session.splits.map((split) => {
                    const isBest = split.splitTimeMs === session.bestSplitMs
                    const isWorst = split.splitTimeMs === session.worstSplitMs
                    // Normalize bar height relative to session range
                    const range = (session.worstSplitMs || 1) - (session.bestSplitMs || 0)
                    const height = range > 0
                      ? 20 + 30 * (1 - (split.splitTimeMs - (session.bestSplitMs || 0)) / range)
                      : 35

                    return (
                      <div key={split.interval} className="flex-1 flex flex-col items-center gap-0.5">
                        <div
                          className={`w-full rounded-sm transition-all ${
                            isBest
                              ? 'bg-green-500'
                              : isWorst
                                ? 'bg-red-400'
                                : 'bg-blue-400'
                          }`}
                          style={{ height: `${height}px` }}
                        />
                        <span className="text-[9px] font-mono text-muted-foreground">
                          {formatSplit(split.splitTimeMs)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
