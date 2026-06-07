'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Search } from 'lucide-react'
import { PR_UNITS, PR_UNIT_LABELS, type PrUnit } from '@/lib/strength/units'
import { useLocale } from 'next-intl'
import { getExerciseDisplayName } from '@/lib/exercises/display-name'

type AppLocale = 'en' | 'sv'

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

const getPillarLabels = (locale: AppLocale): Record<string, string> => ({
  POSTERIOR_CHAIN: copy(locale, 'Posterior chain', 'Bakkedja'),
  KNEE_DOMINANCE: copy(locale, 'Knee dominant', 'Knädominant'),
  UNILATERAL: 'Unilateral',
  FOOT_ANKLE: copy(locale, 'Foot/Ankle', 'Fot/Ankel'),
  CORE: 'Core',
  UPPER_BODY: copy(locale, 'Upper body', 'Överkropp'),
  PLYOMETRIC: copy(locale, 'Plyometric', 'Plyometri'),
  OTHER: copy(locale, 'Other', 'Övrigt'),
})

const getPrUnitDescriptions = (locale: AppLocale): Record<PrUnit, string> => ({
  KG: copy(locale, 'Kilograms (1RM lift)', 'Kilogram (1RM-lyft)'),
  CM: copy(locale, 'Centimeters (height, e.g. box jump)', 'Centimeter (höjd, t.ex. box jump)'),
  M: copy(locale, 'Meters (distance, e.g. broad jump)', 'Meter (avstånd, t.ex. längdhopp)'),
  S: copy(locale, 'Seconds (time, e.g. sprint, plank)', 'Sekunder (tid, t.ex. sprint, plank)'),
  W: copy(locale, 'Watts (power, e.g. FTP)', 'Watt (effekt, t.ex. FTP)'),
  COUNT: copy(locale, 'Rep count (e.g. max push-ups)', 'Antal reps (t.ex. max push-ups)'),
  KMH: copy(locale, 'Kilometers/hour (speed)', 'Kilometer/timme (hastighet)'),
})

interface Exercise {
  id: string
  name: string
  nameSv: string | null
  nameEn?: string | null
  biomechanicalPillar: string
}

interface StrengthPRFormProps {
  clientId: string
  clientName: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function StrengthPRForm({ clientId, clientName: _clientName, onSuccess, onCancel }: StrengthPRFormProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingExercises, setIsLoadingExercises] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Form state
  const [exerciseId, setExerciseId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [sets, setSets] = useState('1')
  const [reps, setReps] = useState('1')
  const [load, setLoad] = useState('')
  const [rpe, setRpe] = useState('')
  const [unit, setUnit] = useState<PrUnit>('KG')

  // Fetch exercises on mount
  useEffect(() => {
    async function fetchExercises() {
      try {
        const response = await fetch('/api/exercises?limit=200&surface=strength-studio')
        if (response.ok) {
          const data = await response.json()
          setExercises(data.exercises || data)
        }
      } catch (err) {
        console.error('Error fetching exercises:', err)
      } finally {
        setIsLoadingExercises(false)
      }
    }
    void fetchExercises()
  }, [])

  // Calculate 1RM when load or reps change (Epley formula)
  const estimated1RM = useMemo(() => {
    const loadNum = parseFloat(load)
    const repsNum = parseInt(reps)

    if (loadNum > 0 && repsNum > 0 && repsNum <= 12) {
      // Epley formula: 1RM = weight × (1 + reps/30)
      const epley1RM = loadNum * (1 + repsNum / 30)
      return Math.round(epley1RM * 10) / 10
    }
    return null
  }, [load, reps])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (!exerciseId) {
      setError(copy(locale, 'Select an exercise', 'Välj en övning'))
      setIsSubmitting(false)
      return
    }

    if (!load || parseFloat(load) <= 0) {
      setError(copy(locale, 'Enter a valid load', 'Ange en giltig belastning'))
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/strength-pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          exerciseId,
          date,
          sets: parseInt(sets),
          reps: parseInt(reps),
          load: parseFloat(load),
          rpe: rpe ? parseInt(rpe) : undefined,
          unit,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create strength PR')
      }

      await response.json()

      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter exercises by search query
  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return exercises
    const query = searchQuery.toLowerCase()
    return exercises.filter(ex =>
      ex.name.toLowerCase().includes(query) ||
      (ex.nameSv && ex.nameSv.toLowerCase().includes(query))
    )
  }, [exercises, searchQuery])

  // Group exercises by pillar
  const groupedExercises = filteredExercises.reduce((acc, ex) => {
    const pillar = ex.biomechanicalPillar || 'OTHER'
    if (!acc[pillar]) acc[pillar] = []
    acc[pillar].push(ex)
    return acc
  }, {} as Record<string, Exercise[]>)

  const pillarLabels = getPillarLabels(locale)
  const prUnitDescriptions = getPrUnitDescriptions(locale)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Exercise Selection */}
      <div className="space-y-2">
        <Label htmlFor="exercise">{copy(locale, 'Exercise', 'Övning')} *</Label>
        {isLoadingExercises ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {copy(locale, 'Loading exercises...', 'Laddar övningar...')}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={copy(locale, 'Search exercise...', 'Sök övning...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={exerciseId} onValueChange={setExerciseId}>
              <SelectTrigger>
                <SelectValue placeholder={copy(locale, 'Select exercise...', 'Välj övning...')} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Object.keys(groupedExercises).length === 0 ? (
                  <div className="px-2 py-3 text-sm text-gray-500 text-center">
                    {copy(locale, 'No exercises match the search', 'Inga övningar matchar sökningen')}
                  </div>
                ) : (
                  Object.entries(groupedExercises).map(([pillar, exs]) => (
                    <div key={pillar}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                        {pillarLabels[pillar] || pillar}
                      </div>
                      {exs.map((ex) => (
                        <SelectItem key={ex.id} value={ex.id}>
                          {getExerciseDisplayName(ex, locale)}
                        </SelectItem>
                      ))}
                    </div>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">{copy(locale, 'Date', 'Datum')}</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* Sets, Reps, Load */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="sets">Set</Label>
          <Input
            id="sets"
            type="number"
            min="1"
            max="10"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reps">Reps</Label>
          <Input
            id="reps"
            type="number"
            min="1"
            max="30"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="load">
            {copy(locale, 'Load', 'Belastning')} ({PR_UNIT_LABELS[unit]}) *
          </Label>
          <Input
            id="load"
            type="number"
            step="0.5"
            min="0"
            placeholder={unit === 'KG' ? '100' : ''}
            value={load}
            onChange={(e) => setLoad(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Unit picker. Defaults to KG so existing strength workflows
          stay untouched. Non-KG units track sport-specific PRs (box
          jump cm, sprint seconds, etc.) — those entries don't feed
          into the runner's % av 1RM resolution. */}
      <div className="space-y-2">
        <Label htmlFor="pr-unit">{copy(locale, 'Unit', 'Enhet')}</Label>
        <Select value={unit} onValueChange={(v) => setUnit(v as PrUnit)}>
          <SelectTrigger id="pr-unit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PR_UNITS.map((u) => (
              <SelectItem key={u} value={u}>
                <span className="font-mono mr-2">{PR_UNIT_LABELS[u]}</span>
                <span className="text-muted-foreground text-xs">
                  {prUnitDescriptions[u]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {unit !== 'KG' && (
          <p className="text-[11px] text-muted-foreground">
            {copy(locale, 'Non-KG values are not used for "% of 1RM" calculations in workouts.', 'Icke-KG värden används inte för "% av 1RM"-beräkning i pass.')}
          </p>
        )}
      </div>

      {/* RPE (optional) */}
      <div className="space-y-2">
        <Label htmlFor="rpe">RPE ({copy(locale, 'optional', 'valfritt')})</Label>
        <Select value={rpe} onValueChange={setRpe}>
          <SelectTrigger>
            <SelectValue placeholder={copy(locale, 'Select RPE...', 'Välj RPE...')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">6 - {copy(locale, 'Easy', 'Lätt')}</SelectItem>
            <SelectItem value="7">7 - {copy(locale, 'Moderate', 'Medel')}</SelectItem>
            <SelectItem value="8">8 - {copy(locale, 'Heavy', 'Tungt')}</SelectItem>
            <SelectItem value="9">9 - {copy(locale, 'Very heavy', 'Mycket tungt')}</SelectItem>
            <SelectItem value="10">10 - {copy(locale, 'Maximal', 'Maximal')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 1RM Preview — only meaningful in KG (Epley assumes weight). */}
      {estimated1RM && unit === 'KG' && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            {copy(locale, 'Estimated 1RM', 'Estimerad 1RM')}: <strong>{estimated1RM} kg</strong>
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {copy(locale, 'Based on', 'Baserat på')} {reps} reps @ {load} kg ({copy(locale, 'Epley formula', 'Epley formel')})
          </p>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {copy(locale, 'Cancel', 'Avbryt')}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || !exerciseId || !load}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {copy(locale, 'Saving...', 'Sparar...')}
            </>
          ) : (
            copy(locale, 'Save strength PR', 'Spara styrke-PR')
          )}
        </Button>
      </div>
    </form>
  )
}
