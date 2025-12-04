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
import { CalendarIcon, Loader2, ChevronDown, ChevronUp, Info } from 'lucide-react'
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
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  yearsRunning: z.coerce.number().min(0).max(50).optional(),
  currentWeeklyVolume: z.coerce.number().min(0).max(300).optional(),
  longestLongRun: z.coerce.number().min(0).max(100).optional(),

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

  // Equipment & Monitoring
  hasLactateMeter: z.boolean().optional(),
  hasHRVMonitor: z.boolean().optional(),
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

interface ConfigurationFormProps {
  sport: SportType
  goal: string
  dataSource: DataSourceType
  clients: Client[]
  selectedClientId?: string
  onSubmit: (data: ConfigFormData) => Promise<void>
  isSubmitting: boolean
}

export function ConfigurationForm({
  sport,
  goal,
  dataSource,
  clients,
  selectedClientId,
  onSubmit,
  isSubmitting,
}: ConfigurationFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false)

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
      yearsRunning: undefined,
      currentWeeklyVolume: undefined,
      longestLongRun: undefined,
      recentRaceDistance: 'NONE',
      recentRaceTime: '',
      targetTime: '',
      coreSessionsPerWeek: 0,
      alternativeTrainingSessionsPerWeek: 0,
      scheduleStrengthAfterRunning: false,
      scheduleCoreAfterRunning: false,
      hasLactateMeter: false,
      hasHRVMonitor: false,
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

  // Check if sport needs running-specific fields
  const needsRunningFields = sport === 'RUNNING' || sport === 'HYROX' || sport === 'TRIATHLON'
  const needsPowerMeter = sport === 'CYCLING' || sport === 'TRIATHLON'
  const isHyrox = sport === 'HYROX'

  // HYROX-specific state
  const [stationTimesOpen, setStationTimesOpen] = useState(false)
  const [strengthPRsOpen, setStrengthPRsOpen] = useState(false)

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

  const handleSubmit = form.handleSubmit(onSubmit)

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
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Experience Level (Running/HYROX/Triathlon) */}
          {needsRunningFields && (
            <FormField
              control={form.control}
              name="experienceLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Erfarenhetsnivå</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj nivå" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="beginner">Nybörjare</SelectItem>
                      <SelectItem value="intermediate">Mellanliggande</SelectItem>
                      <SelectItem value="advanced">Avancerad</SelectItem>
                    </SelectContent>
                  </Select>
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
                )}
              </div>
            </div>
          </div>
        )}

        {/* Advanced Settings (Collapsible) */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between mt-6">
              Avancerade inställningar
              {advancedOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="border rounded-lg p-4 mt-2 space-y-6">
            {/* Running-specific advanced fields */}
            {needsRunningFields && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="yearsRunning"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>År av löpning</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="t.ex. 5"
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const val = e.target.value
                              field.onChange(val === '' ? undefined : parseInt(val))
                            }}
                          />
                        </FormControl>
                        <FormDescription>Antal år med regelbunden löpträning</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="longestLongRun"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Längsta långpass (km)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="t.ex. 25"
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const val = e.target.value
                              field.onChange(val === '' ? undefined : parseInt(val))
                            }}
                          />
                        </FormControl>
                        <FormDescription>Längsta distans på ett långpass senaste 6 mån</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Alternative Training */}
            <FormField
              control={form.control}
              name="alternativeTrainingSessionsPerWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alternativ träning per vecka</FormLabel>
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
                  <FormDescription>Cykling, simning, etc. för aktiv återhämtning</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Scheduling Options */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Schemaläggning</h4>
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
                      <FormLabel>Schemalägg styrka efter löpning</FormLabel>
                      <FormDescription>
                        Styrkepass placeras efter löppass samma dag
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
                      <FormLabel>Schemalägg core efter löpning</FormLabel>
                      <FormDescription>
                        Core-pass placeras efter löppass samma dag
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Equipment & Monitoring */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Utrustning & Övervakning</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          Möjliggör Norwegian-metoden
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
                        <FormLabel>Har HRV-övervakning</FormLabel>
                        <FormDescription>
                          Mäter daglig återhämtning
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Power Meter (Cycling/Triathlon only) */}
                {needsPowerMeter && (
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
                            Aktiverar wattbaserad träning
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

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

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
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
