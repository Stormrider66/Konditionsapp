// components/coach/program-editor/ExerciseSwapper.tsx
/**
 * Exercise Swapper Component
 *
 * Allows coaches to swap exercises in strength workouts while:
 * - Maintaining biomechanical pillar balance (or allowing cross-pillar swaps)
 * - Filtering by progression level (easier/same/harder)
 * - Filtering by equipment availability
 * - Showing exercise alternatives with similarity scores
 * - Preserving sets/reps/load when swapping
 *
 * Features:
 * - Exercise library search and filter
 * - Alternative exercise suggestions
 * - Progression path display (easier → current → harder)
 * - Equipment filtering
 * - Biomechanical pillar filtering
 * - Preview before swap
 */

'use client'

import { useState, useEffect } from 'react'
import { Exercise, BiomechanicalPillar, ProgressionLevel } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, ArrowRight, TrendingUp, TrendingDown, Minus, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface ExerciseSwapperProps {
  currentExercise: Exercise
  segmentIndex: number
  onSwap: (newExerciseId: string) => void
  onCancel: () => void
}

interface ExerciseWithSimilarity extends Exercise {
  similarity?: 'SAME_LEVEL' | 'EASIER' | 'HARDER' | 'DIFFERENT_PILLAR'
  matchScore?: number
}

export function ExerciseSwapper({
  currentExercise,
  segmentIndex,
  onSwap,
  onCancel,
}: ExerciseSwapperProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPillar, setSelectedPillar] = useState<BiomechanicalPillar | 'ALL'>(
    currentExercise.biomechanicalPillar || 'ALL'
  )
  const [selectedLevel, setSelectedLevel] = useState<ProgressionLevel | 'ALL'>('ALL')
  const [equipmentFilter, setEquipmentFilter] = useState<string[]>([])
  const [allowCrossPillar, setAllowCrossPillar] = useState(false)

  // Exercise library state
  const [exercises, setExercises] = useState<ExerciseWithSimilarity[]>([])
  const [alternatives, setAlternatives] = useState<ExerciseWithSimilarity[]>([])
  const [progressionPath, setProgressionPath] = useState<{
    easier: Exercise | null
    current: Exercise
    harder: Exercise | null
  } | null>(null)

  // Selected exercise state
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)

  // Fetch exercise library on mount
  useEffect(() => {
    fetchExercises()
    fetchAlternatives()
    fetchProgressionPath()
  }, [])

  // Fetch all exercises with filters
  const fetchExercises = async () => {
    setIsLoading(true)

    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (selectedPillar !== 'ALL') params.append('pillar', selectedPillar)
      if (selectedLevel !== 'ALL') params.append('level', selectedLevel)
      if (equipmentFilter.length > 0) params.append('equipment', equipmentFilter.join(','))

      const response = await fetch(`/api/exercises?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch exercises')

      const data = await response.json()
      setExercises(data.exercises || [])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load exercises',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch alternative exercises (same pillar)
  const fetchAlternatives = async () => {
    try {
      const response = await fetch(
        `/api/exercises/${currentExercise.id}/alternatives?samePillar=true`
      )
      if (!response.ok) throw new Error('Failed to fetch alternatives')

      const data = await response.json()
      setAlternatives(data.alternatives || [])
    } catch (error: any) {
      console.error('Failed to fetch alternatives:', error)
    }
  }

  // Fetch progression path (easier → current → harder)
  const fetchProgressionPath = async () => {
    try {
      const response = await fetch(`/api/exercises/${currentExercise.id}/progression-path`)
      if (!response.ok) throw new Error('Failed to fetch progression path')

      const data = await response.json()
      setProgressionPath(data)
    } catch (error: any) {
      console.error('Failed to fetch progression path:', error)
    }
  }

  // Handle search/filter changes
  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchExercises()
    }, 300)

    return () => clearTimeout(debounce)
  }, [searchTerm, selectedPillar, selectedLevel, equipmentFilter])

  // Handle exercise swap
  const handleSwap = () => {
    if (!selectedExercise) return

    onSwap(selectedExercise.id)
    toast({
      title: 'Exercise swapped',
      description: `Replaced ${currentExercise.name} with ${selectedExercise.name}`,
    })
  }

  // Calculate similarity badge
  const getSimilarityBadge = (exercise: ExerciseWithSimilarity) => {
    if (exercise.biomechanicalPillar !== currentExercise.biomechanicalPillar) {
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          Different Pillar
        </Badge>
      )
    }

    if (exercise.progressionLevel === currentExercise.progressionLevel) {
      return (
        <Badge variant="outline" className="text-green-600 border-green-600">
          <Minus className="h-3 w-3 mr-1" />
          Same Level
        </Badge>
      )
    }

    const currentLevelNum = parseInt(currentExercise.progressionLevel?.split('_')[1] || '2')
    const exerciseLevelNum = parseInt(exercise.progressionLevel?.split('_')[1] || '2')

    if (exerciseLevelNum < currentLevelNum) {
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-600">
          <TrendingDown className="h-3 w-3 mr-1" />
          Easier
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="text-red-600 border-red-600">
        <TrendingUp className="h-3 w-3 mr-1" />
        Harder
      </Badge>
    )
  }

  // Render exercise card
  const renderExerciseCard = (exercise: ExerciseWithSimilarity) => {
    const isSelected = selectedExercise?.id === exercise.id

    return (
      <Card
        key={exercise.id}
        className={`cursor-pointer transition-all ${
          isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
        }`}
        onClick={() => setSelectedExercise(exercise)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold">{exercise.name}</h4>
                {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
              </div>
              <p className="text-sm text-gray-600 mb-2">{exercise.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{exercise.biomechanicalPillar}</Badge>
                <Badge variant="secondary">{exercise.progressionLevel}</Badge>
                {exercise.equipment && (
                  <Badge variant="outline">{exercise.equipment}</Badge>
                )}
                {getSimilarityBadge(exercise)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Swap Exercise</DialogTitle>
          <DialogDescription>
            Replace <strong>{currentExercise.name}</strong> with an alternative exercise
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Filters */}
          <div className="space-y-4">
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search exercises..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Biomechanical Pillar</Label>
              <Select
                value={selectedPillar}
                onValueChange={(value) => setSelectedPillar(value as BiomechanicalPillar | 'ALL')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Pillars</SelectItem>
                  <SelectItem value="POSTERIOR_CHAIN">Posterior Chain</SelectItem>
                  <SelectItem value="KNEE_DOMINANCE">Knee Dominance</SelectItem>
                  <SelectItem value="UNILATERAL">Unilateral</SelectItem>
                  <SelectItem value="FOOT_ANKLE">Foot & Ankle</SelectItem>
                  <SelectItem value="ANTI_ROTATION_CORE">Core</SelectItem>
                  <SelectItem value="UPPER_BODY">Upper Body</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  id="allow-cross-pillar"
                  checked={allowCrossPillar}
                  onCheckedChange={(checked) => setAllowCrossPillar(checked as boolean)}
                />
                <Label htmlFor="allow-cross-pillar" className="text-sm font-normal">
                  Allow cross-pillar swaps
                </Label>
              </div>
            </div>

            <div>
              <Label>Progression Level</Label>
              <Select
                value={selectedLevel}
                onValueChange={(value) => setSelectedLevel(value as ProgressionLevel | 'ALL')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Levels</SelectItem>
                  <SelectItem value="LEVEL_1">Level 1 (Static)</SelectItem>
                  <SelectItem value="LEVEL_2">Level 2 (Strength)</SelectItem>
                  <SelectItem value="LEVEL_3">Level 3 (Dynamic)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Progression Path */}
            {progressionPath && (
              <div className="border rounded-lg p-4">
                <Label className="mb-2 block">Progression Path</Label>
                <div className="space-y-2">
                  {progressionPath.easier && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() =>
                        setSelectedExercise(progressionPath.easier as Exercise)
                      }
                    >
                      <TrendingDown className="h-4 w-4 mr-2 text-blue-500" />
                      {progressionPath.easier.name}
                    </Button>
                  )}
                  <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded">
                    <Minus className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">{progressionPath.current.name}</span>
                  </div>
                  {progressionPath.harder && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() =>
                        setSelectedExercise(progressionPath.harder as Exercise)
                      }
                    >
                      <TrendingUp className="h-4 w-4 mr-2 text-red-500" />
                      {progressionPath.harder.name}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Middle & Right: Exercise lists */}
          <div className="lg:col-span-2 space-y-4">
            {/* Alternatives (same pillar) */}
            {alternatives.length > 0 && (
              <div>
                <Label className="mb-2 block">Recommended Alternatives</Label>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 pr-4">
                    {alternatives.map((ex) => renderExerciseCard(ex))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* All exercises */}
            <div>
              <Label className="mb-2 block">
                All Exercises ({exercises.length})
              </Label>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-4">
                  {isLoading ? (
                    <div className="text-center py-8 text-gray-500">
                      Loading exercises...
                    </div>
                  ) : exercises.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No exercises found. Try adjusting filters.
                    </div>
                  ) : (
                    exercises.map((ex) => renderExerciseCard(ex))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Preview */}
        {selectedExercise && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-gray-600">Current Exercise</p>
                <p className="font-semibold">{currentExercise.name}</p>
                <Badge variant="secondary" className="mt-1">
                  {currentExercise.biomechanicalPillar}
                </Badge>
              </div>
              <ArrowRight className="h-6 w-6 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">New Exercise</p>
                <p className="font-semibold">{selectedExercise.name}</p>
                <div className="mt-1 flex gap-2">
                  <Badge variant="secondary">{selectedExercise.biomechanicalPillar}</Badge>
                  {getSimilarityBadge(selectedExercise)}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSwap} disabled={!selectedExercise}>
            Swap Exercise
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
