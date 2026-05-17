'use client'

// components/agility-studio/AgilityStudioClient.tsx
// Main client component for Agility Studio

import { useState, useMemo } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
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
import { Plus, Search, Zap, Dumbbell, Timer, BarChart3, FileUp } from 'lucide-react'
import { toast } from 'sonner'
import { DrillLibrary } from './DrillLibrary'
import { WorkoutList } from './WorkoutList'
import { AgilityWorkoutBuilder, type ImportedDrillSeed } from './AgilityWorkoutBuilder'
import { TimingGateImport } from './TimingGateImport'
import type {
  AgilityDrill,
  AgilityWorkout,
  DevelopmentStage,
  TimingGateSession
} from '@/types'
import { CalendarAssignDialog } from '@/components/calendar/CalendarAssignDialog'
import { ImportWorkoutDialog } from '@/components/workouts/import/ImportWorkoutDialog'
import { toAgilityWorkoutBundle } from '@/components/workouts/import/converters'
import { TeamCalendarStudioContextBanner } from '@/components/coach/team-calendar/TeamCalendarStudioContextBanner'

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
  businessId?: string
}

export default function AgilityStudioClient({
  userId,
  initialDrills,
  initialWorkouts,
  initialAthletes,
  initialTimingSessions,
  businessId,
}: AgilityStudioClientProps) {
  const t = useTranslations('agilityStudio')
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState('drills')
  const [searchQuery, setSearchQuery] = useState('')
  const [developmentStage, setDevelopmentStage] = useState<DevelopmentStage | 'all'>('all')
  const [showWorkoutBuilder, setShowWorkoutBuilder] = useState(
    searchParams.get('fromCalendar') === 'true'
  )
  const [builderInitialStep, setBuilderInitialStep] = useState<1 | 2 | 3 | 4>(
    searchParams.get('fromCalendar') === 'true' ? 1 : 1
  )
  const [showImporter, setShowImporter] = useState(false)
  const [importedWorkoutSeed, setImportedWorkoutSeed] = useState<{
    initialWorkout: Partial<AgilityWorkout>
    initialDrills: ImportedDrillSeed[]
  } | null>(null)
  const [drills, setDrills] = useState(initialDrills)
  const [workouts, setWorkouts] = useState(initialWorkouts)
  const [timingSessions, setTimingSessions] = useState(initialTimingSessions)

  // Calendar assignment flow
  const fromCalendar = searchParams.get('fromCalendar') === 'true'
  const calendarClientId = searchParams.get('clientId')
  const calendarDate = searchParams.get('date')
  const [calendarAssignSessionId, setCalendarAssignSessionId] = useState<string | null>(null)

  const businessSlug = useMemo(() => {
    if (!pathname) return undefined
    const match = pathname.match(/^\/([^/]+)\/coach\//)
    if (match && match[1] !== 'coach') return match[1]
    return undefined
  }, [pathname])

  const handleWorkoutCreated = (newWorkout: AgilityWorkout) => {
    setWorkouts(prev => [newWorkout, ...prev])
    setShowWorkoutBuilder(false)
    if (fromCalendar && calendarClientId && calendarDate && newWorkout.id) {
      setCalendarAssignSessionId(newWorkout.id)
    } else {
      setActiveTab('workouts')
    }
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
      <TeamCalendarStudioContextBanner />

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImporter(true)}>
            <FileUp className="h-4 w-4 mr-2" />
            Importera pass
          </Button>
          <Button onClick={() => {
            setImportedWorkoutSeed(null)
            setBuilderInitialStep(1)
            setShowWorkoutBuilder(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            {t('createWorkout')}
          </Button>
        </div>
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
              const isHockeyDrill = drill.primarySports.includes('TEAM_ICE_HOCKEY')
              setImportedWorkoutSeed({
                initialWorkout: {
                  name: isHockeyDrill ? 'Hockey agility pass' : '',
                  format: isHockeyDrill ? 'PROGRESSIVE' : 'CIRCUIT',
                  targetSports: isHockeyDrill ? ['TEAM_ICE_HOCKEY'] : [],
                  primaryFocus: drill.category,
                  totalDuration: drill.durationSeconds ? Math.max(10, Math.ceil(drill.durationSeconds / 60) + 10) : undefined,
                  restBetweenDrills: drill.restSeconds ?? 30,
                  tags: isHockeyDrill ? ['hockey', drill.category.toLowerCase()] : [drill.category.toLowerCase()],
                },
                initialDrills: [{
                  drillId: drill.id,
                  sectionType: 'MAIN',
                  sets: drill.defaultSets ?? undefined,
                  reps: drill.defaultReps ?? undefined,
                  duration: drill.durationSeconds ?? undefined,
                  restSeconds: drill.restSeconds ?? undefined,
                }],
              })
              setBuilderInitialStep(3)
              setShowWorkoutBuilder(true)
            }}
          />
        </TabsContent>

        <TabsContent value="workouts" className="mt-6">
          <WorkoutList
            workouts={workouts}
            athletes={initialAthletes}
            searchQuery={searchQuery}
            onDelete={handleWorkoutDeleted}
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
          initialWorkout={importedWorkoutSeed?.initialWorkout}
          initialDrills={importedWorkoutSeed?.initialDrills}
          // When the importer prefills drills, jump past the format/audience
          // steps — the wizard otherwise discards the seeded drills if the
          // coach doesn't navigate forward.
          initialStep={builderInitialStep}
          onSave={(w) => {
            handleWorkoutCreated(w)
            setImportedWorkoutSeed(null)
          }}
          onClose={() => {
            setShowWorkoutBuilder(false)
            setImportedWorkoutSeed(null)
            setBuilderInitialStep(1)
          }}
        />
      )}

      <ImportWorkoutDialog
        workoutType="AGILITY"
        open={showImporter}
        onOpenChange={setShowImporter}
        onImported={({ workout, mappings }) => {
          if (workout.workoutType !== 'AGILITY') return
          const bundle = toAgilityWorkoutBundle(workout, mappings)
          // Drills without a library match can't be saved — the API requires
          // a real drillId. Drop them and tell the coach how many were lost
          // so they can pick replacements manually.
          const seedable = bundle.initialDrills.filter((d): d is typeof d & { drillId: string } => !!d.drillId)
          const dropped = bundle.initialDrills.length - seedable.length
          setImportedWorkoutSeed({
            initialWorkout: bundle.initialWorkout,
            initialDrills: seedable.map((d) => ({
              drillId: d.drillId,
              sectionType: d.sectionType,
              sets: d.sets,
              reps: d.reps,
              duration: d.duration,
              restSeconds: d.restSeconds,
              notes: d.notes,
            })),
          })
          setBuilderInitialStep(4)
          setShowWorkoutBuilder(true)
          if (dropped > 0) {
            toast.warning(
              `${dropped} drill${dropped === 1 ? '' : 's'} matchades inte i biblioteket — lägg till dem manuellt i steg 3.`
            )
          } else {
            toast.success('Pass importerat — granska och spara i byggaren')
          }
        }}
      />

      {/* Calendar Assignment Dialog */}
      {calendarAssignSessionId && calendarClientId && calendarDate && (
        <CalendarAssignDialog
          open={!!calendarAssignSessionId}
          onOpenChange={(open) => {
            if (!open) setCalendarAssignSessionId(null)
          }}
          sessionType="agility"
          sessionId={calendarAssignSessionId}
          clientId={calendarClientId}
          date={calendarDate}
          businessSlug={businessSlug}
          businessId={businessId}
        />
      )}
    </div>
  )
}
