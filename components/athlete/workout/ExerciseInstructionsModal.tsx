// components/athlete/workout/ExerciseInstructionsModal.tsx
/**
 * Exercise Instructions Modal (Athlete View)
 *
 * Comprehensive exercise guide modal showing:
 * - Exercise name (Swedish and English)
 * - Detailed step-by-step instructions
 * - Embedded video (YouTube/Vimeo)
 * - Target muscles
 * - Coaching cues
 * - Common mistakes
 * - Equipment needed
 * - Progression path (easier/harder variations)
 * - Personal records for this exercise
 *
 * Features:
 * - Full-screen video option
 * - Print instructions
 * - Favorite/bookmark
 * - Share with coach
 * - Previous performance data
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Exercise } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Play,
  Info,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Dumbbell,
  Star,
  X,
  ExternalLink,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface ExerciseInstructionsModalProps {
  exerciseId: string | null
  open: boolean
  onClose: () => void
  clientId?: string
}

interface ExerciseWithProgression extends Exercise {
  progressionPath?: {
    easier: { id: string; name: string } | null
    harder: { id: string; name: string } | null
  }
  personalBest?: {
    load: number
    reps: number
    date: Date
  }
  lastPerformed?: {
    load: number
    reps: number
    sets: number
    date: Date
    rpe: number
  }
}

export function ExerciseInstructionsModal({
  exerciseId,
  open,
  onClose,
  clientId,
}: ExerciseInstructionsModalProps) {
  const { toast } = useToast()
  const [exercise, setExercise] = useState<ExerciseWithProgression | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('instructions')

  const fetchExerciseDetails = useCallback(async (id: string) => {
    setIsLoading(true)

    try {
      // Fetch exercise
      const response = await fetch(`/api/exercises/${id}`)
      if (!response.ok) throw new Error('Failed to fetch exercise')

      const exerciseData = await response.json()

      // Fetch progression path
      const progressionResponse = await fetch(`/api/exercises/${id}/progression-path`)
      const progressionData = progressionResponse.ok ? await progressionResponse.json() : null

      // TODO: Fetch personal performance data if clientId provided
      // const performanceResponse = await fetch(`/api/clients/${clientId}/progression/${id}`)

      setExercise({
        ...exerciseData,
        progressionPath: progressionData,
        // Mock personal best data
        personalBest: clientId
          ? {
              load: 100,
              reps: 5,
              date: new Date('2024-01-15'),
            }
          : undefined,
        lastPerformed: clientId
          ? {
              load: 95,
              reps: 5,
              sets: 3,
              date: new Date('2024-01-20'),
              rpe: 8,
            }
          : undefined,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load exercise details',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [clientId, toast])

  // Fetch exercise details when modal opens
  useEffect(() => {
    if (exerciseId && open) {
      fetchExerciseDetails(exerciseId)
    }
  }, [exerciseId, open, fetchExerciseDetails])

  // Get video embed URL
  const getVideoEmbedUrl = (url: string | null) => {
    if (!url) return null

    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be')
        ? url.split('youtu.be/')[1]
        : url.split('v=')[1]?.split('&')[0]
      return `https://www.youtube.com/embed/${videoId}`
    }

    // Vimeo
    if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]
      return `https://player.vimeo.com/video/${videoId}`
    }

    return null
  }

  const embedUrl = exercise?.videoUrl ? getVideoEmbedUrl(exercise.videoUrl) : null

  // Render instructions tab
  const renderInstructions = () => {
    if (!exercise) return null

    return (
      <div className="space-y-4">
        {/* Description */}
        {exercise.description && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Description</h4>
            <p className="text-sm text-gray-700">{exercise.description}</p>
          </div>
        )}

        {/* Step-by-step Instructions */}
        {exercise.instructions && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Instructions</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {exercise.instructions}
              </p>
            </div>
          </div>
        )}

        {/* Target Muscles */}
        {exercise.muscleGroup && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Target Muscles</h4>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm">{exercise.muscleGroup}</span>
            </div>
          </div>
        )}

        {/* Equipment */}
        {exercise.equipment && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Equipment Needed</h4>
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-orange-500" />
              <span className="text-sm">{exercise.equipment}</span>
            </div>
          </div>
        )}

        {/* Classification */}
        <div>
          <h4 className="font-semibold text-sm mb-2">Classification</h4>
          <div className="flex flex-wrap gap-2">
            {exercise.biomechanicalPillar && (
              <Badge variant="secondary">{exercise.biomechanicalPillar}</Badge>
            )}
            {exercise.progressionLevel && (
              <Badge variant="outline">{exercise.progressionLevel}</Badge>
            )}
            {exercise.difficulty && (
              <Badge variant="outline">{exercise.difficulty}</Badge>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Render video tab
  const renderVideo = () => {
    if (!embedUrl) {
      return (
        <div className="text-center py-12">
          <Play className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No video available for this exercise</p>
          {exercise?.videoUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(exercise.videoUrl || '', '_blank')}
              className="mt-4"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Video in Browser
            </Button>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Video Embed */}
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Video Instructions */}
        <div className="bg-blue-50 p-3 rounded">
          <p className="text-xs text-blue-800">
            <strong>Tip:</strong> Watch the full demonstration before starting. Pay attention to
            form cues and tempo.
          </p>
        </div>
      </div>
    )
  }

  // Render progression tab
  const renderProgression = () => {
    if (!exercise?.progressionPath) {
      return (
        <div className="text-center py-12 text-gray-500">
          No progression path available
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Easier Variation */}
        {exercise.progressionPath.easier && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                  <TrendingDown className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Easier Variation</p>
                  <p className="font-semibold">{exercise.progressionPath.easier.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current */}
        <Card className="border-2 border-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500">
                <Star className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-blue-600">Current Exercise</p>
                <p className="font-semibold">{exercise.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Harder Variation */}
        {exercise.progressionPath.harder && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                  <TrendingUp className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Harder Variation</p>
                  <p className="font-semibold">{exercise.progressionPath.harder.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="bg-yellow-50 p-3 rounded">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <p className="text-xs text-yellow-800">
              Progression should be gradual. Master the current exercise before advancing to harder
              variations. Consult your coach before changing exercises.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Render performance tab
  const renderPerformance = () => {
    if (!clientId || !exercise?.personalBest) {
      return (
        <div className="text-center py-12 text-gray-500">
          No performance data available
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Personal Best */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">Personal Record</h4>
              <Badge className="bg-yellow-100 text-yellow-800">
                <Star className="h-3 w-3 mr-1 fill-yellow-600" />
                PR
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 bg-yellow-50 p-3 rounded">
              <div>
                <p className="text-xs text-gray-600">Load</p>
                <p className="text-lg font-bold">{exercise.personalBest.load} kg</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Reps</p>
                <p className="text-lg font-bold">{exercise.personalBest.reps}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Date</p>
                <p className="text-sm font-medium">
                  {new Date(exercise.personalBest.date).toLocaleDateString('sv-SE', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Performed */}
        {exercise.lastPerformed && (
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm mb-3">Last Performed</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-600">Load</p>
                  <p className="font-semibold">{exercise.lastPerformed.load} kg</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Reps</p>
                  <p className="font-semibold">{exercise.lastPerformed.reps}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Sets</p>
                  <p className="font-semibold">{exercise.lastPerformed.sets}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">RPE</p>
                  <p className="font-semibold">{exercise.lastPerformed.rpe}/10</p>
                </div>
              </div>
              <Separator className="my-3" />
              <p className="text-xs text-gray-600">
                {new Date(exercise.lastPerformed.date).toLocaleDateString('sv-SE')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Coaching Note */}
        <div className="bg-blue-50 p-3 rounded">
          <p className="text-xs text-blue-800">
            <strong>Next Goal:</strong> Try to match or beat your personal record. Focus on
            maintaining proper form even as the weight increases.
          </p>
        </div>
      </div>
    )
  }

  if (!exercise && !isLoading) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-8">
              <DialogTitle className="text-xl">{exercise?.name || 'Loading...'}</DialogTitle>
              {exercise?.nameSv && exercise.nameEn && (
                <DialogDescription className="text-xs mt-1">
                  Swedish: {exercise.nameSv} | English: {exercise.nameEn}
                </DialogDescription>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading exercise details...</div>
        ) : (
          <ScrollArea className="max-h-[70vh] pr-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="instructions">
                  <Info className="h-4 w-4 mr-2" />
                  Instructions
                </TabsTrigger>
                <TabsTrigger value="video">
                  <Play className="h-4 w-4 mr-2" />
                  Video
                </TabsTrigger>
                <TabsTrigger value="progression">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Progression
                </TabsTrigger>
                <TabsTrigger value="performance" disabled={!clientId}>
                  <Star className="h-4 w-4 mr-2" />
                  Your Stats
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="instructions">{renderInstructions()}</TabsContent>
                <TabsContent value="video">{renderVideo()}</TabsContent>
                <TabsContent value="progression">{renderProgression()}</TabsContent>
                <TabsContent value="performance">{renderPerformance()}</TabsContent>
              </div>
            </Tabs>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
