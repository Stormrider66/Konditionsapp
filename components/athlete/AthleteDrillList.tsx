'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { DrillStructure } from '@/components/coach/drills/IceHockeyRink'
import { AthleteDrillViewer } from './AthleteDrillViewer'
import { ClipboardList, ChevronDown, ChevronUp, CalendarDays, CheckCircle2 } from 'lucide-react'
import { useLocale, useTranslations } from '@/i18n/client'

interface Drill {
  id: string
  title: string
  description: string | null
  sportType: string
  structure: DrillStructure
  scheduledDate: string | null
  viewedAt: string | null
  acknowledgedAt: string | null
  createdAt: string
  team: { name: string } | null
  createdBy: { name: string }
}

interface AthleteDrillListProps {
  athletePosition?: string
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', { day: 'numeric', month: 'short' })
}

function localDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function scheduledDayKey(iso: string): string {
  return iso.slice(0, 10)
}

type AppLocale = 'en' | 'sv'

const appLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const SPORT_LABELS: Record<string, Record<AppLocale, string>> = {
  ICE_HOCKEY: { sv: 'Ishockey', en: 'Ice hockey' },
  FOOTBALL: { sv: 'Fotboll', en: 'Football' },
  HANDBALL: { sv: 'Handboll', en: 'Handball' },
  BASKETBALL: { sv: 'Basket', en: 'Basketball' },
  FLOORBALL: { sv: 'Innebandy', en: 'Floorball' },
}

export function AthleteDrillList({ athletePosition }: AthleteDrillListProps) {
  const t = useTranslations('components.athleteDrillList')
  const locale = useLocale()
  const currentLocale = appLocale(locale)
  const [drills, setDrills] = useState<Drill[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchDrills = async () => {
      try {
        const res = await fetch('/api/athlete/drills')
        if (res.ok) {
          const data = await res.json()
          setDrills(data.drills || [])
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    void fetchDrills()
  }, [])

  const markViewed = useCallback((drill: Drill) => {
    if (drill.viewedAt) return
    setDrills((prev) =>
      prev.map((d) => (d.id === drill.id ? { ...d, viewedAt: new Date().toISOString() } : d))
    )
    void fetch(`/api/athlete/drills/${drill.id}/view`, { method: 'POST' }).catch(() => {})
  }, [])

  const handleAcknowledge = useCallback(async (drill: Drill) => {
    if (drill.acknowledgedAt) return
    setAcknowledgingId(drill.id)
    try {
      const res = await fetch(`/api/athlete/drills/${drill.id}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledge: true }),
      })
      if (res.ok) {
        const data = await res.json()
        setDrills((prev) =>
          prev.map((d) =>
            d.id === drill.id
              ? { ...d, viewedAt: data.viewedAt, acknowledgedAt: data.acknowledgedAt }
              : d
          )
        )
      }
    } catch {
      // non-critical
    } finally {
      setAcknowledgingId(null)
    }
  }, [])

  const toggleExpanded = useCallback(
    (drill: Drill) => {
      setExpandedId((prev) => {
        const next = prev === drill.id ? null : drill.id
        if (next) markViewed(drill)
        return next
      })
    },
    [markViewed]
  )

  if (loading) return null
  if (drills.length === 0) return null

  const todayKey = localDayKey(new Date())
  const today = drills.filter((d) => d.scheduledDate && scheduledDayKey(d.scheduledDate) === todayKey)
  const upcoming = drills
    .filter((d) => d.scheduledDate && scheduledDayKey(d.scheduledDate) > todayKey)
    .sort((a, b) => (a.scheduledDate as string).localeCompare(b.scheduledDate as string))
  const earlier = drills.filter((d) => !d.scheduledDate || scheduledDayKey(d.scheduledDate) < todayKey)

  const renderDrill = (drill: Drill, list: Drill[], highlight = false) => {
    const isExpanded = expandedId === drill.id
    const isAcknowledged = !!drill.acknowledgedAt
    return (
      <div key={drill.id} className={highlight ? 'rounded-lg border border-primary/30 bg-primary/5 px-3' : ''}>
        <div
          className="cursor-pointer flex items-start justify-between py-2"
          onClick={() => toggleExpanded(drill)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {isAcknowledged && (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
              )}
              <p className="font-medium text-sm truncate">{drill.title}</p>
              {!drill.viewedAt && (
                <Badge className="text-[9px] px-1.5 py-0 shrink-0">{t('newBadge')}</Badge>
              )}
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {drill.scheduledDate
                ? `${formatDate(drill.scheduledDate, locale)} · ${drill.createdBy.name}`
                : `${formatDate(drill.createdAt, locale)} · ${drill.createdBy.name}`}
              {drill.team && ` · ${drill.team.name}`}
            </p>
          </div>
          <Badge variant="outline" className="text-[9px] shrink-0">
            {SPORT_LABELS[drill.sportType]?.[currentLocale] || drill.sportType}
          </Badge>
        </div>

        {isExpanded && (
          <div className="pb-3 space-y-3">
            {drill.description && (
              <p className="text-sm text-muted-foreground">{drill.description}</p>
            )}
            <AthleteDrillViewer
              title={drill.title}
              description={drill.description || undefined}
              structure={drill.structure}
              sportType={drill.sportType}
              highlightPosition={athletePosition}
            />

            {/* Acknowledge button */}
            <div className="flex justify-center pt-1">
              {isAcknowledged ? (
                <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('acknowledged')}
                </div>
              ) : (
                <Button
                  size="sm"
                  disabled={acknowledgingId === drill.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleAcknowledge(drill)
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  {acknowledgingId === drill.id ? t('acknowledging') : t('acknowledge')}
                </Button>
              )}
            </div>
          </div>
        )}

        {!isExpanded && !highlight && list.indexOf(drill) < list.length - 1 && (
          <div className="border-b" />
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {today.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {t('todaySection')}
            </p>
            {today.map((drill) => renderDrill(drill, today, true))}
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="space-y-1 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('upcomingSection')}
            </p>
            {upcoming.map((drill) => renderDrill(drill, upcoming))}
          </div>
        )}

        {earlier.length > 0 && (
          <div className="space-y-1 pt-1">
            {(today.length > 0 || upcoming.length > 0) && (
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('earlierSection')}
              </p>
            )}
            {earlier.map((drill) => renderDrill(drill, earlier))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
