'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DrillStructure } from '@/components/coach/drills/IceHockeyRink'
import { AthleteDrillViewer } from './AthleteDrillViewer'
import { ClipboardList, ChevronDown, ChevronUp } from 'lucide-react'
import { useLocale, useTranslations } from '@/i18n/client'

interface Drill {
  id: string
  title: string
  description: string | null
  sportType: string
  structure: DrillStructure
  createdAt: string
  team: { name: string } | null
  createdBy: { name: string }
}

interface AthleteDrillListProps {
  athletePosition?: string // e.g. "LW" — highlight on rink
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'sv-SE', { day: 'numeric', month: 'short' })
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

  if (loading) return null
  if (drills.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {drills.map((drill) => {
          const isExpanded = expandedId === drill.id
          return (
            <div key={drill.id}>
              <div
                className="cursor-pointer flex items-start justify-between py-2"
                onClick={() => setExpandedId(isExpanded ? null : drill.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-sm truncate">{drill.title}</p>
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(drill.createdAt, locale)} · {drill.createdBy.name}
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
                </div>
              )}

              {!isExpanded && drills.indexOf(drill) < drills.length - 1 && (
                <div className="border-b" />
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
