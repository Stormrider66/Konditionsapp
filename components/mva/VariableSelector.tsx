'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Play, Sparkles } from 'lucide-react'
import { useLocale } from '@/i18n/client'

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

const CATEGORY_NAMES: Record<'en' | 'sv', Record<string, string>> = {
  en: {
    PHYSIOLOGICAL: 'Physiological',
    BODY_COMPOSITION: 'Body composition',
    TRAINING_LOAD: 'Training load',
    DAILY_MONITORING: 'Daily monitoring',
    PERFORMANCE: 'Performance',
    STRENGTH: 'Strength',
    RECOVERY: 'Recovery',
    GAIT: 'Gait',
    INTEGRATION: 'Integrations',
    TEMPORAL: 'Trends',
  },
  sv: {
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
  },
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

const HOCKEY_VARIABLE_PRESETS = [
  {
    id: 'explosive-power',
    label: 'Explosive power',
    description: 'MuscleLab, jumps, acceleration and agility.',
    variableIds: [
      'hockey_musclelab_power_wkg',
      'hockey_musclelab_max_force',
      'hockey_standing_long_jump',
      'hockey_three_jump_best',
      'hockey_ice_sprint_5m',
      'hockey_ice_sprint_10m',
      'hockey_ice_agility_5_10_5',
    ],
  },
  {
    id: 'on-ice-speed',
    label: 'On-ice speed',
    description: '5-30m sprint profile and change of direction.',
    variableIds: [
      'hockey_ice_sprint_5m',
      'hockey_ice_sprint_10m',
      'hockey_ice_sprint_20m',
      'hockey_ice_sprint_30m',
      'hockey_ice_agility_5_10_5',
    ],
  },
  {
    id: 'repeated-sprint',
    label: 'Repeated sprint',
    description: '7x40 speed, drop, resistance and beep score.',
    variableIds: [
      'hockey_7x40_best_kmh',
      'hockey_7x40_average_kmh',
      'hockey_7x40_resistance_pct',
      'hockey_7x40_drop_pct',
      'hockey_beep_test_level',
    ],
  },
  {
    id: 'strength',
    label: 'Strength',
    description: 'Lower/upper body max strength and grip.',
    variableIds: [
      'hockey_back_squat_1rm',
      'hockey_power_clean_1rm',
      'hockey_bench_press_1rm',
      'hockey_pullup_1rm',
      'hockey_grip_strength_max',
      'relative_strength',
    ],
  },
  {
    id: 'aerobic-readiness',
    label: 'Aerobic + readiness',
    description: 'Endurance, VO2 and recovery context.',
    variableIds: [
      'vo2max',
      'hockey_beep_test_level',
      'hockey_7x40_average_kmh',
      'hockey_7x40_resistance_pct',
      'readiness_mean',
      'sleep_quality_mean',
      'fatigue_mean',
      'acute_load',
      'acwr',
    ],
  },
  {
    id: 'target-gaps',
    label: 'Target gaps',
    description: 'Gap to J18/J20/A-team targets. CSV export uses saved team norms.',
    variableIds: [
      'gap_musclelab_wkg_to_target',
      'gap_sprint_10m_s_to_target',
      'gap_7x40_mean_kmh_to_target',
      'gap_back_squat_x_bw_to_target',
    ],
  },
] as const

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
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const t = (svText: string, enText: string) => locale === 'sv' ? svText : enText
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
  const isHockeyTeam = teamSportType === 'TEAM_ICE_HOCKEY'
  const availableIds = useMemo(() => new Set(variables.map((variable) => variable.id)), [variables])

  const applyPreset = (ids: readonly string[]) => {
    const next = ids.filter((id) => availableIds.has(id))
    setSelectedIds(new Set(next))
    setActiveCategory(null)
  }

  return (
    <Card className="dark:bg-slate-900/50 dark:border-white/10">
      <CardHeader>
        <CardTitle className="dark:text-white">{t('Välj variabler för analys', 'Select variables for analysis')}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t(
            'Välj vilka variabler som ska inkluderas i PCA-analysen. Variabler med låg datatäckning kan exkluderas automatiskt.',
            'Choose which variables to include in the PCA analysis. Variables with low data coverage may be excluded automatically.'
          )}
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
            {t('Alla', 'All')} ({variables.length})
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
                {CATEGORY_NAMES[locale][cat] ?? cat} ({selectedInCat}/{count})
              </Button>
            )
          })}
        </div>

        {isHockeyTeam && (
          <div className="rounded-lg border bg-muted/20 p-3 dark:border-white/10">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-500" />
              <div>
                <p className="text-sm font-medium dark:text-white">Hockey/SIMCA presets</p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    'Snabbval för PCA/PLS. Target-gap preset speglar standardnormer i appen och sparade normer i CSV-exporten.',
                    'Quick selections for PCA/PLS. The target-gap preset reflects standard app norms and saved norms in the CSV export.'
                  )}
                </p>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {HOCKEY_VARIABLE_PRESETS.map((preset) => {
                const availableCount = preset.variableIds.filter((id) => availableIds.has(id)).length
                const disabled = availableCount === 0
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => applyPreset(preset.variableIds)}
                    className="rounded-md border px-3 py-2 text-left transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold dark:text-white">{preset.label}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {availableCount}/{preset.variableIds.length}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{preset.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Select all/none for active category */}
        {activeCategory && (
          <div className="flex gap-2 text-sm">
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectAllInCategory(activeCategory)}
            >
              {t('Markera alla', 'Select all')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deselectAllInCategory(activeCategory)}
            >
              {t('Avmarkera alla', 'Deselect all')}
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
                  <span className="text-sm dark:text-slate-200 truncate">{locale === 'sv' ? v.nameSv : v.name}</span>
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
            {selectedCount} {selectedCount === 1 ? t('variabel vald', 'variable selected') : t('variabler valda', 'variables selected')}
          </p>
          <Button
            onClick={() => onRunAnalysis(Array.from(selectedIds))}
            disabled={loading || selectedCount < 3}
            size="lg"
          >
            <Play className="mr-2 h-4 w-4" />
            {t('Kör analys', 'Run analysis')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
