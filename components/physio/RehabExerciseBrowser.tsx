'use client'

/**
 * Rehab Exercise Browser Component
 *
 * Specialized exercise browser for physiotherapy with:
 * - Filter by body part, rehab phase, contraindications
 * - Progression/regression path visualization
 * - Active restriction awareness
 * - Phase-appropriate exercise recommendations
 */

import { useState, useEffect, useCallback } from 'react'
import { Exercise, RehabPhase } from '@prisma/client'
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
import {
  Search,
  Filter,
  Grid3x3,
  List,
  Plus,
  Play,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Activity,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { ExerciseImage } from '@/components/themed/ExerciseImage'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface RehabExerciseBrowserProps {
  onSelectExercise?: (exercise: Exercise) => void
  mode?: 'browse' | 'select'
  clientId?: string // For restriction checking
  currentPhase?: RehabPhase
  targetBodyPart?: string
}

// Extended exercise type with rehab fields
interface RehabExerciseExtended extends Exercise {
  isRehabExercise: boolean
  rehabPhases: RehabPhase[]
  targetBodyParts: string[]
  contraindications: string[]
  progressionExerciseId: string | null
  regressionExerciseId: string | null
  progressionExercise?: Exercise | null
  regressionExercise?: Exercise | null
}

// Restriction info from API
interface RestrictionInfo {
  hasRestrictions: boolean
  restrictedBodyParts: string[]
  restrictedExerciseIds: string[]
}

// Phase labels in Swedish
const PHASE_LABELS: Record<RehabPhase, string> = {
  ACUTE: 'Akut (0-7 dagar)',
  SUBACUTE: 'Subakut (1-3 veckor)',
  REMODELING: 'Remodellering (3-12 veckor)',
  FUNCTIONAL: 'Funktionell (12+ veckor)',
  RETURN_TO_SPORT: 'Återgång till idrott',
}

const PHASE_COLORS: Record<RehabPhase, string> = {
  ACUTE: 'bg-red-500/20 text-red-400 border-red-500/30',
  SUBACUTE: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  REMODELING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  FUNCTIONAL: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  RETURN_TO_SPORT: 'bg-green-500/20 text-green-400 border-green-500/30',
}

const BODY_PARTS = [
  { value: 'hip', label: 'Höft/Glutes' },
  { value: 'knee', label: 'Knä' },
  { value: 'ankle', label: 'Fotled' },
  { value: 'foot', label: 'Fot' },
  { value: 'lower_back', label: 'Ländrygg' },
  { value: 'core', label: 'Core' },
  { value: 'shoulder', label: 'Axel' },
  { value: 'upper_legs', label: 'Lår' },
  { value: 'lower_legs', label: 'Underben' },
]

export function RehabExerciseBrowser({
  onSelectExercise,
  mode = 'browse',
  clientId,
  currentPhase,
  targetBodyPart,
}: RehabExerciseBrowserProps) {
  const { toast } = useToast()

  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedExercise, setSelectedExercise] = useState<RehabExerciseExtended | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPhase, setSelectedPhase] = useState<RehabPhase | 'ALL'>(currentPhase || 'ALL')
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>(targetBodyPart || 'ALL')
  const [showRehabOnly, setShowRehabOnly] = useState(true)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(24)
  const [totalPages, setTotalPages] = useState(1)

  // Data state
  const [exercises, setExercises] = useState<RehabExerciseExtended[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [restrictions, setRestrictions] = useState<RestrictionInfo | null>(null)

  // Fetch restrictions if clientId provided
  useEffect(() => {
    if (clientId) {
      fetchRestrictions()
    }
  }, [clientId])

  const fetchRestrictions = async () => {
    if (!clientId) return

    try {
      const response = await fetch(`/api/restrictions/athlete/${clientId}`)
      if (response.ok) {
        const data = await response.json()
        setRestrictions({
          hasRestrictions: data.hasRestrictions,
          restrictedBodyParts: data.restrictedBodyParts || [],
          restrictedExerciseIds: data.restrictedExerciseIds || [],
        })
      }
    } catch (error) {
      console.error('Failed to fetch restrictions:', error)
    }
  }

  // Fetch exercises with filters
  const fetchExercises = useCallback(async () => {
    setIsLoading(true)

    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (selectedPhase !== 'ALL') params.append('rehabPhase', selectedPhase)
      if (selectedBodyPart !== 'ALL') params.append('bodyPart', selectedBodyPart)
      if (showRehabOnly) params.append('isRehabExercise', 'true')
      params.append('limit', pageSize.toString())
      params.append('offset', ((currentPage - 1) * pageSize).toString())

      const response = await fetch(`/api/exercises?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch exercises')

      const data = await response.json()
      setExercises(data.exercises || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error: any) {
      toast({
        title: 'Fel',
        description: error.message || 'Kunde inte ladda övningar',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm, selectedPhase, selectedBodyPart, showRehabOnly, pageSize, currentPage, toast])

  useEffect(() => {
    fetchExercises()
  }, [fetchExercises])

  // Check if exercise is restricted
  const isExerciseRestricted = (exercise: RehabExerciseExtended): boolean => {
    if (!restrictions?.hasRestrictions) return false

    // Check direct exercise restriction
    if (restrictions.restrictedExerciseIds.includes(exercise.id)) {
      return true
    }

    // Check body part restriction
    const hasRestrictedBodyPart = exercise.targetBodyParts.some(part =>
      restrictions.restrictedBodyParts.some(restricted =>
        part.toLowerCase().includes(restricted.toLowerCase()) ||
        restricted.toLowerCase().includes(part.toLowerCase())
      )
    )

    return hasRestrictedBodyPart
  }

  // Handle exercise selection
  const handleSelectExercise = (exercise: RehabExerciseExtended) => {
    if (isExerciseRestricted(exercise)) {
      toast({
        title: 'Övning begränsad',
        description: 'Denna övning är för närvarande begränsad på grund av aktiva restriktioner.',
        variant: 'destructive',
      })
      return
    }

    if (mode === 'select' && onSelectExercise) {
      onSelectExercise(exercise)
    } else {
      setSelectedExercise(exercise)
      setShowDetailModal(true)
    }
  }

  // Render exercise card
  const renderExerciseCard = (exercise: RehabExerciseExtended) => {
    const imageUrls = exercise.imageUrls as string[] | null
    const isRestricted = isExerciseRestricted(exercise)

    return (
      <Card
        key={exercise.id}
        className={`cursor-pointer transition-all overflow-hidden ${
          isRestricted
            ? 'opacity-50 border-red-500/30 hover:shadow-none cursor-not-allowed'
            : 'hover:shadow-lg hover:border-blue-500/30'
        }`}
        onClick={() => !isRestricted && handleSelectExercise(exercise)}
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
            {isRestricted && (
              <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center">
                <ShieldAlert className="w-12 h-12 text-red-400" />
              </div>
            )}
          </div>
        ) : (
          <div className={`aspect-[3/4] flex items-center justify-center ${
            isRestricted ? 'bg-red-900/20' : 'bg-slate-800/30'
          }`}>
            {isRestricted ? (
              <ShieldAlert className="w-12 h-12 text-red-400" />
            ) : (
              <Activity className="w-12 h-12 text-slate-500" />
            )}
          </div>
        )}

        <CardHeader className="pb-2 pt-3 bg-slate-900/50">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm truncate text-white">
                {exercise.nameSv || exercise.name}
              </CardTitle>
              <p className="text-xs text-slate-400 mt-1 truncate">
                {exercise.targetBodyParts?.join(', ') || exercise.muscleGroup}
              </p>
            </div>
            {isRestricted && (
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 ml-2" />
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-4 pt-0 bg-slate-900/50">
          {/* Phase badges */}
          <div className="flex flex-wrap gap-1 mb-2">
            {exercise.rehabPhases?.slice(0, 2).map(phase => (
              <Badge key={phase} className={`text-xs ${PHASE_COLORS[phase]}`}>
                {phase.replace('_', ' ')}
              </Badge>
            ))}
            {exercise.rehabPhases?.length > 2 && (
              <Badge variant="outline" className="text-xs text-slate-400">
                +{exercise.rehabPhases.length - 2}
              </Badge>
            )}
          </div>

          {/* Progression indicators */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {exercise.regressionExerciseId && (
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-blue-400" />
                Lättare
              </span>
            )}
            {exercise.progressionExerciseId && (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-400" />
                Svårare
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render exercise row (list view)
  const renderExerciseRow = (exercise: RehabExerciseExtended) => {
    const isRestricted = isExerciseRestricted(exercise)

    return (
      <Card
        key={exercise.id}
        className={`transition-shadow mb-2 ${
          isRestricted
            ? 'opacity-50 border-red-500/30 cursor-not-allowed'
            : 'cursor-pointer hover:shadow-md hover:border-blue-500/30'
        } bg-slate-900/50 border-white/10`}
        onClick={() => !isRestricted && handleSelectExercise(exercise)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {isRestricted ? (
              <ShieldAlert className="h-5 w-5 text-red-400 flex-shrink-0" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-green-400 flex-shrink-0" />
            )}

            <div className="flex-1 grid grid-cols-5 gap-4">
              <div className="col-span-2">
                <p className="font-semibold text-white">{exercise.nameSv || exercise.name}</p>
                <p className="text-sm text-slate-400">{exercise.targetBodyParts?.join(', ')}</p>
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                {exercise.rehabPhases?.slice(0, 2).map(phase => (
                  <Badge key={phase} className={`text-xs ${PHASE_COLORS[phase]}`}>
                    {phase.replace('_', ' ')}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center text-sm text-slate-400">
                {exercise.equipment || 'Ingen utrustning'}
              </div>

              <div className="flex items-center gap-2">
                {exercise.regressionExerciseId && (
                  <TrendingDown className="h-4 w-4 text-blue-400" />
                )}
                {exercise.progressionExerciseId && (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                )}
              </div>
            </div>

            {mode === 'select' && !isRestricted && (
              <Button size="sm" className="bg-blue-500 hover:bg-blue-600">
                <Plus className="h-4 w-4 mr-2" />
                Lägg till
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
        <DialogContent className="max-w-3xl max-h-[90vh] bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{selectedExercise.nameSv || selectedExercise.name}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedExercise.targetBodyParts?.join(', ') || selectedExercise.muscleGroup}
            </DialogDescription>
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

              {/* Phase Badges */}
              <div>
                <h4 className="font-semibold mb-2 text-white">Lämpliga faser</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedExercise.rehabPhases?.map(phase => (
                    <Badge key={phase} className={PHASE_COLORS[phase]}>
                      {PHASE_LABELS[phase]}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Contraindications */}
              {selectedExercise.contraindications?.length > 0 && (
                <Alert className="bg-red-900/20 border-red-500/30">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-300">
                    <strong>Kontraindikationer:</strong>
                    <ul className="list-disc ml-4 mt-1">
                      {selectedExercise.contraindications.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Description */}
              {selectedExercise.description && (
                <div>
                  <h4 className="font-semibold mb-2 text-white">Beskrivning</h4>
                  <p className="text-slate-300">{selectedExercise.description}</p>
                </div>
              )}

              {/* Instructions */}
              {selectedExercise.instructions && (
                <div>
                  <h4 className="font-semibold mb-2 text-white">Instruktioner</h4>
                  <p className="text-slate-300 whitespace-pre-line">
                    {selectedExercise.instructions}
                  </p>
                </div>
              )}

              {/* Video */}
              {selectedExercise.videoUrl && (
                <div>
                  <h4 className="font-semibold mb-2 text-white">Video</h4>
                  <a
                    href={selectedExercise.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-400 hover:underline"
                  >
                    <Play className="h-4 w-4" />
                    Se demonstration
                  </a>
                </div>
              )}

              {/* Progression Path */}
              <div>
                <h4 className="font-semibold mb-2 text-white">Progressionsväg</h4>
                <div className="space-y-2">
                  {selectedExercise.regressionExercise && (
                    <Card className="bg-slate-800/50 border-white/10">
                      <CardContent className="p-3 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-slate-300">
                          Lättare: {selectedExercise.regressionExercise.nameSv || selectedExercise.regressionExercise.name}
                        </span>
                      </CardContent>
                    </Card>
                  )}
                  <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardContent className="p-3 flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        Nuvarande: {selectedExercise.nameSv || selectedExercise.name}
                      </span>
                    </CardContent>
                  </Card>
                  {selectedExercise.progressionExercise && (
                    <Card className="bg-slate-800/50 border-white/10">
                      <CardContent className="p-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-400" />
                        <span className="text-sm text-slate-300">
                          Svårare: {selectedExercise.progressionExercise.nameSv || selectedExercise.progressionExercise.name}
                        </span>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Equipment */}
              {selectedExercise.equipment && (
                <div>
                  <h4 className="font-semibold mb-2 text-white">Utrustning</h4>
                  <p className="text-slate-300">{selectedExercise.equipment}</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {mode === 'select' && (
            <div className="flex justify-end pt-4 border-t border-white/10">
              <Button
                onClick={() => {
                  onSelectExercise?.(selectedExercise)
                  setShowDetailModal(false)
                }}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Lägg till i program
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Rehabövningar</h2>
          <p className="text-sm text-slate-400">
            {exercises.length} övningar {searchTerm && `matchar "${searchTerm}"`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'bg-blue-500' : 'border-white/20 text-white'}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'bg-blue-500' : 'border-white/20 text-white'}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Restriction Warning */}
      {restrictions?.hasRestrictions && (
        <Alert className="bg-yellow-900/20 border-yellow-500/30">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-300">
            Aktiva träningsrestriktioner: Vissa övningar är tillfälligt begränsade.
            Begränsade områden: {restrictions.restrictedBodyParts.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <Card className="bg-slate-900/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
            <Filter className="h-4 w-4" />
            Sök & Filtrera
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Sök efter namn eller beskrivning..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-slate-400">Rehabfas</Label>
                <Select
                  value={selectedPhase}
                  onValueChange={(value) => setSelectedPhase(value as RehabPhase | 'ALL')}
                >
                  <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="ALL" className="text-slate-200">Alla faser</SelectItem>
                    {Object.entries(PHASE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value} className="text-slate-200">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-400">Kroppsdel</Label>
                <Select value={selectedBodyPart} onValueChange={setSelectedBodyPart}>
                  <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="ALL" className="text-slate-200">Alla kroppsdelar</SelectItem>
                    {BODY_PARTS.map(({ value, label }) => (
                      <SelectItem key={value} value={value} className="text-slate-200">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant={showRehabOnly ? 'default' : 'outline'}
                  onClick={() => setShowRehabOnly(!showRehabOnly)}
                  className={showRehabOnly ? 'bg-blue-500 hover:bg-blue-600' : 'border-white/20 text-white'}
                >
                  {showRehabOnly ? 'Endast rehab' : 'Visa alla'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercise Grid/List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Laddar övningar...</div>
      ) : exercises.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Activity className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <p>Inga övningar hittades.</p>
          <p className="text-sm mt-2">Prova att justera dina filter.</p>
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
            className="border-white/20 text-white"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Föregående
          </Button>
          <span className="text-sm text-slate-400">
            Sida {currentPage} av {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="border-white/20 text-white"
          >
            Nästa
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      {renderDetailModal()}
    </div>
  )
}
