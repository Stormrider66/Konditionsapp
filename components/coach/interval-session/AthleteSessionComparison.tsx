'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
import { Badge } from '@/components/ui/badge'
import { Timer, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'
import { useLocale } from '@/i18n/client'

interface SessionSummary {
  sessionId: string
  sessionName: string | null
  sportType: string | null
  date: string
  teamName: string | null
  totalLaps: number
  splits: { interval: number; splitTimeMs: number }[]
  avgSplitMs: number | null
  bestSplitMs: number | null
  maxLactate: number | null
}

function formatSplit(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatDateForLocale(iso: string, locale: AppLocale): string {
  return new Date(iso).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    day: 'numeric',
    month: 'short',
  })
}

type AppLocale = 'en' | 'sv'

const copy = {
  en: {
    fetchFailed: 'Could not fetch history',
    empty: 'No completed interval sessions for this athlete',
    title: (name: string) => `Progress - ${name}`,
    faster: (value: string) => `${value}% faster`,
    summary: (count: number) => `${count} sessions · Average and best split over time`,
    average: 'Average',
    best: 'Best',
    lapCount: (count: number) => `${count} laps`,
  },
  sv: {
    fetchFailed: 'Kunde inte hämta historik',
    empty: 'Inga avslutade intervallsessioner för denna atlet',
    title: (name: string) => `Utveckling - ${name}`,
    faster: (value: string) => `${value}% snabbare`,
    summary: (count: number) => `${count} sessioner · Snitt & bästa split över tid`,
    average: 'Snitt',
    best: 'Bästa',
    lapCount: (count: number) => `${count} varv`,
  },
} satisfies Record<AppLocale, {
  fetchFailed: string
  empty: string
  title: (name: string) => string
  faster: (value: string) => string
  summary: (count: number) => string
  average: string
  best: string
  lapCount: (count: number) => string
}>

interface AthleteSessionComparisonProps {
  clientId: string
  sportType?: string
}

export function AthleteSessionComparison({ clientId, sportType }: AthleteSessionComparisonProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const text = copy[locale]
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [clientName, setClientName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams({ clientId })
        if (sportType) params.set('sportType', sportType)
        const res = await fetch(`/api/coach/interval-sessions/athlete-history?${params}`)
        if (res.ok) {
          const data = await res.json()
          setSessions(data.sessions || [])
          setClientName(data.clientName || '')
        }
      } catch {
        toast.error(text.fetchFailed)
      } finally {
        setLoading(false)
      }
    }
    void fetchData()
  }, [clientId, sportType, text.fetchFailed])

  if (loading) {
    return <div className="h-48 bg-muted animate-pulse rounded-lg" />
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Timer className="h-6 w-6 mx-auto mb-2 opacity-40" />
        <p className="text-sm">{text.empty}</p>
      </div>
    )
  }

  // Build trend chart data (chronological order - oldest first)
  const chartData = [...sessions].reverse().map((s) => ({
    date: formatDateForLocale(s.date, locale),
    avg: s.avgSplitMs,
    best: s.bestSplitMs,
    name: s.sessionName || formatDateForLocale(s.date, locale),
  }))

  // Calculate improvement
  const latest = sessions[0]
  const oldest = sessions[sessions.length - 1]
  const improvement = latest?.avgSplitMs && oldest?.avgSplitMs
    ? ((oldest.avgSplitMs - latest.avgSplitMs) / oldest.avgSplitMs * 100).toFixed(1)
    : null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {text.title(clientName)}
            </CardTitle>
            {improvement && parseFloat(improvement) > 0 && (
              <Badge variant="outline" className="text-green-600 border-green-300">
                <TrendingDown className="h-3 w-3 mr-1" />
                {text.faster(improvement)}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {text.summary(sessions.length)}
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ left: -10, right: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={(v) => formatSplit(v)}
                tick={{ fontSize: 11 }}
                width={45}
              />
              <Tooltip formatter={(value: number) => formatSplit(value)} />
              <Line
                type="monotone"
                dataKey="avg"
                stroke="#3B82F6"
                strokeWidth={2}
                name={text.average}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="best"
                stroke="#22C55E"
                strokeWidth={2}
                name={text.best}
                dot={{ r: 3 }}
                strokeDasharray="4 4"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Session list */}
      <div className="space-y-2">
        {sessions.map((s) => (
          <div
            key={s.sessionId}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 text-sm"
          >
            <div>
              <span className="font-medium">{s.sessionName || 'Session'}</span>
              <span className="text-xs text-muted-foreground ml-2">{formatDateForLocale(s.date, locale)}</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs">
              <span>{text.average}: <strong>{s.avgSplitMs ? formatSplit(s.avgSplitMs) : '-'}</strong></span>
              <span className="text-green-600">{text.best}: <strong>{s.bestSplitMs ? formatSplit(s.bestSplitMs) : '-'}</strong></span>
              <span>{text.lapCount(s.totalLaps)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
