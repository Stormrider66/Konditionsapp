// components/coach/exercise-library/ExerciseLibraryBrowser.tsx
/**
 * Exercise Library Browser Component
 *
 * Comprehensive exercise library with:
 * - Search and advanced filtering
 * - Biomechanical pillar organization
 * - Progression level filtering
 * - Equipment filtering
 * - Category filtering (STRENGTH, PLYOMETRIC, CORE)
 * - Custom exercise creation
 * - Exercise preview with video/instructions
 * - Add to workout functionality
 * - Favorites/bookmarks
 * - Grid and list view
 *
 * Features:
 * - Real-time search
 * - Filter chips
 * - Sort options
 * - Pagination
 * - Exercise detail modal
 * - Progression path visualization
 * - Alternative exercises
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { Exercise, BiomechanicalPillar, ProgressionLevel } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Filter,
  Grid3x3,
  List,
  Plus,
  Star,
  StarOff,
  Play,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  EyeOff,
  ImagePlus,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { ExerciseImage } from '@/components/themed/ExerciseImage'
import { useLocale } from '@/i18n/client'
import { getBusinessScopeHeaders } from '@/lib/business-scope-client'
import { isStrengthStudioExercise } from '@/lib/strength/exercise-library-filters'

type AppLocale = 'en' | 'sv'

function copy(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

interface ExerciseLibraryBrowserProps {
  onSelectExercise?: (exercise: Exercise) => void
  mode?: 'browse' | 'select' // 'browse' for library view, 'select' for adding to workout
  userId?: string
  surface?: 'all' | 'strength-studio'
}

export function ExerciseLibraryBrowser({
  onSelectExercise,
  mode = 'browse',
  userId,
  surface = 'all',
}: ExerciseLibraryBrowserProps) {
  const { toast } = useToast()
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const pathname = usePathname()
  const businessHeaders = useMemo(() => getBusinessScopeHeaders(pathname), [pathname])
  const exerciseDisplayName = useCallback(
    (exercise: Exercise) => locale === 'sv'
      ? exercise.nameSv || exercise.name
      : exercise.nameEn || exercise.name,
    [locale],
  )

  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPillar, setSelectedPillar] = useState<BiomechanicalPillar | 'ALL'>('ALL')
  const [selectedLevel, setSelectedLevel] = useState<ProgressionLevel | 'ALL'>('ALL')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL')
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  const [showCustomOnly, setShowCustomOnly] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(24)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Data state
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  // Image generation state
  const [isGeneratingImages, setIsGeneratingImages] = useState(false)
  const [imageStats, setImageStats] = useState<{ withoutImages: number } | null>(null)

  // Progression path state
  const [progressionPath, setProgressionPath] = useState<{
    easier: Exercise | null
    current: Exercise
    harder: Exercise | null
  } | null>(null)

  // Fetch exercises with filters
  const fetchExercises = useCallback(async () => {
    setIsLoading(true)

    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (selectedPillar !== 'ALL') params.append('pillar', selectedPillar)
      if (selectedLevel !== 'ALL') params.append('level', selectedLevel)
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory)
      if (selectedDifficulty !== 'ALL') params.append('difficulty', selectedDifficulty)
      if (selectedEquipment.length > 0) params.append('equipment', selectedEquipment.join(','))
      if (showCustomOnly && userId) {
        params.append('userId', userId)
        params.append('isPublic', 'false')
      }
      if (surface === 'strength-studio') params.append('surface', 'strength-studio')
      params.append('limit', pageSize.toString())
      params.append('offset', ((currentPage - 1) * pageSize).toString())

      const response = await fetch(`/api/exercises?${params.toString()}`, {
        headers: businessHeaders,
      })
      if (!response.ok) throw new Error('Failed to fetch exercises')

      const data = await response.json()
      const nextExercises = data.exercises || []
      setExercises(surface === 'strength-studio'
        ? nextExercises.filter(isStrengthStudioExercise)
        : nextExercises
      )
      setTotalPages(data.pagination?.totalPages || 1)
      setTotalCount(data.pagination?.totalCount || 0)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load exercises',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [
    businessHeaders,
    searchTerm,
    selectedPillar,
    selectedLevel,
    selectedCategory,
    selectedDifficulty,
    selectedEquipment,
    showCustomOnly,
    userId,
    surface,
    pageSize,
    currentPage,
    toast,
  ])

  useEffect(() => {
    fetchExercises()
  }, [fetchExercises])

  // Load favorites from backend on mount
  useEffect(() => {
    async function loadFavorites() {
      try {
        const url = surface === 'strength-studio'
          ? '/api/exercises/favorites?surface=strength-studio'
          : '/api/exercises/favorites'
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          if (data.data) {
            setFavorites(new Set(data.data))
          }
        }
      } catch {
        // Non-critical — favorites just won't be pre-loaded
      }
    }
    loadFavorites()
  }, [surface])

  // Fetch image stats on mount
  useEffect(() => {
    async function loadImageStats() {
      try {
        const res = await fetch('/api/exercises/generate-images')
        if (res.ok) {
          const data = await res.json()
          setImageStats({ withoutImages: data.withoutImages })
        }
      } catch { /* non-critical */ }
    }
    loadImageStats()
  }, [])

  // Generate images for exercises missing them
  const generateImages = async () => {
    setIsGeneratingImages(true)
    try {
      const res = await fetch('/api/exercises/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 5 }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast({
          title: copy(locale, 'Error', 'Fel'),
          description: data.error || copy(locale, 'Could not generate images', 'Kunde inte generera bilder'),
          variant: 'destructive',
        })
        return
      }

      toast({
        title: copy(locale, `${data.generated} images generated`, `${data.generated} bilder genererade`),
        description: data.remaining > 0
          ? copy(locale, `${data.remaining} exercises still need images. Run again for more.`, `${data.remaining} övningar kvar utan bilder. Kör igen för fler.`)
          : copy(locale, 'All exercises now have images.', 'Alla övningar har nu bilder!'),
      })
      setImageStats({ withoutImages: data.remaining })
      fetchExercises() // Refresh to show new images
    } catch {
      toast({
        title: copy(locale, 'Error', 'Fel'),
        description: copy(locale, 'Could not generate images', 'Kunde inte generera bilder'),
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingImages(false)
    }
  }

  // Fetch progression path when exercise selected
  useEffect(() => {
    if (selectedExercise) {
      fetchProgressionPath(selectedExercise.id)
    }
  }, [selectedExercise])

  const fetchProgressionPath = async (exerciseId: string) => {
    try {
      const response = await fetch(`/api/exercises/${exerciseId}/progression-path`)
      if (!response.ok) return

      const data = await response.json()
      setProgressionPath(data)
    } catch (error) {
      console.error('Failed to fetch progression path:', error)
    }
  }

  // Toggle favorite
  const toggleFavorite = async (exerciseId: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(exerciseId)) {
      newFavorites.delete(exerciseId)
    } else {
      newFavorites.add(exerciseId)
    }
    setFavorites(newFavorites)

    try {
      await fetch('/api/exercises/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId }),
      })
    } catch {
      // Revert on failure
      setFavorites(favorites)
    }
  }

  // Handle exercise selection
  const handleSelectExercise = (exercise: Exercise) => {
    if (mode === 'select' && onSelectExercise) {
      onSelectExercise(exercise)
    } else {
      setSelectedExercise(exercise)
      setShowDetailModal(true)
    }
  }

  // Get pillar badge color
  const getPillarColor = (pillar: BiomechanicalPillar | null) => {
    const colors = {
      POSTERIOR_CHAIN: 'bg-blue-100 text-blue-800',
      KNEE_DOMINANCE: 'bg-green-100 text-green-800',
      UNILATERAL: 'bg-purple-100 text-purple-800',
      FOOT_ANKLE: 'bg-yellow-100 text-yellow-800',
      ANTI_ROTATION_CORE: 'bg-red-100 text-red-800',
      UPPER_BODY: 'bg-indigo-100 text-indigo-800',
    }
    return pillar ? colors[pillar] : 'bg-gray-100 text-gray-800'
  }

  const getVisibilityLabel = (exercise: Exercise) => {
    if (exercise.isPublic) return 'System'
    if (exercise.businessId) return 'Business'
    return 'Only me'
  }

  const getVisibilityBadgeClass = (exercise: Exercise) => {
    if (exercise.isPublic) return 'border-blue-200 bg-blue-50 text-blue-700'
    if (exercise.businessId) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    return 'border-slate-200 bg-slate-50 text-slate-700'
  }

  // Render exercise card (grid view)
  const renderExerciseCard = (exercise: Exercise) => {
    const isFavorite = favorites.has(exercise.id)
    const imageUrls = exercise.imageUrls as string[] | null

    return (
      <Card
        key={exercise.id}
        className="cursor-pointer hover:shadow-lg transition-all overflow-hidden"
        onClick={() => handleSelectExercise(exercise)}
      >
        {/* Image Thumbnail */}
        {imageUrls && imageUrls.length > 0 ? (
          <div className="relative aspect-[3/4] bg-black/90 overflow-hidden">
            <ExerciseImage
              imageUrls={imageUrls}
              exerciseId={exercise.id}
              size="md"
              showCarousel={false}
              enableLightbox={false}
              className="w-full h-full"
            />
            {imageUrls.length > 1 && (
              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-xs">
                +{imageUrls.length - 1}
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-[3/4] bg-muted/30 flex items-center justify-center">
            <div className="text-muted-foreground/50 text-4xl">
              {exercise.category === 'PLYOMETRIC' ? '🦘' :
                exercise.category === 'CORE' ? '🎯' : '💪'}
            </div>
          </div>
        )}

        <CardHeader className="pb-2 pt-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm truncate">{exerciseDisplayName(exercise)}</CardTitle>
              <p className="text-xs text-gray-500 mt-1 truncate">{exercise.muscleGroup}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(exercise.id)
              }}
              className="h-8 w-8 flex-shrink-0"
            >
              {isFavorite ? (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ) : (
                <StarOff className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-4 pt-0">
          <div className="flex flex-wrap gap-1 mb-2">
            <Badge variant="outline" className={`text-xs ${getVisibilityBadgeClass(exercise)}`}>
              {getVisibilityLabel(exercise)}
            </Badge>
            {exercise.biomechanicalPillar && (
              <Badge className={`text-xs ${getPillarColor(exercise.biomechanicalPillar)}`}>
                {exercise.biomechanicalPillar.replace(/_/g, ' ')}
              </Badge>
            )}
            {exercise.progressionLevel && (
              <Badge variant="outline" className="text-xs">
                {exercise.progressionLevel.replace('_', ' ')}
              </Badge>
            )}
          </div>
          {exercise.equipment && (
            <p className="text-xs text-gray-500 truncate">{exercise.equipment}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Delete exercise (custom only)
  const deleteExercise = async (exercise: Exercise) => {
    try {
      const response = await fetch(`/api/exercises/${exercise.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        toast({
          title: 'Cannot delete',
          description: data.message || data.error || 'Failed to delete exercise',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Deleted',
        description: `"${exerciseDisplayName(exercise)}" has been deleted.`,
      })
      setShowDetailModal(false)
      setSelectedExercise(null)
      fetchExercises()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete exercise',
        variant: 'destructive',
      })
    }
  }

  // Hide exercise from library view
  const hideExercise = async (exercise: Exercise) => {
    try {
      const response = await fetch('/api/exercises/hidden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId: exercise.id }),
      })

      if (!response.ok) {
        toast({
          title: 'Error',
          description: 'Failed to hide exercise',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Hidden',
        description: `"${exerciseDisplayName(exercise)}" has been hidden from your library.`,
      })
      setShowDetailModal(false)
      setSelectedExercise(null)
      fetchExercises()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to hide exercise',
        variant: 'destructive',
      })
    }
  }

  // Render exercise row (list view)
  const renderExerciseRow = (exercise: Exercise) => {
    const isFavorite = favorites.has(exercise.id)

    return (
      <Card
        key={exercise.id}
        className="cursor-pointer hover:shadow-md transition-shadow mb-2"
        onClick={() => handleSelectExercise(exercise)}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(exercise.id)
              }}
            >
              {isFavorite ? (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ) : (
                <StarOff className="h-4 w-4" />
              )}
            </Button>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 sm:w-2/5">
                  <p className="font-semibold text-sm truncate">{exerciseDisplayName(exercise)}</p>
                  <p className="text-xs text-gray-500 truncate">{exercise.muscleGroup}</p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-1 sm:mt-0 sm:flex-1">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 leading-5 ${getVisibilityBadgeClass(exercise)}`}>
                    {getVisibilityLabel(exercise)}
                  </Badge>
                  {exercise.biomechanicalPillar && (
                    <Badge className={`text-[10px] px-1.5 py-0 leading-5 ${getPillarColor(exercise.biomechanicalPillar)}`}>
                      {exercise.biomechanicalPillar.replace(/_/g, ' ')}
                    </Badge>
                  )}
                  {exercise.progressionLevel && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 leading-5">
                      {exercise.progressionLevel.replace(/_/g, ' ')}
                    </Badge>
                  )}
                  {exercise.equipment && (
                    <span className="text-xs text-gray-500 truncate max-w-[120px]">{exercise.equipment}</span>
                  )}
                </div>
              </div>
            </div>

            {mode === 'select' && (
              <Button size="sm" className="flex-shrink-0" onClick={() => onSelectExercise?.(exercise)}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render detail modal
  const renderDetailModal = () => {
    if (!selectedExercise) return null

    return (
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{exerciseDisplayName(selectedExercise)}</DialogTitle>
            <DialogDescription>{selectedExercise.muscleGroup}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6">
              {/* Exercise Images */}
              {(selectedExercise.imageUrls as string[] | null)?.length ? (
                <div className="flex justify-center">
                  <ExerciseImage
                    imageUrls={selectedExercise.imageUrls as string[]}
                    exerciseId={selectedExercise.id}
                    size="xl"
                    showCarousel={true}
                    enableLightbox={true}
                  />
                </div>
              ) : null}

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {selectedExercise.biomechanicalPillar && (
                  <Badge className={getPillarColor(selectedExercise.biomechanicalPillar)}>
                    {selectedExercise.biomechanicalPillar.replace(/_/g, ' ')}
                  </Badge>
                )}
                {selectedExercise.progressionLevel && (
                  <Badge variant="outline">{selectedExercise.progressionLevel.replace('_', ' ')}</Badge>
                )}
                {selectedExercise.difficulty && (
                  <Badge variant="secondary">{selectedExercise.difficulty}</Badge>
                )}
                {selectedExercise.equipment && (
                  <Badge variant="outline">{selectedExercise.equipment}</Badge>
                )}
              </div>

              {/* Description */}
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-gray-700">{selectedExercise.description}</p>
              </div>

              {/* Instructions */}
              {selectedExercise.instructions && (
                <div>
                  <h4 className="font-semibold mb-2">Instructions</h4>
                  <p className="text-gray-700 whitespace-pre-line">
                    {selectedExercise.instructions}
                  </p>
                </div>
              )}

              {/* Video */}
              {selectedExercise.videoUrl && (
                <div>
                  <h4 className="font-semibold mb-2">Video</h4>
                  <a
                    href={selectedExercise.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <Play className="h-4 w-4" />
                    Watch demonstration
                  </a>
                </div>
              )}

              {/* Progression Path */}
              {progressionPath && (
                <div>
                  <h4 className="font-semibold mb-2">Progression Path</h4>
                  <div className="space-y-2">
                    {progressionPath.easier && (
                      <Card>
                        <CardContent className="p-3 flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">Easier: {exerciseDisplayName(progressionPath.easier)}</span>
                        </CardContent>
                      </Card>
                    )}
                    <Card className="bg-gray-50">
                      <CardContent className="p-3 flex items-center gap-2">
                        <span className="text-sm font-semibold">Current: {exerciseDisplayName(progressionPath.current)}</span>
                      </CardContent>
                    </Card>
                    {progressionPath.harder && (
                      <Card>
                        <CardContent className="p-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-red-500" />
                          <span className="text-sm">Harder: {exerciseDisplayName(progressionPath.harder)}</span>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between pt-2 border-t gap-2">
            <div className="flex items-center gap-2">
              {!selectedExercise.isPublic && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${exerciseDisplayName(selectedExercise)}"?`)) {
                      deleteExercise(selectedExercise)
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(`Hide "${exerciseDisplayName(selectedExercise)}" from your library?`)) {
                    hideExercise(selectedExercise)
                  }
                }}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Hide
              </Button>
            </div>
            {mode === 'select' && (
              <Button onClick={() => onSelectExercise?.(selectedExercise)}>
                <Plus className="h-4 w-4 mr-2" />
                Add to Workout
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{copy(locale, 'Exercise Library', 'Övningsbibliotek')}</h2>
          <p className="text-sm text-gray-500">
            {copy(
              locale,
              `${totalCount} exercises${searchTerm ? ` matching "${searchTerm}"` : ''}`,
              `${totalCount} övningar${searchTerm ? ` matchar "${searchTerm}"` : ''}`
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {imageStats && imageStats.withoutImages > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={generateImages}
              disabled={isGeneratingImages}
              className="text-xs"
            >
              {isGeneratingImages ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
              )}
              {isGeneratingImages
                ? copy(locale, 'Generating...', 'Genererar...')
                : copy(locale, `Generate images (${imageStats.withoutImages})`, `Generera bilder (${imageStats.withoutImages})`)}
            </Button>
          )}
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, muscle group, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">Biomechanical Pillar</Label>
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
              </div>

              <div>
                <Label className="text-xs">Progression Level</Label>
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

              <div>
                <Label className="text-xs">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    <SelectItem value="STRENGTH">Strength</SelectItem>
                    <SelectItem value="PLYOMETRIC">Plyometric</SelectItem>
                    <SelectItem value="CORE">Core</SelectItem>
                    {surface === 'strength-studio' ? (
                      <>
                        <SelectItem value="WARMUP">Warm-up</SelectItem>
                        <SelectItem value="RECOVERY">Recovery</SelectItem>
                      </>
                    ) : (
                      <SelectItem value="MOBILITY">Mobility</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Difficulty</Label>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Difficulties</SelectItem>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercise Grid/List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading exercises...</div>
      ) : exercises.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No exercises found.</p>
          <p className="text-sm mt-2">Try adjusting your filters.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {exercises.map((exercise) => renderExerciseCard(exercise))}
        </div>
      ) : (
        <div className="space-y-2">
          {exercises.map((exercise) => renderExerciseRow(exercise))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      {renderDetailModal()}
    </div>
  )
}
