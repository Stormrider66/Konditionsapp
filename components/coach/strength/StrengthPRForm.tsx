'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Search } from 'lucide-react'

interface Exercise {
  id: string
  name: string
  nameSv: string | null
  biomechanicalPillar: string
}

interface StrengthPRFormProps {
  clientId: string
  clientName: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function StrengthPRForm({ clientId, clientName, onSuccess, onCancel }: StrengthPRFormProps) {
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

  // Calculated 1RM preview
  const [estimated1RM, setEstimated1RM] = useState<number | null>(null)

  // Fetch exercises on mount
  useEffect(() => {
    async function fetchExercises() {
      try {
        const response = await fetch('/api/exercises?limit=200')
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
    fetchExercises()
  }, [])

  // Calculate 1RM when load or reps change (Epley formula)
  useEffect(() => {
    const loadNum = parseFloat(load)
    const repsNum = parseInt(reps)

    if (loadNum > 0 && repsNum > 0 && repsNum <= 12) {
      // Epley formula: 1RM = weight × (1 + reps/30)
      const epley1RM = loadNum * (1 + repsNum / 30)
      setEstimated1RM(Math.round(epley1RM * 10) / 10)
    } else {
      setEstimated1RM(null)
    }
  }, [load, reps])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (!exerciseId) {
      setError('Välj en övning')
      setIsSubmitting(false)
      return
    }

    if (!load || parseFloat(load) <= 0) {
      setError('Ange en giltig belastning')
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
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create strength PR')
      }

      const result = await response.json()

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

  const pillarLabels: Record<string, string> = {
    POSTERIOR_CHAIN: 'Bakkedja',
    KNEE_DOMINANCE: 'Knädominant',
    UNILATERAL: 'Unilateral',
    FOOT_ANKLE: 'Fot/Ankel',
    CORE: 'Core',
    UPPER_BODY: 'Överkropp',
    PLYOMETRIC: 'Plyometri',
    OTHER: 'Övrigt',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Exercise Selection */}
      <div className="space-y-2">
        <Label htmlFor="exercise">Övning *</Label>
        {isLoadingExercises ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Laddar övningar...
          </div>
        ) : (
          <div className="space-y-2">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Sök övning..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={exerciseId} onValueChange={setExerciseId}>
              <SelectTrigger>
                <SelectValue placeholder="Välj övning..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Object.keys(groupedExercises).length === 0 ? (
                  <div className="px-2 py-3 text-sm text-gray-500 text-center">
                    Inga övningar matchar sökningen
                  </div>
                ) : (
                  Object.entries(groupedExercises).map(([pillar, exs]) => (
                    <div key={pillar}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                        {pillarLabels[pillar] || pillar}
                      </div>
                      {exs.map((ex) => (
                        <SelectItem key={ex.id} value={ex.id}>
                          {ex.nameSv || ex.name}
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
        <Label htmlFor="date">Datum</Label>
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
          <Label htmlFor="load">Belastning (kg) *</Label>
          <Input
            id="load"
            type="number"
            step="0.5"
            min="0"
            placeholder="100"
            value={load}
            onChange={(e) => setLoad(e.target.value)}
            required
          />
        </div>
      </div>

      {/* RPE (optional) */}
      <div className="space-y-2">
        <Label htmlFor="rpe">RPE (valfritt)</Label>
        <Select value={rpe} onValueChange={setRpe}>
          <SelectTrigger>
            <SelectValue placeholder="Välj RPE..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">6 - Lätt</SelectItem>
            <SelectItem value="7">7 - Medel</SelectItem>
            <SelectItem value="8">8 - Tungt</SelectItem>
            <SelectItem value="9">9 - Mycket tungt</SelectItem>
            <SelectItem value="10">10 - Maximal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 1RM Preview */}
      {estimated1RM && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            Estimerad 1RM: <strong>{estimated1RM} kg</strong>
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Baserat på {reps} reps @ {load} kg (Epley formel)
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
            Avbryt
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || !exerciseId || !load}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sparar...
            </>
          ) : (
            'Spara styrke-PR'
          )}
        </Button>
      </div>
    </form>
  )
}
