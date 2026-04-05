'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IceHockeyRink, type DrillStructure } from '@/components/coach/drills/IceHockeyRink'
import { ClipboardList } from 'lucide-react'

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

export function AthleteDrillList() {
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
    fetchDrills()
  }, [])

  if (loading) return null
  if (drills.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Övningar från tränaren
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {drills.map((drill) => (
          <div
            key={drill.id}
            className="cursor-pointer"
            onClick={() => setExpandedId(expandedId === drill.id ? null : drill.id)}
          >
            <div className="flex items-start justify-between py-2">
              <div>
                <p className="font-medium text-sm">{drill.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(drill.createdAt)} · {drill.createdBy.name}
                  {drill.team && ` · ${drill.team.name}`}
                </p>
              </div>
              <Badge variant="outline" className="text-[9px] shrink-0">
                {drill.sportType === 'ICE_HOCKEY' ? 'Ishockey' : drill.sportType}
              </Badge>
            </div>
            {expandedId === drill.id && (
              <div className="pb-3">
                {drill.description && (
                  <p className="text-sm text-muted-foreground mb-3">{drill.description}</p>
                )}
                <IceHockeyRink structure={drill.structure} className="mx-auto" />
              </div>
            )}
            {expandedId !== drill.id && drills.indexOf(drill) < drills.length - 1 && (
              <div className="border-b" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
