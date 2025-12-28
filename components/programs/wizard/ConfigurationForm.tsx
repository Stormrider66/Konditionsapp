'use client'

import { useState, useEffect } from 'react'
import { SportType } from '@prisma/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalendarIcon, Loader2, ChevronDown, ChevronUp, Info, Sparkles, AlertTriangle, Plane, Briefcase, Palmtree, Mountain } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  storeProgramContext,
  type WizardFormData,
  type ProgramContext,
} from '@/lib/ai/program-context-builder'
import { addWeeks } from 'date-fns'
import { cn } from '@/lib/utils'
import { DataSourceType } from './DataSourceSelector'
import { HyroxRaceTimeAnalysis } from './HyroxRaceTimeAnalysis'
import { HyroxAthleteProfileCard } from './HyroxAthleteProfileCard'

const configSchema = z.object({
  clientId: z.string().min(1, 'Välj en atlet'),
  testId: z.string().optional(),
  durationWeeks: z.coerce.number().min(4).max(52),
  targetRaceDate: z.date().optional(),
  sessionsPerWeek: z.coerce.number().min(2).max(14),

  // Methodology (for running)
  methodology: z.enum(['AUTO', 'POLARIZED', 'NORWEGIAN', 'NORWEGIAN_SINGLES', 'CANOVA', 'PYRAMIDAL']).optional(),

  // Manual values
  manualFtp: z.coerce.number().optional(),
  manualCss: z.string().optional(),
  manualVdot: z.coerce.number().optional(),

  // Cycling specific
  weeklyHours: z.coerce.number().optional(),
  bikeType: z.enum(['road', 'mtb', 'gravel', 'indoor']).optional(),

  // Skiing specific
  technique: z.enum(['classic', 'skating', 'both']).optional(),

  // Swimming specific
  poolLength: z.enum(['25', '50']).optional(),

  // Strength integration
  includeStrength: z.boolean(),
  strengthSessionsPerWeek: z.coerce.number().min(0).max(3),

  // ===== NEW FIELDS =====

  // Athlete Profile (Running/HYROX/Triathlon)
  // 4 tiers aligned with vLT2-based classification:
  // - recreational: vLT2 < 10 km/h, marathon 4:30+
  // - intermediate: vLT2 10-13 km/h, marathon 3:30-4:30
  // - advanced: vLT2 13-16 km/h, marathon 3:00-3:30
  // - elite: vLT2 >= 16 km/h, marathon sub-3h
  experienceLevel: z.enum(['recreational', 'intermediate', 'advanced', 'elite']).optional(),
  currentWeeklyVolume: z.coerce.number().min(0).max(300).optional(),

  // Race Results for VDOT (Running/HYROX/Triathlon - pure running races only)
  recentRaceDistance: z.enum(['NONE', '5K', '10K', 'HALF', 'MARATHON']).optional(),
  recentRaceTime: z.string().optional(), // HH:MM:SS format

  // Target Race Goal Time (for progressive pace calculation)
  targetTime: z.string().optional(), // HH:MM:SS format - the goal time for the target race

  // Core & Alternative Training
  coreSessionsPerWeek: z.coerce.number().min(0).max(7).optional(),
  alternativeTrainingSessionsPerWeek: z.coerce.number().min(0).max(7).optional(),
  scheduleStrengthAfterRunning: z.boolean().optional(),
  scheduleCoreAfterRunning: z.boolean().optional(),

  // Equipment
  hasLactateMeter: z.boolean().optional(),
  hasPowerMeter: z.boolean().optional(), // Cycling/Triathlon only

  // ===== HYROX Station Times (MM:SS format) =====
  hyroxStationTimes: z.object({
    skierg: z.string().optional(),          // 1000m time
    sledPush: z.string().optional(),        // 50m time
    sledPull: z.string().optional(),        // 50m time
    burpeeBroadJump: z.string().optional(), // 80m time
    rowing: z.string().optional(),          // 1000m time
    farmersCarry: z.string().optional(),    // 200m time
    sandbagLunge: z.string().optional(),    // 100m time
    wallBalls: z.string().optional(),       // 75/100 reps time
    averageRunPace: z.string().optional(),  // Average 1km run pace
  }).optional(),

  // HYROX Division
  hyroxDivision: z.enum(['open', 'pro', 'doubles']).optional(),
  hyroxGender: z.enum(['male', 'female']).optional(),
  hyroxBodyweight: z.coerce.number().min(30).max(200).optional(), // kg

  // ===== Strength PRs (kg) =====
  strengthPRs: z.object({
    deadlift: z.coerce.number().optional(),
    backSquat: z.coerce.number().optional(),
    benchPress: z.coerce.number().optional(),
    overheadPress: z.coerce.number().optional(),
    barbellRow: z.coerce.number().optional(),
    pullUps: z.coerce.number().optional(), // max reps
  }).optional(),

  notes: z.string().optional(),
})

type ConfigFormData = z.infer<typeof configSchema>

interface Client {
  id: string
  name: string
  tests: { id: string; testDate: Date; testType: string }[]
}

// Calendar constraints API response
interface CalendarConstraintsResponse {
  constraints: {
    blockedDates: string[]
    reducedDates: string[]
    altitudePeriods: { start: string; end: string; altitude: number; phase: string }[]
    illnessRecoveryPeriods: { start: string; end: string; returnDate: string }[]
  }
  availability: {
    totalDays: number
    availableCount: number
    blockedCount: number
    reducedCount: number
    availablePercent: number
  }
  recommendation: {
    shouldUse: boolean
    reason: string
    hasBlockers: boolean
    hasAltitude: boolean
    hasIllness: boolean
  }
  upcomingEvents?: {
    title: string
    type: string
    startDate: string
    endDate: string
    impact: string
  }[]
}

interface ConfigurationFormProps {
  sport: SportType
  goal: string
  dataSource: DataSourceType
  clients: Client[]
  selectedClientId?: string
  onClientChange?: (clientId: string) => void
  onSubmit: (data: ConfigFormData) => Promise<void>
  isSubmitting: boolean
}

export function ConfigurationForm({
  sport,
  goal,
  dataSource,
  clients,
  selectedClientId,
  onClientChange,
  onSubmit,
  isSubmitting,
}: ConfigurationFormProps) {
  const router = useRouter()

  const isHyroxSport = sport === 'HYROX'

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      clientId: selectedClientId || '',
      durationWeeks: getDefaultDuration(sport, goal),
      sessionsPerWeek: 4,
      methodology: 'AUTO',
      includeStrength: isHyroxSport, // HYROX always includes strength training
      strengthSessionsPerWeek: isHyroxSport ? 2 : 2,
      technique: 'both',
      poolLength: '25',
      bikeType: 'road',
      notes: '',
      // New defaults
      experienceLevel: 'intermediate',
      currentWeeklyVolume: undefined,
      recentRaceDistance: 'NONE',
      recentRaceTime: '',
      targetTime: '',
      coreSessionsPerWeek: 0,
      alternativeTrainingSessionsPerWeek: 0,
      scheduleStrengthAfterRunning: false,
      scheduleCoreAfterRunning: false,
      hasLactateMeter: false,
      hasPowerMeter: false,
      // HYROX specific
      hyroxStationTimes: {
        skierg: '',
        sledPush: '',
        sledPull: '',
        burpeeBroadJump: '',
        rowing: '',
        farmersCarry: '',
        sandbagLunge: '',
        wallBalls: '',
        averageRunPace: '',
      },
      hyroxDivision: 'open',
      hyroxGender: undefined,
      hyroxBodyweight: undefined,
      // Strength PRs
      strengthPRs: {
        deadlift: undefined,
        backSquat: undefined,
        benchPress: undefined,
        overheadPress: undefined,
        barbellRow: undefined,
        pullUps: undefined,
      },
    },
  })

  const watchClientId = form.watch('clientId')
  const selectedClient = clients.find((c) => c.id === watchClientId)
  const watchTargetDate = form.watch('targetRaceDate')
  const watchIncludeStrength = form.watch('includeStrength')
  const watchRaceDistance = form.watch('recentRaceDistance')
  const watchMethodology = form.watch('methodology')
  const watchExperienceLevel = form.watch('experienceLevel')

  // Check if sport needs running-specific fields
  const needsRunningFields = sport === 'RUNNING' || sport === 'HYROX' || sport === 'TRIATHLON'
  const needsPowerMeter = sport === 'CYCLING' || sport === 'TRIATHLON'
  const isHyrox = sport === 'HYROX'

  // HYROX-specific state
  const [stationTimesOpen, setStationTimesOpen] = useState(false)
  const [strengthPRsOpen, setStrengthPRsOpen] = useState(false)

  // Calendar constraints state
  const [calendarData, setCalendarData] = useState<CalendarConstraintsResponse | null>(null)
  const [calendarLoading, setCalendarLoading] = useState(false)

  const watchDurationWeeks = form.watch('durationWeeks')

  // Fetch calendar constraints when client or duration changes
  useEffect(() => {
    async function fetchCalendarConstraints() {
      if (!watchClientId) {
        setCalendarData(null)
        return
      }

      setCalendarLoading(true)

      try {
        const startDate = new Date()
        const endDate = watchTargetDate || addWeeks(startDate, watchDurationWeeks || 12)

        // Fetch constraints and upcoming events in parallel
        const [constraintsRes, eventsRes] = await Promise.all([
          fetch(
            `/api/calendar/constraints?clientId=${watchClientId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&includeContext=true`
          ),
          fetch(
            `/api/calendar-events?clientId=${watchClientId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
          )
        ])

        if (!constraintsRes.ok) {
          // Calendar might not exist yet - this is okay
          if (constraintsRes.status === 404) {
            setCalendarData(null)
            return
          }
          throw new Error('Kunde inte hämta kalenderdata')
        }

        const constraintsData = await constraintsRes.json()

        // Parse upcoming events if available
        let upcomingEvents: CalendarConstraintsResponse['upcomingEvents'] = []
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json()
          upcomingEvents = (eventsData.events || eventsData || [])
            .filter((e: { trainingImpact: string }) => e.trainingImpact !== 'NORMAL')
            .slice(0, 5)
            .map((e: { title: string; type: string; startDate: string; endDate: string; trainingImpact: string }) => ({
              title: e.title,
              type: e.type,
              startDate: e.startDate,
              endDate: e.endDate,
              impact: e.trainingImpact,
            }))
        }

        setCalendarData({
          ...constraintsData,
          upcomingEvents,
        })
      } catch (error) {
        console.error('Calendar fetch error:', error)
        // Don't show error to user - calendar is optional
        setCalendarData(null)
      } finally {
        setCalendarLoading(false)
      }
    }

    fetchCalendarConstraints()
  }, [watchClientId, watchTargetDate, watchDurationWeeks])

  // Auto-calculate duration from target date
  useEffect(() => {
    if (watchTargetDate) {
      const today = new Date()
      const diffTime = watchTargetDate.getTime() - today.getTime()
      const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
      const clampedWeeks = Math.max(4, Math.min(52, diffWeeks))
      form.setValue('durationWeeks', clampedWeeks)
    }
  }, [watchTargetDate, form])

  // Notify parent when client selection changes
  useEffect(() => {
    if (watchClientId && onClientChange) {
      onClientChange(watchClientId)
    }
  }, [watchClientId, onClientChange])

  // Wrap submit to include calendar constraints
  const handleSubmit = form.handleSubmit((data) => {
    // Add calendar constraints to submission if available
    const submissionData = {
      ...data,
      calendarConstraints: calendarData?.constraints ? {
        blockedDates: calendarData.constraints.blockedDates,
        reducedDates: calendarData.constraints.reducedDates,
        altitudePeriods: calendarData.constraints.altitudePeriods.map(p => ({
          start: p.start,
          end: p.end,
          altitude: p.altitude,
        })),
      } : undefined,
    }
    return onSubmit(submissionData as any)
  })

  // Handle "Continue with AI Studio" button
  const handleContinueWithAI = () => {
    const formData = form.getValues()
    const selectedClient = clients.find(c => c.id === formData.clientId)

    // Build the wizard form data
    const wizardFormData: WizardFormData = {
      sport,
      goal,
      dataSource,
      clientId: formData.clientId,
      clientName: selectedClient?.name || 'Okänd atlet',
      testId: formData.testId,
      durationWeeks: formData.durationWeeks,
      targetRaceDate: formData.targetRaceDate,
      sessionsPerWeek: formData.sessionsPerWeek,
      methodology: formData.methodology,
      manualFtp: formData.manualFtp,
      manualCss: formData.manualCss,
      manualVdot: formData.manualVdot,
      weeklyHours: formData.weeklyHours,
      bikeType: formData.bikeType,
      technique: formData.technique,
      poolLength: formData.poolLength,
      experienceLevel: formData.experienceLevel,
      currentWeeklyVolume: formData.currentWeeklyVolume,
      recentRaceDistance: formData.recentRaceDistance,
      recentRaceTime: formData.recentRaceTime,
      targetTime: formData.targetTime,
      includeStrength: formData.includeStrength,
      strengthSessionsPerWeek: formData.strengthSessionsPerWeek,
      coreSessionsPerWeek: formData.coreSessionsPerWeek,
      alternativeTrainingSessionsPerWeek: formData.alternativeTrainingSessionsPerWeek,
      scheduleStrengthAfterRunning: formData.scheduleStrengthAfterRunning,
      scheduleCoreAfterRunning: formData.scheduleCoreAfterRunning,
      hasLactateMeter: formData.hasLactateMeter,
      hasPowerMeter: formData.hasPowerMeter,
      hyroxStationTimes: formData.hyroxStationTimes,
      hyroxDivision: formData.hyroxDivision,
      hyroxGender: formData.hyroxGender,
      hyroxBodyweight: formData.hyroxBodyweight,
      strengthPRs: formData.strengthPRs,
      notes: formData.notes,
    }

    // Build the context
    const context: ProgramContext = {
      wizardData: wizardFormData,
    }

    // Store context in sessionStorage
    storeProgramContext(context)

    // Navigate to AI Studio in program mode
    router.push(`/coach/ai-studio?mode=program&clientId=${formData.clientId}`)
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Konfigurera program</h2>
          <p className="text-muted-foreground">
            Finjustera inställningarna för ditt {getSportLabel(sport).toLowerCase()}program
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Selection */}
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Atlet *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj atlet" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Test Selection (if dataSource is TEST) */}
          {dataSource === 'TEST' && selectedClient && (
            <FormField
              control={form.control}
              name="testId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Konditionstest *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj test" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {selectedClient.tests.map((test) => (
                        <SelectItem key={test.id} value={test.id}>
                          {format(new Date(test.testDate), 'PPP', { locale: sv })} -{' '}
                          {test.testType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Manual Values (if dataSource is MANUAL) */}
          {dataSource === 'MANUAL' && sport === 'CYCLING' && (
            <FormField
              control={form.control}
              name="manualFtp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>FTP (Functional Threshold Power) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="t.ex. 280"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const val = e.target.value
                        field.onChange(val === '' ? undefined : parseInt(val))
                      }}
                    />
                  </FormControl>
                  <FormDescription>Watt vid tröskel (1 timmes max)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {dataSource === 'MANUAL' && sport === 'SWIMMING' && (
            <FormField
              control={form.control}
              name="manualCss"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CSS (Critical Swim Speed) *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="t.ex. 1:45"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || undefined)}
                    />
                  </FormControl>
                  <FormDescription>Tid per 100m (MM:SS)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {dataSource === 'MANUAL' && sport === 'RUNNING' && (
            <FormField
              control={form.control}
              name="manualVdot"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VDOT</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="t.ex. 45"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const val = e.target.value
                        field.onChange(val === '' ? undefined : parseInt(val))
                      }}
                    />
                  </FormControl>
                  <FormDescription>Daniels VDOT (valfritt)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Target Date */}
          <FormField
            control={form.control}
            name="targetRaceDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Måldatum (valfritt)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP', { locale: sv })
                        ) : (
                          <span>Välj datum</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Programlängden beräknas automatiskt
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Target Time / Goal Time (Running only) */}
          {needsRunningFields && (
            <FormField
              control={form.control}
              name="targetTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Måltid för tävling</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        goal === 'marathon' ? 'H:MM:SS (t.ex. 3:30:00)' :
                        goal === 'half-marathon' ? 'H:MM:SS (t.ex. 1:45:00)' :
                        goal === '10k' ? 'MM:SS (t.ex. 45:00)' :
                        goal === '5k' ? 'MM:SS (t.ex. 22:00)' :
                        'H:MM:SS'
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Programmet bygger gradvis upp tempo från nuvarande form till måltempo
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Duration */}
          <FormField
            control={form.control}
            name="durationWeeks"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Antal veckor *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={4}
                    max={52}
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseInt(e.target.value)
                      field.onChange(isNaN(val as number) ? undefined : val)
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Sessions per week */}
          <FormField
            control={form.control}
            name="sessionsPerWeek"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pass per vecka *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={2}
                    max={14}
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : parseInt(e.target.value)
                      field.onChange(isNaN(val as number) ? undefined : val)
                    }}
                  />
                </FormControl>
                <FormDescription>
                  {sport === 'RUNNING' ? 'Löppass' : sport === 'CYCLING' ? 'Cykelpass' : 'Träningspass'} per vecka
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Methodology (Running only) */}
          {sport === 'RUNNING' && (
            <FormField
              control={form.control}
              name="methodology"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Träningsmetodik</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="AUTO">Automatiskt val</SelectItem>
                      <SelectItem value="POLARIZED">Polarized (80/20)</SelectItem>
                      <SelectItem value="NORWEGIAN">Norwegian (Dubbel tröskel)</SelectItem>
                      <SelectItem value="NORWEGIAN_SINGLES">Norwegian Singles (Enkel tröskel)</SelectItem>
                      <SelectItem value="CANOVA">Canova (Marathon-specialist)</SelectItem>
                      <SelectItem value="PYRAMIDAL">Pyramidal</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Show suggestion when AUTO is selected */}
                  {field.value === 'AUTO' && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <span className="font-medium text-blue-800">
                            Rekommendation: {getSuggestedMethodology(watchExperienceLevel, goal).name}
                          </span>
                          <p className="text-blue-700 mt-1">
                            {getSuggestedMethodology(watchExperienceLevel, goal).reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Experience Level (Running/HYROX/Triathlon) - 4 tiers aligned with vLT2 */}
          {needsRunningFields && (
            <FormField
              control={form.control}
              name="experienceLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prestationsnivå</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj nivå" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="recreational">
                        <div className="flex flex-col">
                          <span>Motionär</span>
                          <span className="text-xs text-muted-foreground">Maraton 4:30+, tröskel &gt;6:00/km</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="intermediate">
                        <div className="flex flex-col">
                          <span>Medel</span>
                          <span className="text-xs text-muted-foreground">Maraton 3:30-4:30, tröskel 4:37-6:00/km</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="advanced">
                        <div className="flex flex-col">
                          <span>Avancerad</span>
                          <span className="text-xs text-muted-foreground">Maraton 3:00-3:30, tröskel 3:45-4:37/km</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="elite">
                        <div className="flex flex-col">
                          <span>Elit</span>
                          <span className="text-xs text-muted-foreground">Maraton sub-3h, tröskel &lt;3:45/km</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Påverkar tempo och progressionshastighet i programmet
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Current Weekly Volume (Running/HYROX/Triathlon) */}
          {needsRunningFields && (
            <FormField
              control={form.control}
              name="currentWeeklyVolume"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nuvarande veckodistans (km)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="t.ex. 40"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const val = e.target.value
                        field.onChange(val === '' ? undefined : parseInt(val))
                      }}
                    />
                  </FormControl>
                  <FormDescription>Genomsnittlig km/vecka senaste månaden</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Calendar Constraints Section */}
        {watchClientId && (
          <div className="border rounded-lg p-4 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">Kalenderinformation</h3>
              {calendarLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {calendarData && calendarData.recommendation.shouldUse ? (
              <div className="space-y-3">
                {/* Summary */}
                <div className="flex flex-wrap gap-3 text-sm">
                  {calendarData.availability.blockedCount > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-700 rounded-md">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>{calendarData.availability.blockedCount} blockerade dagar</span>
                    </div>
                  )}
                  {calendarData.availability.reducedCount > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded-md">
                      <Info className="h-3.5 w-3.5" />
                      <span>{calendarData.availability.reducedCount} reducerade dagar</span>
                    </div>
                  )}
                  {calendarData.constraints.altitudePeriods.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                      <Mountain className="h-3.5 w-3.5" />
                      <span>{calendarData.constraints.altitudePeriods.length} höghöjdsläger</span>
                    </div>
                  )}
                </div>

                {/* Upcoming events list */}
                {calendarData.upcomingEvents && calendarData.upcomingEvents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Kommande händelser:</p>
                    <div className="space-y-1.5">
                      {calendarData.upcomingEvents.slice(0, 5).map((event, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm pl-2 border-l-2 border-muted">
                          {event.type === 'TRAVEL' && <Plane className="h-3.5 w-3.5 text-muted-foreground" />}
                          {event.type === 'WORK_BLOCKER' && <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />}
                          {event.type === 'VACATION' && <Palmtree className="h-3.5 w-3.5 text-muted-foreground" />}
                          {event.type === 'ALTITUDE_CAMP' && <Mountain className="h-3.5 w-3.5 text-muted-foreground" />}
                          {!['TRAVEL', 'WORK_BLOCKER', 'VACATION', 'ALTITUDE_CAMP'].includes(event.type) && (
                            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className="font-medium">{event.title}</span>
                          <span className="text-muted-foreground">
                            {format(new Date(event.startDate), 'd MMM', { locale: sv })}
                            {event.startDate !== event.endDate && ` - ${format(new Date(event.endDate), 'd MMM', { locale: sv })}`}
                          </span>
                          <span className={cn(
                            'text-xs px-1.5 py-0.5 rounded',
                            event.impact === 'NO_TRAINING' && 'bg-red-100 text-red-700',
                            event.impact === 'REDUCED' && 'bg-amber-100 text-amber-700',
                            event.impact === 'MODIFIED' && 'bg-blue-100 text-blue-700'
                          )}>
                            {event.impact === 'NO_TRAINING' && 'Ingen träning'}
                            {event.impact === 'REDUCED' && 'Reducerad'}
                            {event.impact === 'MODIFIED' && 'Anpassad'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Programmet kommer automatiskt anpassas efter dessa kalenderbegränsningar.
                    Träningspass schemaläggs inte på blockerade dagar.
                  </AlertDescription>
                </Alert>
              </div>
            ) : !calendarLoading ? (
              <div className="text-sm text-muted-foreground">
                <p>Inga kalenderbegränsningar hittades för denna period.</p>
                <p className="mt-1">
                  Atleten kan lägga till resor, semester och andra blockerare i sin kalender under{' '}
                  <span className="font-medium">Atlet &rarr; Kalender</span>.
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* Race Results Section (for VDOT calculation) */}
        {needsRunningFields && (
          <div className="border rounded-lg p-4 mt-6">
            <h3 className="font-medium mb-3">Tävlingsresultat för tempokalkylering</h3>
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                {sport === 'HYROX'
                  ? 'Ange ett resultat från en ren löptävling (5K, 10K, etc.) - EJ HYROX-tid. HYROX-tid inkluderar stationstider och kan inte användas för löptempo.'
                  : 'Ange ditt bästa tävlingsresultat från de senaste 12 månaderna för att beräkna VDOT och optimala träningstempo.'}
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="recentRaceDistance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tävlingsdistans</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj distans" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">Inget tävlingsresultat</SelectItem>
                        <SelectItem value="5K">5 km</SelectItem>
                        <SelectItem value="10K">10 km</SelectItem>
                        <SelectItem value="HALF">Halvmaraton (21,1 km)</SelectItem>
                        <SelectItem value="MARATHON">Maraton (42,2 km)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchRaceDistance && watchRaceDistance !== 'NONE' && (
                <FormField
                  control={form.control}
                  name="recentRaceTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sluttid</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={watchRaceDistance === '5K' || watchRaceDistance === '10K' ? 'MM:SS' : 'H:MM:SS'}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {watchRaceDistance === '5K' && 't.ex. 22:30'}
                        {watchRaceDistance === '10K' && 't.ex. 47:15'}
                        {watchRaceDistance === 'HALF' && 't.ex. 1:45:00'}
                        {watchRaceDistance === 'MARATHON' && 't.ex. 3:45:00'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>
        )}

        {/* HYROX Station Times Section */}
        {isHyrox && (
          <Collapsible open={stationTimesOpen} onOpenChange={setStationTimesOpen} className="border rounded-lg p-4 mt-6">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <div className="text-left">
                  <h3 className="font-medium">HYROX Stationstider</h3>
                  <p className="text-sm text-muted-foreground">Ange dina nuvarande stationstider för analys</p>
                </div>
                {stationTimesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Division & Gender */}
                <FormField
                  control={form.control}
                  name="hyroxDivision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Division</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj division" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="doubles">Doubles</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hyroxGender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kön (för benchmarks)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj kön" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Man</SelectItem>
                          <SelectItem value="female">Kvinna</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hyroxBodyweight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kroppsvikt (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="t.ex. 80"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val === '' ? undefined : parseFloat(val))
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 text-sm">Stationstider (MM:SS)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="hyroxStationTimes.skierg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">SkiErg 1km</FormLabel>
                        <FormControl>
                          <Input placeholder="3:45" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hyroxStationTimes.sledPush"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Sled Push 50m</FormLabel>
                        <FormControl>
                          <Input placeholder="2:30" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hyroxStationTimes.sledPull"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Sled Pull 50m</FormLabel>
                        <FormControl>
                          <Input placeholder="3:00" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hyroxStationTimes.burpeeBroadJump"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Burpee BJ 80m</FormLabel>
                        <FormControl>
                          <Input placeholder="2:40" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hyroxStationTimes.rowing"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Rowing 1km</FormLabel>
                        <FormControl>
                          <Input placeholder="3:45" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hyroxStationTimes.farmersCarry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Farmers 200m</FormLabel>
                        <FormControl>
                          <Input placeholder="1:30" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hyroxStationTimes.sandbagLunge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Lunge 100m</FormLabel>
                        <FormControl>
                          <Input placeholder="3:00" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hyroxStationTimes.wallBalls"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Wall Balls</FormLabel>
                        <FormControl>
                          <Input placeholder="3:30" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="hyroxStationTimes.averageRunPace"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Genomsnittligt löptempo (min/km)</FormLabel>
                        <FormControl>
                          <Input placeholder="4:30" className="max-w-[150px]" {...field} />
                        </FormControl>
                        <FormDescription>Tempo för 1km-avsnitten mellan stationer</FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Stationstider används för att identifiera svagheter och prioritera träningen.
                  Sled Pull och Wall Balls är vanliga &quot;time sinks&quot; för nybörjare.
                </AlertDescription>
              </Alert>

              {/* Real-time Race Time Analysis */}
              <HyroxRaceTimeAnalysis
                stationTimes={{
                  skierg: form.watch('hyroxStationTimes.skierg'),
                  sledPush: form.watch('hyroxStationTimes.sledPush'),
                  sledPull: form.watch('hyroxStationTimes.sledPull'),
                  burpeeBroadJump: form.watch('hyroxStationTimes.burpeeBroadJump'),
                  rowing: form.watch('hyroxStationTimes.rowing'),
                  farmersCarry: form.watch('hyroxStationTimes.farmersCarry'),
                  sandbagLunge: form.watch('hyroxStationTimes.sandbagLunge'),
                  wallBalls: form.watch('hyroxStationTimes.wallBalls'),
                  averageRunPace: form.watch('hyroxStationTimes.averageRunPace'),
                }}
                gender={form.watch('hyroxGender')}
                targetTime={form.watch('targetTime')}
              />

              {/* Athlete Profile Analysis */}
              <HyroxAthleteProfileCard
                recentRaceDistance={watchRaceDistance as '5K' | '10K' | 'HALF' | 'MARATHON' | undefined}
                recentRaceTime={form.watch('recentRaceTime')}
                hyroxAverageRunPace={form.watch('hyroxStationTimes.averageRunPace')}
                stationTimes={{
                  skierg: form.watch('hyroxStationTimes.skierg'),
                  sledPush: form.watch('hyroxStationTimes.sledPush'),
                  sledPull: form.watch('hyroxStationTimes.sledPull'),
                  burpeeBroadJump: form.watch('hyroxStationTimes.burpeeBroadJump'),
                  rowing: form.watch('hyroxStationTimes.rowing'),
                  farmersCarry: form.watch('hyroxStationTimes.farmersCarry'),
                  sandbagLunge: form.watch('hyroxStationTimes.sandbagLunge'),
                  wallBalls: form.watch('hyroxStationTimes.wallBalls'),
                }}
                gender={form.watch('hyroxGender')}
                experienceLevel={form.watch('experienceLevel')}
                currentWeeklyKm={form.watch('currentWeeklyVolume')}
                goalTime={form.watch('targetTime')}
              />
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Strength PRs Section (HYROX and when strength is included) */}
        {(isHyrox || watchIncludeStrength) && (
          <Collapsible open={strengthPRsOpen} onOpenChange={setStrengthPRsOpen} className="border rounded-lg p-4 mt-6">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <div className="text-left">
                  <h3 className="font-medium">Styrke-PRs</h3>
                  <p className="text-sm text-muted-foreground">Ange dina 1RM för att beräkna träningsvikter</p>
                </div>
                {strengthPRsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="strengthPRs.deadlift"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marklyft (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="t.ex. 150"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val === '' ? undefined : parseFloat(val))
                          }}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">1RM</FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="strengthPRs.backSquat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Knäböj (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="t.ex. 120"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val === '' ? undefined : parseFloat(val))
                          }}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">1RM</FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="strengthPRs.benchPress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bänkpress (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="t.ex. 100"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val === '' ? undefined : parseFloat(val))
                          }}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">1RM</FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="strengthPRs.overheadPress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Axelpress (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="t.ex. 60"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val === '' ? undefined : parseFloat(val))
                          }}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">1RM</FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="strengthPRs.barbellRow"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rodd (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="t.ex. 80"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val === '' ? undefined : parseFloat(val))
                          }}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">1RM</FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="strengthPRs.pullUps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chins (reps)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="t.ex. 10"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val === '' ? undefined : parseInt(val))
                          }}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">Max strikta</FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Styrke-PRs används för att beräkna träningsvikter (% av 1RM).
                  {isHyrox && ' För HYROX Pro Division rekommenderas minst 1.5x kroppsvikt i marklyft.'}
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cycling specific: Weekly hours */}
          {sport === 'CYCLING' && (
            <FormField
              control={form.control}
              name="weeklyHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Veckotimmar</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj timmar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="6">6 timmar</SelectItem>
                      <SelectItem value="8">8 timmar</SelectItem>
                      <SelectItem value="10">10 timmar</SelectItem>
                      <SelectItem value="12">12 timmar</SelectItem>
                      <SelectItem value="15">15 timmar</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Skiing specific: Technique */}
          {sport === 'SKIING' && (
            <FormField
              control={form.control}
              name="technique"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teknik</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="classic">Klassisk</SelectItem>
                      <SelectItem value="skating">Skating</SelectItem>
                      <SelectItem value="both">Båda</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Swimming specific: Pool length */}
          {sport === 'SWIMMING' && (
            <FormField
              control={form.control}
              name="poolLength"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bassänglängd</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="25">25 meter</SelectItem>
                      <SelectItem value="50">50 meter</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Strength & Core Integration (not for pure strength programs) */}
        {sport !== 'STRENGTH' && (
          <div className="border-t pt-6 mt-6">
            <h3 className="font-medium mb-4">Tillägg i programmet</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strength Column */}
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="includeStrength"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Inkludera styrketräning</FormLabel>
                        <FormDescription>
                          Periodiserad styrketräning
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {watchIncludeStrength && (
                  <>
                    <FormField
                      control={form.control}
                      name="strengthSessionsPerWeek"
                      render={({ field }) => (
                        <FormItem className="ml-7">
                          <FormLabel>Styrkepass per vecka</FormLabel>
                          <Select
                            onValueChange={(v) => field.onChange(parseInt(v))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1x</SelectItem>
                              <SelectItem value="2">2x</SelectItem>
                              <SelectItem value="3">3x</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="scheduleStrengthAfterRunning"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 ml-7">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm">Schemalägg efter löpning</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>

              {/* Core Column */}
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="coreSessionsPerWeek"
                  render={({ field }) => {
                    const hasCoreTraining = (field.value ?? 0) > 0
                    return (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={hasCoreTraining}
                            onCheckedChange={(checked) => {
                              field.onChange(checked ? 2 : 0)
                            }}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Inkludera core-träning</FormLabel>
                          <FormDescription>
                            Core/bålstabilitet
                          </FormDescription>
                        </div>
                      </FormItem>
                    )
                  }}
                />

                {(form.watch('coreSessionsPerWeek') ?? 0) > 0 && (
                  <>
                    <FormField
                      control={form.control}
                      name="coreSessionsPerWeek"
                      render={({ field }) => (
                        <FormItem className="ml-7">
                          <FormLabel>Core-pass per vecka</FormLabel>
                          <Select
                            onValueChange={(v) => field.onChange(parseInt(v))}
                            value={field.value?.toString() || '2'}
                          >
                            <FormControl>
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1x</SelectItem>
                              <SelectItem value="2">2x</SelectItem>
                              <SelectItem value="3">3x</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="scheduleCoreAfterRunning"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 ml-7">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm">Schemalägg efter löpning</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cross-training / Alternative Training */}
        {needsRunningFields && (
          <div className="border-t pt-6 mt-6">
            <h3 className="font-medium mb-4">Alternativ träning</h3>
            <FormField
              control={form.control}
              name="alternativeTrainingSessionsPerWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pass per vecka med annan sport</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v))}
                    value={field.value?.toString() || '0'}
                  >
                    <FormControl>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="0" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Cykling, skidåkning, simning, etc. för variation och aktiv återhämtning</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Equipment - Lactate Meter (Running only, enables Norwegian method) */}
        {sport === 'RUNNING' && (
          <div className="border-t pt-6 mt-6">
            <h3 className="font-medium mb-4">Utrustning</h3>
            <FormField
              control={form.control}
              name="hasLactateMeter"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Har laktatmätare</FormLabel>
                    <FormDescription>
                      Möjliggör Norwegian-metoden med tröskelträning baserad på laktatvärden
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Power Meter (Cycling/Triathlon only) */}
        {needsPowerMeter && (
          <div className="border-t pt-6 mt-6">
            <h3 className="font-medium mb-4">Utrustning</h3>
            <FormField
              control={form.control}
              name="hasPowerMeter"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Har wattmätare</FormLabel>
                    <FormDescription>
                      Aktiverar wattbaserad träning och power zones
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anteckningar</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Eventuella anteckningar om programmet..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleContinueWithAI}
            disabled={!watchClientId || isSubmitting}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Fortsätt med AI Studio
          </Button>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generera program
          </Button>
        </div>
      </form>
    </Form>
  )
}

function getDefaultDuration(sport: SportType, goal: string): number {
  const durations: Record<string, Record<string, number>> = {
    RUNNING: {
      marathon: 20,
      'half-marathon': 16,
      '10k': 10,
      '5k': 8,
      custom: 12,
    },
    CYCLING: {
      'ftp-builder': 8,
      'base-builder': 12,
      'gran-fondo': 8,
      custom: 12,
    },
    SKIING: {
      'threshold-builder': 8,
      'prep-phase': 12,
      vasaloppet: 16,
      custom: 12,
    },
    SWIMMING: {
      sprint: 8,
      distance: 12,
      'open-water': 12,
      custom: 12,
    },
    TRIATHLON: {
      sprint: 8,
      olympic: 12,
      'half-ironman': 16,
      ironman: 24,
      custom: 16,
    },
    HYROX: {
      pro: 12,
      'age-group': 12,
      doubles: 8,
      custom: 12,
    },
    STRENGTH: {
      'injury-prevention': 10,
      power: 14,
      'running-economy': 12,
      general: 12,
    },
    GENERAL_FITNESS: {
      weight_loss: 12,
      strength: 12,
      endurance: 12,
      flexibility: 8,
      stress_relief: 8,
      general_health: 8,
    },
  }

  return durations[sport]?.[goal] || 12
}

function getSportLabel(sport: SportType): string {
  const labels: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    STRENGTH: 'Styrka',
    SKIING: 'Skidåkning',
    SWIMMING: 'Simning',
    TRIATHLON: 'Triathlon',
    HYROX: 'HYROX',
    GENERAL_FITNESS: 'Allmän Fitness',
  }
  return labels[sport] || sport
}

/**
 * Get suggested methodology based on experience level and goal
 */
function getSuggestedMethodology(
  experienceLevel: string | undefined,
  goalType: string
): { method: string; name: string; reason: string } {
  // Beginners should use Polarized (simplest, safest)
  if (experienceLevel === 'beginner') {
    return {
      method: 'POLARIZED',
      name: 'Polarized (80/20)',
      reason: 'Enklaste och säkraste metoden för nybörjare. 80% lätt träning, 20% hård träning.',
    }
  }

  // Intermediate athletes can use Pyramidal for more threshold work
  if (experienceLevel === 'intermediate') {
    return {
      method: 'PYRAMIDAL',
      name: 'Pyramidal',
      reason: 'Balanserad metod med mer tröskelträning. Passar dig som har grundläggande kondition.',
    }
  }

  // Advanced athletes - select based on goal
  if (experienceLevel === 'advanced') {
    switch (goalType) {
      case 'marathon':
      case 'half-marathon':
        return {
          method: 'CANOVA',
          name: 'Canova (Marathon-specialist)',
          reason: 'Marathon-specialist metodik med fokus på specifik uthållighet för längre distanser.',
        }
      case '10k':
      case '5k':
        return {
          method: 'NORWEGIAN_SINGLE',
          name: 'Norwegian Singles',
          reason: 'Mer tröskelträning för kortare distanser. Effektivt för 5K och 10K.',
        }
      default:
        return {
          method: 'POLARIZED',
          name: 'Polarized (80/20)',
          reason: 'Klassisk och beprövad metod som fungerar för alla nivåer.',
        }
    }
  }

  // Default fallback
  return {
    method: 'POLARIZED',
    name: 'Polarized (80/20)',
    reason: 'Klassisk och beprövad metod som fungerar för alla nivåer.',
  }
}
