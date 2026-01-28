'use client'

// components/agility-studio/AgilityStudioClient.tsx
// Main client component for Agility Studio

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Plus, Search, Zap, Dumbbell, Timer, BarChart3 } from 'lucide-react'
import { DrillLibrary } from './DrillLibrary'
import { WorkoutList } from './WorkoutList'
import { AgilityWorkoutBuilder } from './AgilityWorkoutBuilder'
import { TimingGateImport } from './TimingGateImport'
import type {
  AgilityDrill,
  AgilityWorkout,
  DevelopmentStage,
  TimingGateSession
} from '@/types'

interface Athlete {
  id: string
  name: string
  email?: string | null
  teamId?: string | null
}

interface AgilityStudioClientProps {
  userId: string
  initialDrills: AgilityDrill[]
  initialWorkouts: AgilityWorkout[]
  initialAthletes: Athlete[]
  initialTimingSessions: (TimingGateSession & { _count: { results: number } })[]
}

export default function AgilityStudioClient({
  userId,
  initialDrills,
  initialWorkouts,
  initialAthletes,
  initialTimingSessions
}: AgilityStudioClientProps) {
  const t = useTranslations('agilityStudio')
  const [activeTab, setActiveTab] = useState('drills')
  const [searchQuery, setSearchQuery] = useState('')
  const [developmentStage, setDevelopmentStage] = useState<DevelopmentStage | 'all'>('all')
  const [showWorkoutBuilder, setShowWorkoutBuilder] = useState(false)
  const [drills, setDrills] = useState(initialDrills)
  const [workouts, setWorkouts] = useState(initialWorkouts)
  const [timingSessions, setTimingSessions] = useState(initialTimingSessions)

  const handleWorkoutCreated = (newWorkout: AgilityWorkout) => {
    setWorkouts(prev => [newWorkout, ...prev])
    setShowWorkoutBuilder(false)
    setActiveTab('workouts')
  }

  const handleWorkoutDeleted = (workoutId: string) => {
    setWorkouts(prev => prev.filter(w => w.id !== workoutId))
  }

  const handleTimingSessionCreated = (session: TimingGateSession & { _count: { results: number } }) => {
    setTimingSessions(prev => [session, ...prev])
  }

  const developmentStages: { value: DevelopmentStage | 'all'; label: string }[] = [
    { value: 'all', label: t('stages.all') },
    { value: 'FUNDAMENTALS', label: t('stages.fundamentals') },
    { value: 'LEARNING_TO_TRAIN', label: t('stages.learningToTrain') },
    { value: 'TRAINING_TO_TRAIN', label: t('stages.trainingToTrain') },
    { value: 'TRAINING_TO_COMPETE', label: t('stages.trainingToCompete') },
    { value: 'TRAINING_TO_WIN', label: t('stages.trainingToWin') },
    { value: 'ELITE', label: t('stages.elite') }
  ]

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground">
            {t('description')}
          </p>
        </div>
        <Button onClick={() => setShowWorkoutBuilder(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('createWorkout')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={developmentStage}
          onValueChange={(value) => setDevelopmentStage(value as DevelopmentStage | 'all')}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('developmentStage')} />
          </SelectTrigger>
          <SelectContent>
            {developmentStages.map((stage) => (
              <SelectItem key={stage.value} value={stage.value}>
                {stage.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="drills" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.drills')}</span>
          </TabsTrigger>
          <TabsTrigger value="workouts" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.workouts')}</span>
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.testing')}</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.analytics')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drills" className="mt-6">
          <DrillLibrary
            drills={drills}
            searchQuery={searchQuery}
            developmentStage={developmentStage === 'all' ? undefined : developmentStage}
            onAddToWorkout={(drill) => {
              setShowWorkoutBuilder(true)
              // Could pre-populate workout with this drill
            }}
          />
        </TabsContent>

        <TabsContent value="workouts" className="mt-6">
          <WorkoutList
            workouts={workouts}
            athletes={initialAthletes}
            searchQuery={searchQuery}
            onEdit={(workout) => {
              // TODO: Open workout editor
              void workout.id
            }}
            onDelete={handleWorkoutDeleted}
            onDuplicate={(workout) => {
              // TODO: Duplicate workout
              void workout.id
            }}
          />
        </TabsContent>

        <TabsContent value="testing" className="mt-6">
          <TimingGateImport
            sessions={timingSessions}
            athletes={initialAthletes}
            onSessionCreated={handleTimingSessionCreated}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">{t('analyticsComingSoon')}</h3>
            <p>{t('analyticsDescription')}</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Workout Builder Modal */}
      {showWorkoutBuilder && (
        <AgilityWorkoutBuilder
          drills={drills}
          onSave={handleWorkoutCreated}
          onClose={() => setShowWorkoutBuilder(false)}
        />
      )}
    </div>
  )
}
