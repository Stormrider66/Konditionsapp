'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Play } from 'lucide-react'

interface VariableInfo {
  id: string
  name: string
  nameSv: string
  category: string
  unit: string
  coverage: number
  athleteCount: number
  totalAthletes: number
  sportRelevance?: string[]
}

interface VariableSelectorProps {
  variables: VariableInfo[]
  teamSportType: string | null
  onRunAnalysis: (selectedIds: string[]) => void
  loading: boolean
}

const CATEGORY_NAMES: Record<string, string> = {
  PHYSIOLOGICAL: 'Fysiologiska',
  BODY_COMPOSITION: 'Kroppssammansättning',
  TRAINING_LOAD: 'Träningsbelastning',
  DAILY_MONITORING: 'Daglig uppföljning',
  PERFORMANCE: 'Prestation',
  STRENGTH: 'Styrka',
  RECOVERY: 'Återhämtning',
  GAIT: 'Löpteknik',
  INTEGRATION: 'Integrationer',
  TEMPORAL: 'Trender',
}

const CATEGORY_ORDER = [
  'PHYSIOLOGICAL',
  'BODY_COMPOSITION',
  'TRAINING_LOAD',
  'DAILY_MONITORING',
  'PERFORMANCE',
  'STRENGTH',
  'RECOVERY',
  'GAIT',
  'INTEGRATION',
  'TEMPORAL',
]

function coverageColor(coverage: number): string {
  if (coverage >= 0.8) return 'bg-green-500'
  if (coverage >= 0.4) return 'bg-yellow-500'
  return 'bg-red-500'
}

function coverageBarBg(coverage: number): string {
  if (coverage >= 0.8) return 'bg-green-100 dark:bg-green-950/30'
  if (coverage >= 0.4) return 'bg-yellow-100 dark:bg-yellow-950/30'
  return 'bg-red-100 dark:bg-red-950/30'
}

export function VariableSelector({
  variables,
  teamSportType,
  onRunAnalysis,
  loading,
}: VariableSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // Default: all variables with coverage > 0
    return new Set(variables.filter((v) => v.coverage > 0).map((v) => v.id))
  })
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<string, VariableInfo[]>()
    for (const v of variables) {
      const list = map.get(v.category) ?? []
      list.push(v)
      map.set(v.category, list)
    }
    return map
  }, [variables])

  const categoriesToShow = useMemo(() => {
    return CATEGORY_ORDER.filter((cat) => grouped.has(cat))
  }, [grouped])

  const displayedVariables = useMemo(() => {
    if (activeCategory) return grouped.get(activeCategory) ?? []
    return variables
  }, [activeCategory, grouped, variables])

  const toggleVariable = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllInCategory = (category: string) => {
    const vars = grouped.get(category) ?? []
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const v of vars) next.add(v.id)
      return next
    })
  }

  const deselectAllInCategory = (category: string) => {
    const vars = grouped.get(category) ?? []
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const v of vars) next.delete(v.id)
      return next
    })
  }

  const isSportRelevant = (v: VariableInfo): boolean => {
    if (!teamSportType || !v.sportRelevance || v.sportRelevance.length === 0) return false
    return v.sportRelevance.includes(teamSportType)
  }

  const selectedCount = selectedIds.size

  return (
    <Card className="dark:bg-slate-900/50 dark:border-white/10">
      <CardHeader>
        <CardTitle className="dark:text-white">Välj variabler för analys</CardTitle>
        <p className="text-sm text-muted-foreground">
          Välj vilka variabler som ska inkluderas i PCA-analysen. Variabler med låg datatäckning kan exkluderas automatiskt.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category filter buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeCategory === null ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveCategory(null)}
          >
            Alla ({variables.length})
          </Button>
          {categoriesToShow.map((cat) => {
            const count = grouped.get(cat)?.length ?? 0
            const selectedInCat = (grouped.get(cat) ?? []).filter((v) => selectedIds.has(v.id)).length
            return (
              <Button
                key={cat}
                variant={activeCategory === cat ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              >
                {CATEGORY_NAMES[cat] ?? cat} ({selectedInCat}/{count})
              </Button>
            )
          })}
        </div>

        {/* Select all/none for active category */}
        {activeCategory && (
          <div className="flex gap-2 text-sm">
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectAllInCategory(activeCategory)}
            >
              Markera alla
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deselectAllInCategory(activeCategory)}
            >
              Avmarkera alla
            </Button>
          </div>
        )}

        {/* Variable list */}
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {displayedVariables.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/50"
            >
              <Checkbox
                checked={selectedIds.has(v.id)}
                onCheckedChange={() => toggleVariable(v.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm dark:text-slate-200 truncate">{v.nameSv}</span>
                  {isSportRelevant(v) && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                      {teamSportType}
                    </Badge>
                  )}
                </div>
              </div>
              {/* Coverage bar */}
              <div className="w-20 shrink-0">
                <div className={`h-2 rounded-full ${coverageBarBg(v.coverage)}`}>
                  <div
                    className={`h-full rounded-full ${coverageColor(v.coverage)}`}
                    style={{ width: `${Math.round(v.coverage * 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-muted-foreground w-10 text-right shrink-0">
                {Math.round(v.coverage * 100)}%
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t dark:border-white/10">
          <p className="text-sm text-muted-foreground">
            {selectedCount} variabler valda
          </p>
          <Button
            onClick={() => onRunAnalysis(Array.from(selectedIds))}
            disabled={loading || selectedCount < 3}
            size="lg"
          >
            <Play className="mr-2 h-4 w-4" />
            Kör analys
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
