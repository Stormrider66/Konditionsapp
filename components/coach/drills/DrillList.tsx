'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IceHockeyRink, type DrillStructure } from './IceHockeyRink'
import { DrillAnimationPlayer } from './DrillAnimationPlayer'
import type { DrillSportType } from '@/remotion/drills/surfaces'
import { Button } from '@/components/ui/button'
import { ClipboardList, Play, Download } from 'lucide-react'
import { exportDrillPDF } from '@/lib/drills/export-pdf'
import { toast } from 'sonner'
import { useLocale, useTranslations } from '@/i18n/client'

interface Drill {
  id: string
  title: string
  description: string | null
  sportType: string
  structure: DrillStructure
  sourceType: string
  isPublished: boolean
  createdAt: string
  team: { name: string } | null
  createdBy: { name: string }
}

interface DrillListProps {
  teamId?: string
}

function formatDate(iso: string, locale: 'en' | 'sv'): string {
  return new Date(iso).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function DrillList({ teamId }: DrillListProps) {
  const t = useTranslations('components.drills')
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const [drills, setDrills] = useState<Drill[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [animatingId, setAnimatingId] = useState<string | null>(null)
  const rinkRef = useRef<HTMLDivElement>(null)

  const handleExportPDF = useCallback(
    async (drill: Drill) => {
      // Find the SVG element inside the rink container
      const svg = rinkRef.current?.querySelector('svg')
      if (!svg) {
        toast.error(t('common.errors.diagramMissing'))
        return
      }
      try {
        await exportDrillPDF(svg as SVGSVGElement, {
          title: drill.title,
          description: drill.description || undefined,
          sportType: drill.sportType,
          structure: drill.structure,
          createdBy: drill.createdBy.name,
          teamName: drill.team?.name,
          createdAt: drill.createdAt,
          locale,
        })
        toast.success(t('common.toasts.pdfDownloaded'))
      } catch {
        toast.error(t('common.errors.exportFailed'))
      }
    },
    [locale, t]
  )

  useEffect(() => {
    const fetchDrills = async () => {
      try {
        const params = new URLSearchParams()
        if (teamId) params.set('teamId', teamId)
        const res = await fetch(`/api/coach/drills?${params}`)
        if (res.ok) {
          const data = await res.json()
          setDrills(data.drills || [])
        }
      } catch {
        toast.error(t('common.errors.fetchFailed'))
      } finally {
        setLoading(false)
      }
    }
    void fetchDrills()
  }, [teamId, t])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  if (drills.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p>{t('list.empty.title')}</p>
        <p className="text-xs mt-1">{t('list.empty.subtitle')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {drills.map((drill) => (
        <Card
          key={drill.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setExpandedId(expandedId === drill.id ? null : drill.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3 className="font-semibold">{drill.title}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{formatDate(drill.createdAt, locale)}</span>
                  <span>·</span>
                  <span>{drill.createdBy.name}</span>
                  {drill.team && (
                    <>
                      <span>·</span>
                      <span>{drill.team.name}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {drill.sourceType === 'CLIPBOARD_PHOTO' && (
                  <Badge variant="outline" className="text-[10px]">AI</Badge>
                )}
                <Badge variant={drill.isPublished ? 'default' : 'secondary'} className="text-[10px]">
                  {drill.isPublished ? t('common.labels.published') : t('common.labels.draft')}
                </Badge>
              </div>
            </div>

            {drill.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{drill.description}</p>
            )}

            {/* Expanded: show rink + animate toggle */}
            {expandedId === drill.id && (
              <div className="mt-4 pt-4 border-t space-y-3">
                {animatingId === drill.id ? (
                  <DrillAnimationPlayer
                    title={drill.title}
                    description={drill.description || undefined}
                    structure={drill.structure}
                    locale={locale}
                    sportType={(drill.sportType as DrillSportType) || 'ICE_HOCKEY'}
                  />
                ) : (
                  <div ref={rinkRef}>
                    <IceHockeyRink structure={drill.structure} className="mx-auto" />
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex justify-center gap-2">
                  {drill.structure.movements?.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setAnimatingId(animatingId === drill.id ? null : drill.id)
                      }}
                    >
                      <Play className="h-3.5 w-3.5 mr-1.5" />
                      {animatingId === drill.id ? t('common.actions.showDiagram') : t('common.actions.animate')}
                    </Button>
                  )}
                  {animatingId !== drill.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleExportPDF(drill)
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      PDF
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
