'use client'

/**
 * MatchScheduleWidget
 *
 * Compact widget showing upcoming matches for team sport athletes.
 * Displays next 5 matches with opponent, date, and home/away status.
 */

import { useState, useEffect } from 'react'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Calendar,
  MapPin,
  Home,
  Plane,
  ChevronRight,
  Plus,
  Trophy,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { format, formatDistanceToNow, isToday, isTomorrow, isThisWeek } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'

interface Match {
  id: string
  opponent: string
  isHome: boolean
  scheduledDate: string
  venue?: string | null
  competition?: string | null
  matchday?: number | null
  result?: string | null
}

interface MatchScheduleWidgetProps {
  className?: string
  maxMatches?: number
  showAddButton?: boolean
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const t = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
)

const dateFnsLocale = (locale: AppLocale) => (locale === 'sv' ? sv : enUS)

function getDateLabel(date: Date, locale: AppLocale): string {
  if (isToday(date)) return t(locale, 'Idag', 'Today')
  if (isTomorrow(date)) return t(locale, 'Imorgon', 'Tomorrow')
  if (isThisWeek(date)) return format(date, 'EEEE', { locale: dateFnsLocale(locale) })
  return format(date, 'd MMM', { locale: dateFnsLocale(locale) })
}

function getTimeUntil(date: Date, locale: AppLocale): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: dateFnsLocale(locale) })
}

export function MatchScheduleWidget({
  className,
  maxMatches = 5,
  showAddButton = true,
}: MatchScheduleWidgetProps) {
  const locale = getAppLocale(useLocale())
  const basePath = useBasePath()
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMatches() {
      try {
        const response = await fetch(`/api/match-schedule?upcoming=true&limit=${maxMatches}`)
        const data = await response.json()

        if (response.ok) {
          setMatches(data.matches || [])
        } else {
          setError(data.error || t(locale, 'Kunde inte hämta matcher', 'Could not fetch matches'))
        }
      } catch {
        setError(t(locale, 'Nätverksfel', 'Network error'))
      } finally {
        setIsLoading(false)
      }
    }

    void fetchMatches()
  }, [maxMatches, locale])

  if (isLoading) {
    return (
      <GlassCard className={className}>
        <GlassCardHeader className="pb-2">
          <GlassCardTitle className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-blue-500" />
            {t(locale, 'Kommande matcher', 'Upcoming matches')}
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </GlassCardContent>
      </GlassCard>
    )
  }

  if (error) {
    return (
      <GlassCard className={className}>
        <GlassCardHeader className="pb-2">
          <GlassCardTitle className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-blue-500" />
            {t(locale, 'Kommande matcher', 'Upcoming matches')}
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <AlertCircle className="h-6 w-6 mb-2 text-orange-500" />
            <p className="text-sm text-center">{error}</p>
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <GlassCard className={className}>
      <GlassCardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <GlassCardTitle className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-blue-500" />
            {t(locale, 'Kommande matcher', 'Upcoming matches')}
          </GlassCardTitle>
          {showAddButton && (
            <Link href={`${basePath}/athlete/matches?action=add`}>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>
      </GlassCardHeader>

      <GlassCardContent className="space-y-2 pt-0">
        {matches.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t(locale, 'Inga kommande matcher', 'No upcoming matches')}</p>
            {showAddButton && (
              <Link href={`${basePath}/athlete/matches?action=add`}>
                <Button variant="outline" size="sm" className="mt-3">
                  <Plus className="h-3 w-3 mr-1" />
                  {t(locale, 'Lägg till match', 'Add match')}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {matches.map((match, index) => {
              const matchDate = new Date(match.scheduledDate)
              const isNextMatch = index === 0

              return (
                <Link
                  key={match.id}
                  href={`${basePath}/athlete/matches/${match.id}`}
                  className="block"
                >
                  <div
                    className={cn(
                      'p-3 rounded-lg border transition-colors hover:bg-white/5',
                      isNextMatch
                        ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                        : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Opponent and home/away */}
                        <div className="flex items-center gap-2 mb-1">
                          {match.isHome ? (
                            <Home className="h-3 w-3 text-green-500 flex-shrink-0" />
                          ) : (
                            <Plane className="h-3 w-3 text-orange-500 flex-shrink-0" />
                          )}
                          <span className="font-medium text-sm truncate">
                            {match.isHome ? 'vs' : '@'} {match.opponent}
                          </span>
                        </div>

                        {/* Date and time */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="font-medium">
                            {getDateLabel(matchDate, locale)}
                          </span>
                          <span>
                            {format(matchDate, 'HH:mm')}
                          </span>
                          {isNextMatch && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-4 px-1 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                            >
                              {getTimeUntil(matchDate, locale)}
                            </Badge>
                          )}
                        </div>

                        {/* Competition and venue */}
                        {(match.competition || match.venue) && (
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {match.competition && (
                              <span className="truncate">{match.competition}</span>
                            )}
                            {match.venue && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin className="h-3 w-3" />
                                  {match.venue}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              )
            })}

            {/* Link to all matches */}
            <Link href={`${basePath}/athlete/matches`} className="block">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-muted-foreground hover:text-foreground"
              >
                <span>{t(locale, 'Visa alla matcher', 'View all matches')}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
