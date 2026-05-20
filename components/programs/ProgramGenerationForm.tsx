// components/programs/ProgramGenerationForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
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
import {
  GlassCard as Card,
  GlassCardContent as CardContent,
  GlassCardHeader as CardHeader,
  GlassCardTitle as CardTitle,
} from '@/components/ui/GlassCard'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon, Loader2, Info, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLocale, useTranslations } from '@/i18n/client'

const getDateLocale = (locale: string) => (locale === 'sv' ? sv : enUS)

type TranslateFn = (key: string, values?: Record<string, string | number | Date>) => string

const createFormSchema = (t: TranslateFn) =>
  z.object({
  clientId: z.string().min(1, t('validation.clientRequired')),
  testId: z.string().optional(), // Optional for CUSTOM methodology

  // Goal Configuration
  goalType: z.enum([
    'marathon',
    'half-marathon',
    '10k',
    '5k',
    'fitness',
    'cycling',
    'skiing',
    'swimming',
    'triathlon',
    'hyrox',
    'custom',
  ]),
  targetRaceDate: z.date().optional(),
  targetTime: z.string().optional(), // HH:MM:SS format

  // General Fitness specific settings
  fitnessGoal: z.enum([
    'weight_loss',
    'general_health',
    'strength',
    'endurance',
    'flexibility',
    'stress_relief',
  ]).optional(),
  fitnessLevel: z.enum([
    'sedentary',
    'lightly_active',
    'moderately_active',
    'very_active',
    'athlete',
  ]).optional(),
  hasGymAccess: z.boolean().default(false),
  preferredActivities: z.array(z.string()).optional(),

  // Program Structure
  durationWeeks: z.number().min(4).max(52),
  trainingDaysPerWeek: z.number().min(2).max(7), // Legacy field, kept for backward compatibility

  // Granular Session Control
  runningSessionsPerWeek: z.number().min(1).max(14).default(4), // Can have double days
  strengthSessionsPerWeek: z.number().min(0).max(7).default(0),
  coreSessionsPerWeek: z.number().min(0).max(7).default(0),
  alternativeTrainingSessionsPerWeek: z.number().min(0).max(7).default(0),

  // Session Scheduling Options
  scheduleStrengthAfterRunning: z.boolean().default(false), // Same day PM session
  scheduleCoreAfterRunning: z.boolean().default(false), // Same day PM session

  // Training Methodology
  methodology: z.enum(['AUTO', 'POLARIZED', 'NORWEGIAN', 'NORWEGIAN_SINGLE', 'CANOVA', 'PYRAMIDAL', 'LYDIARD', 'CUSTOM']),

  // Athlete Profile
  yearsRunning: z.number().min(0).max(50).optional(),
  currentWeeklyVolume: z.number().min(0).optional(), // km/week
  longestLongRun: z.number().min(0).max(50).optional(), // km
  recentRaceDistance: z.enum(['NONE', '5K', '10K', 'HALF', 'MARATHON']).optional(),
  recentRaceTime: z.string().optional(), // HH:MM:SS format

  // Equipment & Monitoring
  hasLactateMeter: z.boolean().default(false),
  hasHRVMonitor: z.boolean().default(false),
  hasPowerMeter: z.boolean().default(false),

  // Injury & Health
  hasRecentInjury: z.boolean().default(false),
  injuryDetails: z.string().optional(),

  // Training Preferences
  preferredTrainingDays: z.array(z.number()).optional(), // 0=Mon, 1=Tue, etc.
  maxSessionDuration: z.number().min(30).max(300).optional(), // minutes

  // Notes
  notes: z.string().optional(),
})

type FormData = z.infer<ReturnType<typeof createFormSchema>>

interface ProgramGenerationFormProps {
  clients: any[]
}

// Helper function to recommend methodology based on athlete profile
function recommendMethodology(data: Partial<FormData>, t: TranslateFn): string {
  const { yearsRunning, currentWeeklyVolume, hasLactateMeter, hasHRVMonitor, goalType } = data

  // Norwegian Method - Elite athletes with equipment
  if (
    yearsRunning && yearsRunning >= 2 &&
    currentWeeklyVolume && currentWeeklyVolume >= 60 &&
    hasLactateMeter &&
    hasHRVMonitor
  ) {
    return t('methodology.recommendations.norwegian')
  }

  // Canova - Marathon specialists
  if (goalType === 'marathon' && yearsRunning && yearsRunning >= 3) {
    return t('methodology.recommendations.canova')
  }

  // Polarized - Advanced athletes
  if (
    yearsRunning && yearsRunning >= 2 &&
    currentWeeklyVolume && currentWeeklyVolume >= 40
  ) {
    return t('methodology.recommendations.polarized')
  }

  // Pyramidal - Intermediate athletes
  if (yearsRunning && yearsRunning >= 1) {
    return t('methodology.recommendations.pyramidal')
  }

  // Lydiard - Beginners
  return t('methodology.recommendations.lydiard')
}

export function ProgramGenerationForm({ clients }: ProgramGenerationFormProps) {
  const t = useTranslations('components.careTeam.programGenerationForm')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const pathBusinessSlug = getBusinessSlugFromPathname(pathname)
  const basePath = pathBusinessSlug ? `/${pathBusinessSlug}` : ''
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [methodologyRecommendation, setMethodologyRecommendation] = useState<string>('')
  const formSchema = createFormSchema(t)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      clientId: '',
      testId: '',
      goalType: 'marathon',
      targetTime: '',
      fitnessGoal: 'general_health',
      fitnessLevel: 'moderately_active',
      hasGymAccess: false,
      preferredActivities: [],
      durationWeeks: 16,
      trainingDaysPerWeek: 4,
      runningSessionsPerWeek: 4,
      strengthSessionsPerWeek: 2,
      coreSessionsPerWeek: 2,
      alternativeTrainingSessionsPerWeek: 0,
      scheduleStrengthAfterRunning: true, // Default to PM sessions
      scheduleCoreAfterRunning: true,
      methodology: 'AUTO',
      yearsRunning: undefined,
      currentWeeklyVolume: undefined,
      longestLongRun: undefined,
      recentRaceDistance: 'NONE',
      recentRaceTime: '',
      hasLactateMeter: false,
      hasHRVMonitor: false,
      hasPowerMeter: false,
      hasRecentInjury: false,
      injuryDetails: '',
      preferredTrainingDays: [],
      maxSessionDuration: undefined,
      notes: '',
    },
  })

  const selectedClient = clients.find((c) => c.id === selectedClientId)

  // Update methodology recommendation when profile changes
  const watchedFields = form.watch([
    'yearsRunning',
    'currentWeeklyVolume',
    'hasLactateMeter',
    'hasHRVMonitor',
    'goalType',
  ])

  useEffect(() => {
    const recommendation = recommendMethodology(form.getValues(), t)
    setMethodologyRecommendation(recommendation)
  }, [form, watchedFields, t])

  // Auto-calculate program duration from race date
  const targetRaceDate = form.watch('targetRaceDate')

  useEffect(() => {
    if (targetRaceDate) {
      // Calculate weeks between today and race date
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Reset time to start of day

      const raceDate = new Date(targetRaceDate)
      raceDate.setHours(0, 0, 0, 0) // Reset time to start of day

      const diffTime = raceDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      const diffWeeks = Math.ceil(diffDays / 7)

      // Clamp between 4 and 52 weeks
      const weeks = Math.max(4, Math.min(52, diffWeeks))

      // Only update if different from current value
      const currentWeeks = form.getValues('durationWeeks')

      if (weeks !== currentWeeks && weeks >= 4) {
        form.setValue('durationWeeks', weeks, { shouldValidate: true, shouldDirty: true })
      }
    }
  }, [targetRaceDate, form])

  async function onSubmit(data: FormData) {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/programs/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          targetRaceDate: data.targetRaceDate?.toISOString(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || t('errors.createFailed'))
      }

      toast({
        title: t('toasts.createdTitle'),
        description: t('toasts.createdDescription'),
      })

      // Redirect to the new program
      // Use setTimeout to prevent NEXT_REDIRECT error from showing in console
      setTimeout(() => {
        router.push(`${basePath}/coach/programs/${result.data.id}`)
      }, 100)
    } catch (error: any) {
      // Filter out NEXT_REDIRECT errors (internal Next.js redirect mechanism)
      if (error.message && error.message.includes('NEXT_REDIRECT')) {
        // This is not a real error, just Next.js handling the redirect
        return
      }

      console.error('Error generating program:', error)
      toast({
        title: t('toasts.errorTitle'),
        description: error.message,
        variant: 'destructive',
      })
      setIsSubmitting(false)
    }
  }

  const isCustomMode = form.watch('methodology') === 'CUSTOM'

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Program Mode Selection */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle>{t('sections.programType')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => form.setValue('methodology', 'AUTO')}
                className={cn(
                  'p-4 border-2 rounded-lg cursor-pointer transition-all',
                  !isCustomMode
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/50'
                )}
                >
                  <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5',
                    !isCustomMode ? 'border-primary' : 'border-muted-foreground'
                  )}>
                    {!isCustomMode && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <h3 className="font-semibold">{t('mode.auto.title')}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('mode.auto.description')}
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => form.setValue('methodology', 'CUSTOM')}
                className={cn(
                  'p-4 border-2 rounded-lg cursor-pointer transition-all',
                  isCustomMode
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/50'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5',
                    isCustomMode ? 'border-primary' : 'border-muted-foreground'
                  )}>
                    {isCustomMode && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <h3 className="font-semibold">{t('mode.custom.title')}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('mode.custom.description')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client & Test Selection */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t('steps.client')}
              {!isCustomMode && t('steps.clientAndTest')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.clientLabel')}</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      setSelectedClientId(value)
                      form.setValue('testId', '')
                    }}
                    value={field.value}
                    >
                      <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('fields.clientPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} ({client.tests.length} test
                          {client.tests.length !== 1 && 'er'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedClient && form.watch('methodology') !== 'CUSTOM' && (
              <FormField
                control={form.control}
                name="testId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fields.testLabel')}</FormLabel>
                    {selectedClient.tests && selectedClient.tests.length > 0 ? (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('fields.testPlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedClient.tests.map((test: any) => (
                            <SelectItem key={test.id} value={test.id}>
                              {format(new Date(test.testDate), 'PPP', { locale: getDateLocale(locale) })} -{' '}
                              {test.testType}
                              {test.vo2max && ` (VO2max: ${test.vo2max.toFixed(1)})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/30">
                        {t('messages.noTestAvailable')}
                      </div>
                    )}
                    <FormDescription>
                      {t('descriptions.testSelection')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedClient && form.watch('methodology') === 'CUSTOM' && (
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>{t('alerts.customMode.title')}</strong> {t('alerts.customMode.description')}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Goal Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>{t('sections.goal')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="goalType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.goalType.label')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="marathon">{t('goalOptions.marathon')}</SelectItem>
                      <SelectItem value="half-marathon">{t('goalOptions.halfMarathon')}</SelectItem>
                      <SelectItem value="10k">{t('goalOptions.tenK')}</SelectItem>
                      <SelectItem value="5k">{t('goalOptions.fiveK')}</SelectItem>
                      <SelectItem value="fitness">{t('goalOptions.fitness')}</SelectItem>
                      <SelectItem value="cycling">{t('goalOptions.cycling')}</SelectItem>
                      <SelectItem value="skiing">{t('goalOptions.skiing')}</SelectItem>
                      <SelectItem value="swimming">{t('goalOptions.swimming')}</SelectItem>
                      <SelectItem value="triathlon">{t('goalOptions.triathlon')}</SelectItem>
                      <SelectItem value="hyrox">{t('goalOptions.hyrox')}</SelectItem>
                      <SelectItem value="custom">{t('goalOptions.custom')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* General Fitness Goal Configuration */}
            {form.watch('goalType') === 'fitness' && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium">{t('fitness.goalTitle')}</h4>

                <FormField
                  control={form.control}
                  name="fitnessGoal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fitness.primaryGoalLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('fitness.primaryGoalPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          <SelectItem value="weight_loss">{t('fitness.goalOptions.weightLoss')}</SelectItem>
                          <SelectItem value="general_health">{t('fitness.goalOptions.generalHealth')}</SelectItem>
                          <SelectItem value="strength">{t('fitness.goalOptions.strength')}</SelectItem>
                          <SelectItem value="endurance">{t('fitness.goalOptions.endurance')}</SelectItem>
                          <SelectItem value="flexibility">{t('fitness.goalOptions.flexibility')}</SelectItem>
                          <SelectItem value="stress_relief">{t('fitness.goalOptions.stressRelief')}</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormDescription>
                      {t('fitness.primaryGoalDescription')}
                    </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fitnessLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fitness.activityLevelLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('fitness.activityLevelPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          <SelectItem value="sedentary">{t('fitness.activityLevelOptions.sedentary')}</SelectItem>
                          <SelectItem value="lightly_active">{t('fitness.activityLevelOptions.lightlyActive')}</SelectItem>
                          <SelectItem value="moderately_active">{t('fitness.activityLevelOptions.moderatelyActive')}</SelectItem>
                          <SelectItem value="very_active">{t('fitness.activityLevelOptions.veryActive')}</SelectItem>
                          <SelectItem value="athlete">{t('fitness.activityLevelOptions.athlete')}</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormDescription>
                      {t('fitness.activityLevelDescription')}
                    </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasGymAccess"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>{t('fitness.gymAccessLabel')}</FormLabel>
                        <FormDescription>
                          {t('fitness.gymAccessDescription')}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="targetRaceDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('fields.targetRaceDateLabel')}</FormLabel>
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
                              format(field.value, 'PPP', { locale: getDateLocale(locale) })
                            ) : (
                              <span>{t('fields.targetDatePlaceholder')}</span>
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
                        disabled={(date) =>
                          date < new Date() || date < new Date('1900-01-01')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    {t('descriptions.durationFromRaceDate')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Target Time - only for test-based programs */}
        {!isCustomMode && form.watch('goalType') !== 'fitness' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('steps.timeGoal')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="targetTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fields.targetTimeLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('fields.targetTimePlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('descriptions.timeFormat')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Athlete Profile - only for test-based programs */}
        {!isCustomMode && (
        <Card>
          <CardHeader>
            <CardTitle>{t('steps.athleteProfile')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="yearsRunning"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('athleteProfile.yearsRunningLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        placeholder={t('athleteProfile.yearsRunningPlaceholder')}
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseInt(e.target.value) : undefined
                          )
                        }
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('athleteProfile.yearsRunningDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentWeeklyVolume"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('athleteProfile.currentWeeklyVolumeLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder={t('athleteProfile.currentWeeklyVolumePlaceholder')}
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseInt(e.target.value) : undefined
                          )
                        }
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('athleteProfile.currentWeeklyVolumeDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longestLongRun"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('athleteProfile.longestLongRunLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        placeholder={t('athleteProfile.longestLongRunPlaceholder')}
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseInt(e.target.value) : undefined
                          )
                        }
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('athleteProfile.longestLongRunDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Recent Race */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">{t('athleteProfile.recentRaceTitle')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="recentRaceDistance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('athleteProfile.recentRaceDistanceLabel')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NONE">{t('athleteProfile.recentRaceDistanceOptions.none')}</SelectItem>
                          <SelectItem value="5K">{t('athleteProfile.recentRaceDistanceOptions.fiveK')}</SelectItem>
                          <SelectItem value="10K">{t('athleteProfile.recentRaceDistanceOptions.tenK')}</SelectItem>
                          <SelectItem value="HALF">{t('athleteProfile.recentRaceDistanceOptions.halfMarathon')}</SelectItem>
                          <SelectItem value="MARATHON">{t('athleteProfile.recentRaceDistanceOptions.marathon')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recentRaceTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('athleteProfile.recentRaceTimeLabel')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('athleteProfile.recentRaceTimePlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('athleteProfile.recentRaceTimeDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Equipment & Monitoring - only for test-based programs */}
        {!isCustomMode && (
        <Card>
          <CardHeader>
            <CardTitle>{t('steps.equipment')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    <FormLabel>
                      {t('equipment.lactateMeterLabel')}
                    </FormLabel>
                    <FormDescription>
                      {t('equipment.lactateMeterDescription')}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hasHRVMonitor"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t('equipment.hrvMonitorLabel')}
                    </FormLabel>
                    <FormDescription>
                      {t('equipment.hrvMonitorDescription')}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

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
                    <FormLabel>
                      {t('equipment.powerMeterLabel')}
                    </FormLabel>
                    <FormDescription>
                      {t('equipment.powerMeterDescription')}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        )}

        {/* Methodology Selection - Only show for test-based programs */}
        {!isCustomMode && (
        <Card>
          <CardHeader>
            <CardTitle>{t('steps.methodology')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {methodologyRecommendation && (
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  <strong>{t('alerts.recommendationTitle')}:</strong> {methodologyRecommendation}
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="methodology"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('methodology.label')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="AUTO">
                        <div>
                          <div className="font-medium">{t('methodology.options.auto.title')}</div>
                          <div className="text-sm text-muted-foreground">
                            {t('methodology.options.auto.description')}
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="POLARIZED">
                        <div>
                          <div className="font-medium">{t('methodology.options.polarized.title')}</div>
                          <div className="text-sm text-muted-foreground">
                            {t('methodology.options.polarized.description')}
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="NORWEGIAN">
                        <div>
                          <div className="font-medium">{t('methodology.options.norwegian.title')}</div>
                          <div className="text-sm text-muted-foreground">
                            {t('methodology.options.norwegian.description')}
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="NORWEGIAN_SINGLE">
                        <div>
                          <div className="font-medium">{t('methodology.options.norwegianSingle.title')}</div>
                          <div className="text-sm text-muted-foreground">
                            {t('methodology.options.norwegianSingle.description')}
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="CANOVA">
                        <div>
                          <div className="font-medium">{t('methodology.options.canova.title')}</div>
                          <div className="text-sm text-muted-foreground">
                            {t('methodology.options.canova.description')}
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="PYRAMIDAL">
                        <div>
                          <div className="font-medium">{t('methodology.options.pyramidal.title')}</div>
                          <div className="text-sm text-muted-foreground">
                            {t('methodology.options.pyramidal.description')}
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="LYDIARD">
                        <div>
                          <div className="font-medium">{t('methodology.options.lydiard.title')}</div>
                          <div className="text-sm text-muted-foreground">
                            {t('methodology.options.lydiard.description')}
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="CUSTOM">
                        <div>
                          <div className="font-medium">{t('methodology.options.custom.title')}</div>
                          <div className="text-sm text-muted-foreground">
                            {t('methodology.options.custom.description')}
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('methodology.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Methodology Info Banner */}
            {form.watch('methodology') === 'CUSTOM' && (
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>{t('alerts.customProgramBuilder.title')}:</strong>{' '}
                  {t('alerts.customProgramBuilder.description')}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
        )}

        {/* Program Structure */}
        <Card>
          <CardHeader>
            <CardTitle>{isCustomMode ? t('steps.programStructureCustom') : t('steps.programStructure')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="durationWeeks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('programStructure.durationWeeksLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={4}
                        max={52}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseInt(e.target.value) : undefined
                          )
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      {targetRaceDate
                        ? t('programStructure.durationWeeksFromRaceDateDescription')
                        : t('programStructure.durationWeeksDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxSessionDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('programStructure.maxSessionDurationLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={30}
                        max={300}
                        placeholder={t('programStructure.maxSessionDurationPlaceholder')}
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseInt(e.target.value) : undefined
                          )
                        }
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('programStructure.maxSessionDurationDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Granular Session Control */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">{t('programStructure.sessionsPerWeekTitle')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="runningSessionsPerWeek"
                  render={({ field }) => {
                    // Sport-specific label
                    const goalType = form.watch('goalType')
                    const sessionLabels: Record<string, string> = {
                      'cycling': t('programStructure.sessionLabels.cycling'),
                      'swimming': t('programStructure.sessionLabels.swimming'),
                      'skiing': t('programStructure.sessionLabels.skiing'),
                      'triathlon': t('programStructure.sessionLabels.triathlon'),
                      'hyrox': t('programStructure.sessionLabels.hyrox'),
                      'fitness': t('programStructure.sessionLabels.fitness'),
                      'marathon': t('programStructure.sessionLabels.marathon'),
                      'half-marathon': t('programStructure.sessionLabels.halfMarathon'),
                      '10k': t('programStructure.sessionLabels.tenK'),
                      '5k': t('programStructure.sessionLabels.fiveK'),
                      'custom': t('programStructure.sessionLabels.custom'),
                    }
                    const sessionLabel = sessionLabels[goalType] || t('programStructure.sessionLabels.default')

                    return (
                    <FormItem>
                      <FormLabel>{`${sessionLabel} ${t('programStructure.sessionsPerWeekSuffix')}`}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={14}
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value) : 4
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {t('programStructure.runningSessionsDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}}
                />

                <FormField
                  control={form.control}
                  name="strengthSessionsPerWeek"
                  render={({ field }) => (
                    <FormItem>
                    <FormLabel>{t('programStructure.strengthSessionsLabel')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={7}
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value) : 0
                            )
                          }
                        />
                      </FormControl>
                    <FormDescription>
                        {t('programStructure.strengthSessionsDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coreSessionsPerWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('programStructure.coreSessionsLabel')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={7}
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value) : 0
                            )
                          }
                        />
                      </FormControl>
                    <FormDescription>
                        {t('programStructure.coreSessionsDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="alternativeTrainingSessionsPerWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('programStructure.alternativeSessionsLabel')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={7}
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value) : 0
                            )
                          }
                        />
                      </FormControl>
                    <FormDescription>
                        {t('programStructure.alternativeSessionsDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Session Scheduling Options */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">{t('programStructure.schedulingTitle')}</h4>
              {(() => {
                const goalType = form.watch('goalType')
                const sessionLabelsLower: Record<string, string> = {
                  'cycling': t('programStructure.sessionLabelsLower.cycling'),
                  'swimming': t('programStructure.sessionLabelsLower.swimming'),
                  'skiing': t('programStructure.sessionLabelsLower.skiing'),
                  'triathlon': t('programStructure.sessionLabelsLower.triathlon'),
                  'hyrox': t('programStructure.sessionLabelsLower.hyrox'),
                  'fitness': t('programStructure.sessionLabelsLower.fitness'),
                  'marathon': t('programStructure.sessionLabelsLower.marathon'),
                  'half-marathon': t('programStructure.sessionLabelsLower.halfMarathon'),
                  '10k': t('programStructure.sessionLabelsLower.tenK'),
                  '5k': t('programStructure.sessionLabelsLower.fiveK'),
                  'custom': t('programStructure.sessionLabelsLower.custom'),
                }
                const mainSessionLabel = sessionLabelsLower[goalType] || t('programStructure.sessionLabelsLower.default')

                return (
                  <>
                      <Alert className="mb-4">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong>{t('alerts.schedulingRecommendationTitle')}:</strong> {t('alerts.schedulingRecommendationMessage', { sessionLabel: mainSessionLabel })}
                        </AlertDescription>
                      </Alert>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="scheduleStrengthAfterRunning"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                {t('programStructure.scheduleStrengthLabel', { sessionLabel: mainSessionLabel })}
                              </FormLabel>
                              <FormDescription>
                                {t('programStructure.scheduleStrengthDescription')}
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="scheduleCoreAfterRunning"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                {t('programStructure.scheduleCoreLabel', { sessionLabel: mainSessionLabel })}
                              </FormLabel>
                              <FormDescription>
                                {t('programStructure.scheduleCoreDescription')}
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Injury & Health */}
        <Card>
          <CardHeader>
            <CardTitle>{isCustomMode ? t('steps.injuryCustom') : t('steps.injury')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="hasRecentInjury"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t('injury.label')}
                    </FormLabel>
                    <FormDescription>
                      {t('injury.description')}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {form.watch('hasRecentInjury') && (
              <FormField
                control={form.control}
                name="injuryDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('injury.detailsLabel')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('injury.detailsPlaceholder')}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('injury.detailsDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>{isCustomMode ? t('steps.notesCustom') : t('steps.notes')}</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder={t('notes.placeholder')}
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            {t('actions.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isCustomMode ? t('actions.createEmptyProgram') : t('actions.generateProgram')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
