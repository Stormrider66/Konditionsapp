'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  DashboardCard,
  DashboardCardContent,
  DashboardCardHeader,
  DashboardCardTitle,
} from '@/components/coach/dashboard/DashboardCard'
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
import { useTranslations } from '@/i18n/client'

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
  if (score >= 70) return 'bg-emerald-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

// ACWR is a real 4-tier severity scale (OPTIMAL/CAUTION/DANGER/CRITICAL) — orange is a
// deliberate 4th step between amber and red here, not a decorative color.
function getAcwrBadgeColor(zone: string | null): string {
  switch (zone) {
    case 'OPTIMAL': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    case 'CAUTION': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    case 'DANGER': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    case 'CRITICAL': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    default: return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
  }
}

type TeamRosterGridTranslator = ReturnType<typeof useTranslations>

function formatLastActivity(dateStr: string | null, t: TeamRosterGridTranslator): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return t('dates.today')
  if (diffDays === 1) return t('dates.yesterday')
  if (diffDays < 7) return t('dates.daysAgo', { days: diffDays })
  return t('dates.weeksAgo', { weeks: Math.floor(diffDays / 7) })
}

export function TeamRosterGrid({ basePath, compact = false }: TeamRosterGridProps) {
  const t = useTranslations('components.teamRosterGrid')
  const router = useRouter()
  const [roster, setRoster] = useState<RosterAthlete[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const fetchRoster = useCallback(async () => {
    try {
      const businessSlug = basePath.split('/').filter(Boolean)[0]
      const res = await fetch('/api/coach/roster', {
        headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setRoster(data.roster || [])
      }
    } catch (err) {
      console.error('Failed to fetch roster:', err)
    } finally {
      setLoading(false)
    }
  }, [basePath])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchRoster()
    }, 0)
    const interval = window.setInterval(() => {
      void fetchRoster()
    }, 60000)

    return () => {
      window.clearTimeout(timeoutId)
      window.clearInterval(interval)
    }
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

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
  }

  const filters: { key: FilterType; label: string; icon?: typeof AlertTriangle }[] = [
    { key: 'all', label: t('filters.all') },
    { key: 'attention', label: t('filters.attention'), icon: AlertTriangle },
    { key: 'injured', label: t('filters.injured'), icon: HeartPulse },
    { key: 'high-load', label: t('filters.highLoad'), icon: Activity },
  ]

  return (
    <DashboardCard glow="blue" className="group">
      <DashboardCardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <DashboardCardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            {t('title')}
            <Badge variant="secondary" className="text-xs">{roster.length}</Badge>
          </DashboardCardTitle>
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
      </DashboardCardHeader>
      <DashboardCardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {filter === 'all' ? t('empty.noAthletes') : t('empty.noFilterMatches')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b dark:border-white/10">
                  <th className="text-left py-2 pr-2">
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-foreground">
                      {t('columns.name')} {renderSortIcon('name')}
                    </button>
                  </th>
                  <th className="text-center py-2 px-2">
                    <button onClick={() => toggleSort('readiness')} className="flex items-center gap-1 hover:text-foreground mx-auto">
                      {t('columns.readiness')} {renderSortIcon('readiness')}
                    </button>
                  </th>
                  {!compact && (
                    <th className="text-center py-2 px-2">
                      <button onClick={() => toggleSort('acwr')} className="flex items-center gap-1 hover:text-foreground mx-auto">
                        ACWR {renderSortIcon('acwr')}
                      </button>
                    </th>
                  )}
                  <th className="text-center py-2 px-2">
                    <button onClick={() => toggleSort('injury')} className="flex items-center gap-1 hover:text-foreground mx-auto">
                      {t('columns.injuries')} {renderSortIcon('injury')}
                    </button>
                  </th>
                  {!compact && (
                    <th className="text-right py-2 pl-2">
                      <button onClick={() => toggleSort('activity')} className="flex items-center gap-1 hover:text-foreground ml-auto">
                        {t('columns.last')} {renderSortIcon('activity')}
                      </button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, compact ? 8 : undefined).map(athlete => {
                  const acwrBadgeColor = getAcwrBadgeColor(athlete.acwrZone)
                  return (
                    <tr
                      key={athlete.id}
                      className="border-b dark:border-white/5 hover:bg-muted/30 dark:hover:bg-white/5 cursor-pointer transition"
                      onClick={() => router.push(`${basePath}/coach/clients/${athlete.id}`)}
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
                          <Badge className={cn('text-[10px]', acwrBadgeColor)}>
                            {athlete.acwr !== null ? athlete.acwr.toFixed(2) : '-'}
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
                          {formatLastActivity(athlete.lastActivity, t)}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {compact && filtered.length > 8 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                {t('moreAthletes', { count: filtered.length - 8 })}
              </p>
            )}
          </div>
        )}
      </DashboardCardContent>
    </DashboardCard>
  )
}
