'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  AlertTriangle,
  HeartPulse,
  Activity,
  ChevronUp,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RosterAthlete {
  id: string
  name: string
  primarySport: string | null
  team: { id: string; name: string } | null
  readinessScore: number | null
  readinessLevel: string | null
  acwr: number | null
  acwrZone: string | null
  injuryCount: number
  lastActivity: string | null
}

type FilterType = 'all' | 'attention' | 'injured' | 'high-load'
type SortField = 'name' | 'readiness' | 'acwr' | 'injury' | 'activity'
type SortDir = 'asc' | 'desc'

interface TeamRosterGridProps {
  basePath: string
  compact?: boolean
}

function getReadinessColor(score: number | null): string {
  if (score === null) return 'bg-slate-300 dark:bg-slate-600'
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getAcwrBadge(zone: string | null): { color: string; label: string } {
  switch (zone) {
    case 'OPTIMAL': return { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Optimal' }
    case 'CAUTION': return { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Varning' }
    case 'DANGER': return { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label: 'Fara' }
    case 'CRITICAL': return { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Kritisk' }
    default: return { color: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400', label: '-' }
  }
}

function formatLastActivity(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Idag'
  if (diffDays === 1) return 'Igår'
  if (diffDays < 7) return `${diffDays}d sedan`
  return `${Math.floor(diffDays / 7)}v sedan`
}

export function TeamRosterGrid({ basePath, compact = false }: TeamRosterGridProps) {
  const router = useRouter()
  const [roster, setRoster] = useState<RosterAthlete[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const fetchRoster = useCallback(async () => {
    try {
      const res = await fetch('/api/coach/roster')
      if (res.ok) {
        const data = await res.json()
        setRoster(data.roster || [])
      }
    } catch (err) {
      console.error('Failed to fetch roster:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRoster()
    const interval = setInterval(fetchRoster, 60000) // refresh every 60s
    return () => clearInterval(interval)
  }, [fetchRoster])

  const filtered = useMemo(() => {
    let result = [...roster]
    switch (filter) {
      case 'attention':
        result = result.filter(a =>
          (a.readinessScore !== null && a.readinessScore < 40) ||
          a.acwrZone === 'DANGER' || a.acwrZone === 'CRITICAL'
        )
        break
      case 'injured':
        result = result.filter(a => a.injuryCount > 0)
        break
      case 'high-load':
        result = result.filter(a => a.acwrZone === 'CAUTION' || a.acwrZone === 'DANGER' || a.acwrZone === 'CRITICAL')
        break
    }

    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'readiness': cmp = (a.readinessScore ?? -1) - (b.readinessScore ?? -1); break
        case 'acwr': cmp = (a.acwr ?? -1) - (b.acwr ?? -1); break
        case 'injury': cmp = a.injuryCount - b.injuryCount; break
        case 'activity': {
          const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
          const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
          cmp = aTime - bTime
          break
        }
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [roster, filter, sortField, sortDir])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
  }

  const filters: { key: FilterType; label: string; icon?: typeof AlertTriangle }[] = [
    { key: 'all', label: 'Alla' },
    { key: 'attention', label: 'Uppmärksamhet', icon: AlertTriangle },
    { key: 'injured', label: 'Skadade', icon: HeartPulse },
    { key: 'high-load', label: 'Hög belastning', icon: Activity },
  ]

  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <GlassCardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            Trupp
            <Badge variant="secondary" className="text-xs">{roster.length}</Badge>
          </GlassCardTitle>
        </div>
        {!compact && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {filters.map(f => (
              <Button
                key={f.key}
                variant={filter === f.key ? 'default' : 'ghost'}
                size="sm"
                className="text-xs h-7"
                onClick={() => setFilter(f.key)}
              >
                {f.icon && <f.icon className="h-3 w-3 mr-1" />}
                {f.label}
              </Button>
            ))}
          </div>
        )}
      </GlassCardHeader>
      <GlassCardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {filter === 'all' ? 'Inga atleter' : 'Inga atleter matchar filtret'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b dark:border-white/10">
                  <th className="text-left py-2 pr-2">
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-foreground">
                      Namn <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="text-center py-2 px-2">
                    <button onClick={() => toggleSort('readiness')} className="flex items-center gap-1 hover:text-foreground mx-auto">
                      Beredskap <SortIcon field="readiness" />
                    </button>
                  </th>
                  {!compact && (
                    <th className="text-center py-2 px-2">
                      <button onClick={() => toggleSort('acwr')} className="flex items-center gap-1 hover:text-foreground mx-auto">
                        ACWR <SortIcon field="acwr" />
                      </button>
                    </th>
                  )}
                  <th className="text-center py-2 px-2">
                    <button onClick={() => toggleSort('injury')} className="flex items-center gap-1 hover:text-foreground mx-auto">
                      Skador <SortIcon field="injury" />
                    </button>
                  </th>
                  {!compact && (
                    <th className="text-right py-2 pl-2">
                      <button onClick={() => toggleSort('activity')} className="flex items-center gap-1 hover:text-foreground ml-auto">
                        Senast <SortIcon field="activity" />
                      </button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, compact ? 8 : undefined).map(athlete => {
                  const acwrBadge = getAcwrBadge(athlete.acwrZone)
                  return (
                    <tr
                      key={athlete.id}
                      className="border-b dark:border-white/5 hover:bg-muted/30 dark:hover:bg-white/5 cursor-pointer transition"
                      onClick={() => router.push(`${basePath}/coach/athletes/${athlete.id}`)}
                    >
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', getReadinessColor(athlete.readinessScore))} />
                          <span className="font-medium truncate dark:text-slate-200">{athlete.name}</span>
                        </div>
                        {athlete.team && (
                          <span className="text-[10px] text-muted-foreground ml-[18px]">{athlete.team.name}</span>
                        )}
                      </td>
                      <td className="text-center py-2 px-2">
                        {athlete.readinessScore !== null ? (
                          <span className="font-medium dark:text-slate-200">{athlete.readinessScore}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      {!compact && (
                        <td className="text-center py-2 px-2">
                          <Badge className={cn('text-[10px]', acwrBadge.color)}>
                            {athlete.acwr !== null ? athlete.acwr.toFixed(2) : acwrBadge.label}
                          </Badge>
                        </td>
                      )}
                      <td className="text-center py-2 px-2">
                        {athlete.injuryCount > 0 ? (
                          <Badge variant="outline" className="text-[10px] text-red-600 dark:text-red-400 border-red-200 dark:border-red-800">
                            <HeartPulse className="h-3 w-3 mr-0.5" />
                            {athlete.injuryCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                      {!compact && (
                        <td className="text-right py-2 pl-2 text-xs text-muted-foreground">
                          {formatLastActivity(athlete.lastActivity)}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {compact && filtered.length > 8 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                + {filtered.length - 8} fler atleter
              </p>
            )}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
