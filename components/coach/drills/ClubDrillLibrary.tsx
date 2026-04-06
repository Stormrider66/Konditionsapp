'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IceHockeyRink, type DrillStructure } from './IceHockeyRink'
import { DrillAnimationPlayer } from './DrillAnimationPlayer'
import type { DrillSportType } from '@/remotion/drills/surfaces'
import {
  Search,
  Copy,
  Play,
  Globe,
  Users,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'

interface SharedDrill {
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

interface Team {
  id: string
  name: string
}

interface ClubDrillLibraryProps {
  teams: Team[]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: 'Manuell',
  CLIPBOARD_PHOTO: 'AI-foto',
  MANUAL_EDITOR: 'Ritad',
  AI_TEXT: 'AI-text',
  TEMPLATE: 'Mall',
}

export function ClubDrillLibrary({ teams }: ClubDrillLibraryProps) {
  const [drills, setDrills] = useState<SharedDrill[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sportFilter, setSportFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [animatingId, setAnimatingId] = useState<string | null>(null)
  const [copying, setCopying] = useState<string | null>(null)

  useEffect(() => {
    const fetchDrills = async () => {
      try {
        const res = await fetch('/api/coach/drills?shared=true')
        if (res.ok) {
          const data = await res.json()
          setDrills(data.drills || [])
        }
      } catch {
        toast.error('Kunde inte hämta övningar')
      } finally {
        setLoading(false)
      }
    }
    fetchDrills()
  }, [])

  const filtered = useMemo(() => {
    let result = drills
    if (sportFilter !== 'all') {
      result = result.filter((d) => d.sportType === sportFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q) ||
          d.createdBy.name.toLowerCase().includes(q) ||
          d.team?.name.toLowerCase().includes(q)
      )
    }
    return result
  }, [drills, sportFilter, searchQuery])

  const handleCopyToTeam = async (drillId: string, targetTeamId: string) => {
    const drill = drills.find((d) => d.id === drillId)
    if (!drill) return

    setCopying(drillId)
    try {
      const res = await fetch('/api/coach/drills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: drill.title,
          description: drill.description,
          teamId: targetTeamId,
          sportType: drill.sportType,
          structure: drill.structure,
          sourceType: drill.sourceType,
          isPublished: true,
        }),
      })

      if (!res.ok) throw new Error('Failed')

      const team = teams.find((t) => t.id === targetTeamId)
      toast.success(`Kopierad till ${team?.name || 'laget'}!`)
    } catch {
      toast.error('Kunde inte kopiera övningen')
    } finally {
      setCopying(null)
    }
  }

  // Unique sport types in the data
  const sportTypes = useMemo(() => {
    const types = new Set(drills.map((d) => d.sportType))
    return Array.from(types)
  }, [drills])

  const SPORT_LABELS: Record<string, string> = {
    ICE_HOCKEY: 'Ishockey',
    FOOTBALL: 'Fotboll',
    HANDBALL: 'Handboll',
    BASKETBALL: 'Basket',
    FLOORBALL: 'Innebandy',
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sök övningar..."
            className="pl-8 h-8 text-sm"
          />
        </div>
        {sportTypes.length > 1 && (
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla sporter</SelectItem>
              {sportTypes.map((st) => (
                <SelectItem key={st} value={st}>
                  {SPORT_LABELS[st] || st}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} övningar i klubbbiblioteket
      </p>

      {/* Drill cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>Inga delade övningar hittades</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((drill) => {
            const isExpanded = expandedId === drill.id
            const isAnimating = animatingId === drill.id

            return (
              <Card
                key={drill.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setExpandedId(isExpanded ? null : drill.id)
                  setAnimatingId(null)
                }}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{drill.title}</h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {formatDate(drill.createdAt)}
                        <span>·</span>
                        <span>{drill.createdBy.name}</span>
                        {drill.team ? (
                          <>
                            <span>·</span>
                            <Users className="h-3 w-3" />
                            <span>{drill.team.name}</span>
                          </>
                        ) : (
                          <>
                            <span>·</span>
                            <Globe className="h-3 w-3" />
                            <span>Hela klubben</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Badge variant="outline" className="text-[9px]">
                        {SPORT_LABELS[drill.sportType] || drill.sportType}
                      </Badge>
                      {SOURCE_LABELS[drill.sourceType] && (
                        <Badge variant="secondary" className="text-[9px]">
                          {SOURCE_LABELS[drill.sourceType]}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {drill.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {drill.description}
                    </p>
                  )}

                  {/* Expanded view */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-3" onClick={(e) => e.stopPropagation()}>
                      {isAnimating ? (
                        <DrillAnimationPlayer
                          title={drill.title}
                          description={drill.description || undefined}
                          structure={drill.structure}
                          locale="sv"
                          sportType={(drill.sportType as DrillSportType) || 'ICE_HOCKEY'}
                        />
                      ) : (
                        <IceHockeyRink structure={drill.structure} className="mx-auto" />
                      )}

                      <div className="flex flex-wrap items-center gap-2 justify-center">
                        {drill.structure.movements?.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAnimatingId(isAnimating ? null : drill.id)}
                          >
                            <Play className="h-3.5 w-3.5 mr-1" />
                            {isAnimating ? 'Diagram' : 'Animera'}
                          </Button>
                        )}

                        {teams.length > 0 && (
                          <Select
                            onValueChange={(teamId) => handleCopyToTeam(drill.id, teamId)}
                            disabled={copying === drill.id}
                          >
                            <SelectTrigger className="h-8 w-auto text-xs">
                              <Copy className="h-3 w-3 mr-1" />
                              <SelectValue placeholder="Kopiera till lag..." />
                            </SelectTrigger>
                            <SelectContent>
                              {teams.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
