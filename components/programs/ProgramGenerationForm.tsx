// components/programs/ProgramGenerationForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

const formSchema = z.object({
  clientId: z.string().min(1, 'Välj en klient'),
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

type FormData = z.infer<typeof formSchema>

interface ProgramGenerationFormProps {
  clients: any[]
}

// Helper function to recommend methodology based on athlete profile
function recommendMethodology(data: Partial<FormData>): string {
  const { yearsRunning, currentWeeklyVolume, hasLactateMeter, hasHRVMonitor, goalType } = data

  // Norwegian Method - Elite athletes with equipment
  if (
    yearsRunning && yearsRunning >= 2 &&
    currentWeeklyVolume && currentWeeklyVolume >= 60 &&
    hasLactateMeter &&
    hasHRVMonitor
  ) {
    return 'NORWEGIAN - Du uppfyller kraven för Norska metoden (dubbel tröskelträning)'
  }

  // Canova - Marathon specialists
  if (goalType === 'marathon' && yearsRunning && yearsRunning >= 3) {
    return 'CANOVA - Rekommenderas för erfarna maratonlöpare'
  }

  // Polarized - Advanced athletes
  if (
    yearsRunning && yearsRunning >= 2 &&
    currentWeeklyVolume && currentWeeklyVolume >= 40
  ) {
    return 'POLARIZED - 80/20-metoden passar din erfarenhetsnivå'
  }

  // Pyramidal - Intermediate athletes
  if (yearsRunning && yearsRunning >= 1) {
    return 'PYRAMIDAL - Balanserad intensitetsfördelning för medelerfarna'
  }

  // Lydiard - Beginners
  return 'LYDIARD - Grundläggande uppbyggnad med fokus på aerob bas'
}

export function ProgramGenerationForm({ clients }: ProgramGenerationFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [methodologyRecommendation, setMethodologyRecommendation] = useState<string>('')

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
    const recommendation = recommendMethodology(form.getValues())
    setMethodologyRecommendation(recommendation)
  }, [form, watchedFields])

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
        throw new Error(result.error || 'Misslyckades med att skapa program')
      }

      toast({
        title: 'Program skapat!',
        description: 'Träningsprogrammet har genererats och är klart att användas.',
      })

      // Redirect to the new program
      // Use setTimeout to prevent NEXT_REDIRECT error from showing in console
      setTimeout(() => {
        router.push(`/coach/programs/${result.data.id}`)
      }, 100)
    } catch (error: any) {
      // Filter out NEXT_REDIRECT errors (internal Next.js redirect mechanism)
      if (error.message && error.message.includes('NEXT_REDIRECT')) {
        // This is not a real error, just Next.js handling the redirect
        return
      }

      console.error('Error generating program:', error)
      toast({
        title: 'Något gick fel',
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
            <CardTitle>Programtyp</CardTitle>
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
                    <h3 className="font-semibold">Testbaserat program</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Generera program baserat på konditionstest med träningszoner
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
                    <h3 className="font-semibold">Anpassat program</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Skapa tomt program och bygg pass manuellt - inget test krävs
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
            <CardTitle>1. Välj klient {!isCustomMode && 'och test'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Klient *</FormLabel>
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
                        <SelectValue placeholder="Välj klient" />
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
                    <FormLabel>Konditionstest *</FormLabel>
                    {selectedClient.tests && selectedClient.tests.length > 0 ? (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj test" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedClient.tests.map((test: any) => (
                            <SelectItem key={test.id} value={test.id}>
                              {format(new Date(test.testDate), 'PPP', { locale: sv })} -{' '}
                              {test.testType}
                              {test.vo2max && ` (VO2max: ${test.vo2max.toFixed(1)})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/30">
                        Ingen test tillgänglig. Välj &quot;Custom&quot; metodik för att skapa program utan test.
                      </div>
                    )}
                    <FormDescription>
                      Välj det test som programmet ska baseras på
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
                  <strong>Custom-läge:</strong> Du skapar ett tomt program utan testdata.
                  Lägg till pass manuellt efter att programmet skapats.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Goal Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>2. Målsättning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="goalType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Typ av mål *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="marathon">Marathon (42.2 km)</SelectItem>
                      <SelectItem value="half-marathon">Halvmaraton (21.1 km)</SelectItem>
                      <SelectItem value="10k">10K</SelectItem>
                      <SelectItem value="5k">5K</SelectItem>
                      <SelectItem value="fitness">Allmän fitness</SelectItem>
                      <SelectItem value="cycling">Cykling</SelectItem>
                      <SelectItem value="skiing">Skidåkning</SelectItem>
                      <SelectItem value="swimming">Simning</SelectItem>
                      <SelectItem value="triathlon">Triathlon</SelectItem>
                      <SelectItem value="hyrox">HYROX</SelectItem>
                      <SelectItem value="custom">Anpassad</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* General Fitness Goal Configuration */}
            {form.watch('goalType') === 'fitness' && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium">Fitness-mål</h4>

                <FormField
                  control={form.control}
                  name="fitnessGoal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primärt mål *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj ditt huvudmål" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="weight_loss">Viktminskning</SelectItem>
                          <SelectItem value="general_health">Allmän hälsa</SelectItem>
                          <SelectItem value="strength">Styrka</SelectItem>
                          <SelectItem value="endurance">Uthållighet</SelectItem>
                          <SelectItem value="flexibility">Rörlighet</SelectItem>
                          <SelectItem value="stress_relief">Stresshantering</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Programmet anpassas efter ditt huvudmål
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
                      <FormLabel>Nuvarande aktivitetsnivå *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj din nivå" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sedentary">Stillasittande (tränar sällan)</SelectItem>
                          <SelectItem value="lightly_active">Lätt aktiv (1-2 pass/vecka)</SelectItem>
                          <SelectItem value="moderately_active">Måttligt aktiv (3-4 pass/vecka)</SelectItem>
                          <SelectItem value="very_active">Mycket aktiv (5-6 pass/vecka)</SelectItem>
                          <SelectItem value="athlete">Idrottare (daglig träning)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Påverkar intensitet och volym i programmet
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
                        <FormLabel>Tillgång till gym</FormLabel>
                        <FormDescription>
                          Möjliggör styrkeövningar med utrustning
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
                  <FormLabel>Tävlingsdatum (valfritt)</FormLabel>
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
                        disabled={(date) =>
                          date < new Date() || date < new Date('1900-01-01')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Programlängden beräknas automatiskt från tävlingsdatum
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
              <CardTitle>3. Tidsmål (valfritt)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="targetTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Måltid för tävling</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="t.ex. 3:30:00 för marathon"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Format: HH:MM:SS (t.ex. 3:30:00)
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
            <CardTitle>4. Löparprofil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="yearsRunning"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>År av regelbunden träning</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        placeholder="t.ex. 3"
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
                      Används för metodval och volymuppbyggnad
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
                    <FormLabel>Nuvarande veckvolym (km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="t.ex. 40"
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
                      Genomsnittlig veckvolym senaste 4 veckorna
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
                    <FormLabel>Längsta långa passet (km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        placeholder="t.ex. 18"
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
                      Senaste 3 månaderna
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Recent Race */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Senaste tävlingsresultat (valfritt)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="recentRaceDistance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distans</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NONE">Inget nyligt lopp</SelectItem>
                          <SelectItem value="5K">5K</SelectItem>
                          <SelectItem value="10K">10K</SelectItem>
                          <SelectItem value="HALF">Halvmaraton</SelectItem>
                          <SelectItem value="MARATHON">Marathon</SelectItem>
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
                      <FormLabel>Tid</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="t.ex. 0:45:30 för 10K"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Format: HH:MM:SS (används för VDOT-beräkning)
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
            <CardTitle>5. Utrustning & Monitorering</CardTitle>
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
                      Laktatmätare tillgänglig
                    </FormLabel>
                    <FormDescription>
                      Krävs för Norska metoden (dubbel tröskelträning)
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
                      HRV-monitor tillgänglig
                    </FormLabel>
                    <FormDescription>
                      Möjliggör daglig readiness-bedömning
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
                      Effektmätare (för cykling)
                    </FormLabel>
                    <FormDescription>
                      För cykelspecifika program
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
            <CardTitle>6. Träningsmetodik</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {methodologyRecommendation && (
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  <strong>Rekommendation:</strong> {methodologyRecommendation}
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="methodology"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Välj träningsmetodik *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="AUTO">
                        <div>
                          <div className="font-medium">Automatiskt val</div>
                          <div className="text-sm text-muted-foreground">
                            Systemet väljer bästa metod baserat på profil
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="POLARIZED">
                        <div>
                          <div className="font-medium">Polarized (80/20)</div>
                          <div className="text-sm text-muted-foreground">
                            80% lätt, 20% hårt - för avancerade löpare
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="NORWEGIAN">
                        <div>
                          <div className="font-medium">Norwegian (Doubles)</div>
                          <div className="text-sm text-muted-foreground">
                            Dubbel tröskel + dubbelpass - för elitlöpare
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="NORWEGIAN_SINGLE">
                        <div>
                          <div className="font-medium">Norwegian (Single)</div>
                          <div className="text-sm text-muted-foreground">
                            Dubbel tröskel utan dubbelpass - för avancerade
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="CANOVA">
                        <div>
                          <div className="font-medium">Canova</div>
                          <div className="text-sm text-muted-foreground">
                            Mixad intensitet - för maratonspecialister
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="PYRAMIDAL">
                        <div>
                          <div className="font-medium">Pyramidal</div>
                          <div className="text-sm text-muted-foreground">
                            Balanserad fördelning - för medelerfarna
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="LYDIARD">
                        <div>
                          <div className="font-medium">Lydiard</div>
                          <div className="text-sm text-muted-foreground">
                            Grundläggande uppbyggnad - aerob bas
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="CUSTOM">
                        <div>
                          <div className="font-medium">Custom (Bygg från grunden)</div>
                          <div className="text-sm text-muted-foreground">
                            Skapa ett tomt program och bygg passnivå för passnivå
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Metodiken styr intensitetsfördelning och träningsupplägg
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
                  <strong>Custom Program Builder:</strong> Du kommer att skapa ett tomt program med bara datum och veckor.
                  Efter att programmet har skapats kan du använda kalendervyn för att lägga till löppass, styrkepass,
                  core-pass och alternativa träningspass på varje dag.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
        )}

        {/* Program Structure */}
        <Card>
          <CardHeader>
            <CardTitle>{isCustomMode ? '2' : '7'}. Programstruktur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseInt(e.target.value) : undefined
                          )
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      {targetRaceDate
                        ? '✓ Beräknat automatiskt från tävlingsdatum'
                        : '4-52 veckor'}
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
                    <FormLabel>Max tid per pass (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={30}
                        max={300}
                        placeholder="t.ex. 120"
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
                      Begränsar långa pass baserat på tillgänglig tid
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Granular Session Control */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">Antal pass per vecka</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="runningSessionsPerWeek"
                  render={({ field }) => {
                    // Sport-specific label
                    const goalType = form.watch('goalType')
                    const sessionLabels: Record<string, string> = {
                      'cycling': 'Cykelpass',
                      'swimming': 'Simpass',
                      'skiing': 'Skidpass',
                      'triathlon': 'Huvudpass',
                      'hyrox': 'HYROX-pass',
                      'fitness': 'Konditionspass',
                      'marathon': 'Löppass',
                      'half-marathon': 'Löppass',
                      '10k': 'Löppass',
                      '5k': 'Löppass',
                      'custom': 'Huvudpass',
                    }
                    const sessionLabel = sessionLabels[goalType] || 'Löppass'

                    return (
                    <FormItem>
                      <FormLabel>{sessionLabel} per vecka *</FormLabel>
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
                        1-14 (kan inkludera dubbelpass)
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
                      <FormLabel>Styrkepass per vecka</FormLabel>
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
                        0-7 styrketräningspass
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
                      <FormLabel>Core-pass per vecka</FormLabel>
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
                        0-7 core-träningspass
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
                      <FormLabel>Alternativträning per vecka</FormLabel>
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
                        0-7 (cykel, simning, DWR, etc.)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Session Scheduling Options */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">Schemaläggning av pass</h4>
              {(() => {
                const goalType = form.watch('goalType')
                const sessionLabelsLower: Record<string, string> = {
                  'cycling': 'cykelpass',
                  'swimming': 'simpass',
                  'skiing': 'skidpass',
                  'triathlon': 'huvudpass',
                  'hyrox': 'HYROX-pass',
                  'fitness': 'konditionspass',
                  'marathon': 'löppass',
                  'half-marathon': 'löppass',
                  '10k': 'löppass',
                  '5k': 'löppass',
                  'custom': 'huvudpass',
                }
                const mainSessionLabel = sessionLabelsLower[goalType] || 'löppass'

                return (
                  <>
                    <Alert className="mb-4">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Rekommendation:</strong> Schemalägg styrka och core direkt efter {mainSessionLabel} för att optimera återhämtning och spara tid.
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
                                Lägg styrkepass direkt efter {mainSessionLabel}
                              </FormLabel>
                              <FormDescription>
                                Samma dag PM-session (rekommenderas för tidseffektivitet)
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
                                Lägg core-pass direkt efter {mainSessionLabel}
                              </FormLabel>
                              <FormDescription>
                                Samma dag PM-session (effektivt för core-aktivering)
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
            <CardTitle>{isCustomMode ? '3' : '8'}. Skador & Hälsa</CardTitle>
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
                      Nylig skada eller besvär
                    </FormLabel>
                    <FormDescription>
                      Program anpassas för säker återgång till träning
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
                    <FormLabel>Beskriv skadan</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="T.ex. Plantar fasciit, smärta under foten..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Hjälper systemet välja lämplig volym och intensitet
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
            <CardTitle>{isCustomMode ? '4' : '9'}. Anteckningar (valfritt)</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Lägg till eventuella anteckningar om programmet, speciella hänsyn, eller mål..."
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
            Avbryt
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isCustomMode ? 'Skapa tomt program' : 'Generera program'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
