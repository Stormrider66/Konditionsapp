'use client'

// components/agility-studio/DrillLibrary.tsx
// Drill library browser with filters

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import {
  Plus,
  Play,
  ChevronRight,
  Target,
  Zap,
  Footprints,
  Activity,
  Scale,
  Timer
} from 'lucide-react'
import type { AgilityDrill, AgilityDrillCategory, DevelopmentStage } from '@/types'
import { DrillAnimationPlayer } from './DrillAnimationPlayer'

interface DrillLibraryProps {
  drills: AgilityDrill[]
  searchQuery: string
  developmentStage?: DevelopmentStage
  onAddToWorkout: (drill: AgilityDrill) => void
}

const categoryIcons: Record<AgilityDrillCategory, React.ReactNode> = {
  COD: <Target className="h-4 w-4" />,
  REACTIVE_AGILITY: <Zap className="h-4 w-4" />,
  SPEED_ACCELERATION: <ChevronRight className="h-4 w-4" />,
  PLYOMETRICS: <Activity className="h-4 w-4" />,
  FOOTWORK: <Footprints className="h-4 w-4" />,
  BALANCE: <Scale className="h-4 w-4" />
}

const categoryColors: Record<AgilityDrillCategory, string> = {
  COD: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  REACTIVE_AGILITY: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  SPEED_ACCELERATION: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  PLYOMETRICS: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  FOOTWORK: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  BALANCE: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
}

const categories: AgilityDrillCategory[] = [
  'COD',
  'REACTIVE_AGILITY',
  'SPEED_ACCELERATION',
  'PLYOMETRICS',
  'FOOTWORK',
  'BALANCE'
]

export function DrillLibrary({
  drills,
  searchQuery,
  developmentStage,
  onAddToWorkout
}: DrillLibraryProps) {
  const t = useTranslations('agilityStudio')
  const tCommon = useTranslations('common')
  const [selectedCategory, setSelectedCategory] = useState<AgilityDrillCategory | 'all'>('all')
  const [selectedDrill, setSelectedDrill] = useState<AgilityDrill | null>(null)

  const categoryLabels: Record<AgilityDrillCategory, string> = {
    COD: t('categories.COD'),
    REACTIVE_AGILITY: t('categories.REACTIVE_AGILITY'),
    SPEED_ACCELERATION: t('categories.SPEED_ACCELERATION'),
    PLYOMETRICS: t('categories.PLYOMETRICS'),
    FOOTWORK: t('categories.FOOTWORK'),
    BALANCE: t('categories.BALANCE')
  }

  const filteredDrills = useMemo(() => {
    return drills.filter(drill => {
      // Category filter
      if (selectedCategory !== 'all' && drill.category !== selectedCategory) {
        return false
      }

      // Development stage filter
      if (developmentStage) {
        const stageOrder: DevelopmentStage[] = [
          'FUNDAMENTALS',
          'LEARNING_TO_TRAIN',
          'TRAINING_TO_TRAIN',
          'TRAINING_TO_COMPETE',
          'TRAINING_TO_WIN',
          'ELITE'
        ]
        const minIndex = stageOrder.indexOf(drill.minDevelopmentStage)
        const maxIndex = stageOrder.indexOf(drill.maxDevelopmentStage)
        const requestedIndex = stageOrder.indexOf(developmentStage)

        if (requestedIndex < minIndex || requestedIndex > maxIndex) {
          return false
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          drill.name.toLowerCase().includes(query) ||
          drill.nameSv?.toLowerCase().includes(query) ||
          drill.description?.toLowerCase().includes(query)
        )
      }

      return true
    })
  }, [drills, selectedCategory, developmentStage, searchQuery])

  const groupedDrills = useMemo(() => {
    const groups: Record<AgilityDrillCategory, AgilityDrill[]> = {
      COD: [],
      REACTIVE_AGILITY: [],
      SPEED_ACCELERATION: [],
      PLYOMETRICS: [],
      FOOTWORK: [],
      BALANCE: []
    }

    filteredDrills.forEach(drill => {
      groups[drill.category].push(drill)
    })

    return groups
  }, [filteredDrills])

  return (
    <div className="space-y-6">
      {/* Category Filter Chips */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          {tCommon('all')} ({filteredDrills.length})
        </Button>
        {categories.map(category => {
          const count = groupedDrills[category].length
          return (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="flex items-center gap-1"
            >
              {categoryIcons[category]}
              {categoryLabels[category]}
              <span className="ml-1 text-xs">({count})</span>
            </Button>
          )
        })}
      </div>

      {/* Drill Grid */}
      {selectedCategory === 'all' ? (
        // Show grouped by category
        <div className="space-y-8">
          {categories.map(category => {
            const categoryDrills = groupedDrills[category]
            if (categoryDrills.length === 0) return null

            return (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  {categoryIcons[category]}
                  {categoryLabels[category]}
                  <Badge variant="secondary">{categoryDrills.length}</Badge>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryDrills.map(drill => (
                    <DrillCard
                      key={drill.id}
                      drill={drill}
                      onView={() => setSelectedDrill(drill)}
                      onAdd={() => onAddToWorkout(drill)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // Show flat list for selected category
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrills.map(drill => (
            <DrillCard
              key={drill.id}
              drill={drill}
              onView={() => setSelectedDrill(drill)}
              onAdd={() => onAddToWorkout(drill)}
            />
          ))}
        </div>
      )}

      {filteredDrills.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">{t('drill.noDrillsFound')}</h3>
          <p>{t('drill.adjustFilters')}</p>
        </div>
      )}

      {/* Drill Detail Sheet */}
      <DrillDetailSheet
        drill={selectedDrill}
        onClose={() => setSelectedDrill(null)}
        onAdd={onAddToWorkout}
        categoryLabels={categoryLabels}
      />
    </div>
  )
}

interface DrillCardProps {
  drill: AgilityDrill
  onView: () => void
  onAdd: () => void
}

function DrillCard({ drill, onView, onAdd }: DrillCardProps) {
  const t = useTranslations('agilityStudio')
  const tCommon = useTranslations('common')

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onView}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Badge className={categoryColors[drill.category]}>
            {categoryIcons[drill.category]}
            <span className="ml-1">{t(`categories.${drill.category}`)}</span>
          </Badge>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < drill.difficultyLevel ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
        <CardTitle className="text-lg mt-2">{drill.nameSv || drill.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {drill.descriptionSv || drill.description}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {drill.distanceMeters && (
            <Badge variant="outline">
              <ChevronRight className="h-3 w-3 mr-1" />
              {drill.distanceMeters}m
            </Badge>
          )}
          {drill.durationSeconds && (
            <Badge variant="outline">
              <Timer className="h-3 w-3 mr-1" />
              {drill.durationSeconds}s
            </Badge>
          )}
          {drill.defaultReps && (
            <Badge variant="outline">{drill.defaultReps} {t('drill.reps')}</Badge>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onView()
            }}
          >
            {tCommon('view')}
          </Button>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onAdd()
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface DrillDetailSheetProps {
  drill: AgilityDrill | null
  onClose: () => void
  onAdd: (drill: AgilityDrill) => void
  categoryLabels: Record<AgilityDrillCategory, string>
}

function DrillDetailSheet({ drill, onClose, onAdd, categoryLabels }: DrillDetailSheetProps) {
  const t = useTranslations('agilityStudio')

  if (!drill) return null

  return (
    <Sheet open={!!drill} onOpenChange={() => onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {categoryIcons[drill.category]}
            {drill.nameSv || drill.name}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {drill.descriptionSv || drill.description}
          </SheetDescription>
          <div className="mt-1">
            <Badge className={categoryColors[drill.category]}>
              {categoryLabels[drill.category]}
            </Badge>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Difficulty */}
          <div>
            <h4 className="font-medium mb-2">{t('drill.difficulty')}</h4>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < drill.difficultyLevel ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {t('drill.level')} {drill.difficultyLevel}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-medium mb-2">{t('drill.description')}</h4>
            <p className="text-sm text-muted-foreground">{drill.descriptionSv || drill.description}</p>
          </div>

          {/* Drill Animation - shown for all drills that have animations */}
          <DrillAnimationPlayer
            drillId={drill.id}
            drillName={drill.name}
          />

          {/* Parameters */}
          <div>
            <h4 className="font-medium mb-2">{t('drill.parameters')}</h4>
            <div className="grid grid-cols-2 gap-2">
              {drill.distanceMeters && (
                <div className="p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">{t('drill.distance')}</p>
                  <p className="font-medium">{drill.distanceMeters}m</p>
                </div>
              )}
              {drill.durationSeconds && (
                <div className="p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">{t('drill.duration')}</p>
                  <p className="font-medium">{drill.durationSeconds}s</p>
                </div>
              )}
              {drill.defaultSets && (
                <div className="p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">{t('drill.sets')}</p>
                  <p className="font-medium">{drill.defaultSets}</p>
                </div>
              )}
              {drill.defaultReps && (
                <div className="p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">{t('drill.reps')}</p>
                  <p className="font-medium">{drill.defaultReps}</p>
                </div>
              )}
              {drill.restSeconds && (
                <div className="p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">{t('drill.rest')}</p>
                  <p className="font-medium">{drill.restSeconds}s</p>
                </div>
              )}
            </div>
          </div>

          {/* Setup Instructions */}
          {drill.setupInstructions && (
            <div>
              <h4 className="font-medium mb-2">{t('drill.setup')}</h4>
              <p className="text-sm text-muted-foreground">{drill.setupInstructions}</p>
            </div>
          )}

          {/* Execution Cues */}
          {drill.executionCues && drill.executionCues.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">{t('drill.coachingCues')}</h4>
              <ul className="list-disc list-inside space-y-1">
                {drill.executionCues.map((cue, i) => (
                  <li key={i} className="text-sm text-muted-foreground">{cue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Equipment */}
          {(drill.requiredEquipment.length > 0 || drill.optionalEquipment.length > 0) && (
            <div>
              <h4 className="font-medium mb-2">{t('drill.equipment')}</h4>
              <div className="space-y-2">
                {drill.requiredEquipment.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('drill.required')}:</p>
                    <div className="flex flex-wrap gap-1">
                      {drill.requiredEquipment.map(eq => (
                        <Badge key={eq} variant="outline">{eq}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {drill.optionalEquipment.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('drill.optional')}:</p>
                    <div className="flex flex-wrap gap-1">
                      {drill.optionalEquipment.map(eq => (
                        <Badge key={eq} variant="secondary">{eq}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Development Stage Range */}
          <div>
            <h4 className="font-medium mb-2">{t('drill.appropriateFor')}</h4>
            <p className="text-sm text-muted-foreground">
              {drill.minDevelopmentStage.replace(/_/g, ' ')} - {drill.maxDevelopmentStage.replace(/_/g, ' ')}
            </p>
          </div>

          {/* Video */}
          {drill.videoUrl && (
            <div>
              <h4 className="font-medium mb-2">{t('drill.video')}</h4>
              <Button variant="outline" asChild>
                <a href={drill.videoUrl} target="_blank" rel="noopener noreferrer">
                  <Play className="h-4 w-4 mr-2" />
                  {t('drill.watchDemo')}
                </a>
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button className="flex-1" onClick={() => onAdd(drill)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('drill.addToWorkout')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
