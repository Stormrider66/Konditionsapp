'use client'

/**
 * HYROX Race Simulation Form
 *
 * Estimate total HYROX race time from:
 * - Individual station times
 * - Running pace
 * - Roxzone transition times
 *
 * Provides:
 * - Total race time estimation
 * - Performance tier classification
 * - Weak/strong station identification
 * - Breakdown of time distribution
 */

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Flame,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  Timer,
  Footprints,
  ArrowRight,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { TestBenchmarkBadge, type BenchmarkTier } from '@/components/tests/shared/TestBenchmarkBadge'
import {
  estimateRaceTime,
  classifyStationPerformance,
  getStationWeight,
  getWallBallReps,
  formatStationTime,
  type HYROXStation,
  type HYROXCategory,
} from '@/lib/calculations/sport-tests/hyrox-tests'

const stationTimeSchema = z.object({
  minutes: z.number().min(0).max(20).optional(),
  seconds: z.number().min(0).max(59).optional(),
})

const raceSimulationSchema = z.object({
  clientId: z.string().min(1, 'Välj en klient'),
  testDate: z.string().min(1, 'Välj testdatum'),
  category: z.enum(['OPEN', 'PRO']),
  // Station times
  skierg: stationTimeSchema,
  sledPush: stationTimeSchema,
  sledPull: stationTimeSchema,
  burpeeBroadJump: stationTimeSchema,
  row: stationTimeSchema,
  farmersCarry: stationTimeSchema,
  sandbagLunge: stationTimeSchema,
  wallBalls: stationTimeSchema,
  // Running
  runPaceMinutes: z.number().min(3).max(10),
  runPaceSeconds: z.number().min(0).max(59),
  // Roxzone
  roxzoneTime: z.number().min(15).max(120),
  notes: z.string().optional(),
})

type RaceSimulationFormData = z.infer<typeof raceSimulationSchema>

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface HYROXRaceSimulationFormProps {
  clients: Client[]
  onTestSaved?: (test: any) => void
}

const STATIONS: { key: keyof RaceSimulationFormData; station: HYROXStation; label: string; distance?: string }[] = [
  { key: 'skierg', station: 'SKIERG_1K', label: 'SkiErg', distance: '1000m' },
  { key: 'sledPush', station: 'SLED_PUSH', label: 'Sled Push', distance: '50m' },
  { key: 'sledPull', station: 'SLED_PULL', label: 'Sled Pull', distance: '50m' },
  { key: 'burpeeBroadJump', station: 'BURPEE_BROAD_JUMP', label: 'Burpee Broad Jump', distance: '80m' },
  { key: 'row', station: 'ROW_1K', label: 'Rowing', distance: '1000m' },
  { key: 'farmersCarry', station: 'FARMERS_CARRY', label: 'Farmers Carry', distance: '200m' },
  { key: 'sandbagLunge', station: 'SANDBAG_LUNGE', label: 'Sandbag Lunge', distance: '100m' },
  { key: 'wallBalls', station: 'WALL_BALLS', label: 'Wall Balls' },
]

const TIER_COLORS: Record<string, string> = {
  WORLD_CLASS: 'bg-purple-500',
  ELITE: 'bg-blue-500',
  ADVANCED: 'bg-green-500',
  INTERMEDIATE: 'bg-yellow-500',
  BEGINNER: 'bg-gray-500',
}

const TIER_LABELS: Record<string, string> = {
  WORLD_CLASS: 'Världsklass',
  ELITE: 'Elit',
  ADVANCED: 'Avancerad',
  INTERMEDIATE: 'Medel',
  BEGINNER: 'Nybörjare',
}

export function HYROXRaceSimulationForm({ clients, onTestSaved }: HYROXRaceSimulationFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<RaceSimulationFormData>({
    resolver: zodResolver(raceSimulationSchema),
    defaultValues: {
      testDate: new Date().toISOString().split('T')[0],
      category: 'OPEN',
      skierg: { minutes: 3, seconds: 30 },
      sledPush: { minutes: 2, seconds: 0 },
      sledPull: { minutes: 2, seconds: 0 },
      burpeeBroadJump: { minutes: 6, seconds: 0 },
      row: { minutes: 3, seconds: 30 },
      farmersCarry: { minutes: 3, seconds: 0 },
      sandbagLunge: { minutes: 5, seconds: 0 },
      wallBalls: { minutes: 5, seconds: 0 },
      runPaceMinutes: 5,
      runPaceSeconds: 0,
      roxzoneTime: 30,
    },
  })

  const selectedClient = clients.find((c) => c.id === form.watch('clientId'))
  const category = form.watch('category')
  const division = selectedClient?.gender === 'FEMALE' ? 'WOMEN' : 'MEN'

  // Calculate station times from form values
  const getStationTimeInSeconds = (key: keyof RaceSimulationFormData): number => {
    const value = form.watch(key) as { minutes?: number; seconds?: number } | undefined
    if (!value) return 0
    return ((value.minutes || 0) * 60) + (value.seconds || 0)
  }

  // Live race estimate calculation
  const liveEstimate = useMemo(() => {
    if (!selectedClient) return null

    const stationTimes: Partial<Record<HYROXStation, number>> = {}
    let hasAnyStation = false

    for (const { key, station } of STATIONS) {
      const time = getStationTimeInSeconds(key)
      if (time > 0) {
        stationTimes[station] = time
        hasAnyStation = true
      }
    }

    if (!hasAnyStation) return null

    const runPaceMinutes = form.watch('runPaceMinutes') || 5
    const runPaceSeconds = form.watch('runPaceSeconds') || 0
    const runPacePerKm = runPaceMinutes * 60 + runPaceSeconds
    const roxzoneTime = form.watch('roxzoneTime') || 30

    return estimateRaceTime(
      stationTimes,
      runPacePerKm,
      roxzoneTime,
      division as 'MEN' | 'WOMEN',
      category as HYROXCategory
    )
  }, [
    selectedClient,
    division,
    category,
    form.watch('skierg'),
    form.watch('sledPush'),
    form.watch('sledPull'),
    form.watch('burpeeBroadJump'),
    form.watch('row'),
    form.watch('farmersCarry'),
    form.watch('sandbagLunge'),
    form.watch('wallBalls'),
    form.watch('runPaceMinutes'),
    form.watch('runPaceSeconds'),
    form.watch('roxzoneTime'),
  ])

  // Get station tier for display
  const getStationTier = (station: HYROXStation, timeSeconds: number): BenchmarkTier | null => {
    if (timeSeconds <= 0) return null
    return classifyStationPerformance(station, timeSeconds, division as 'MEN' | 'WOMEN')
  }

  async function handleSubmit(data: RaceSimulationFormData) {
    setSubmitting(true)
    setResult(null)
    setError(null)

    try {
      const client = clients.find((c) => c.id === data.clientId)
      if (!client) throw new Error('Klient hittades inte')

      const div = client.gender === 'FEMALE' ? 'WOMEN' : 'MEN'

      // Build station times
      const stationTimes: Partial<Record<HYROXStation, number>> = {}
      for (const { key, station } of STATIONS) {
        const value = data[key] as { minutes?: number; seconds?: number }
        const time = ((value?.minutes || 0) * 60) + (value?.seconds || 0)
        if (time > 0) {
          stationTimes[station] = time
        }
      }

      const runPacePerKm = (data.runPaceMinutes * 60) + data.runPaceSeconds
      const raceEstimate = estimateRaceTime(
        stationTimes,
        runPacePerKm,
        data.roxzoneTime,
        div as 'MEN' | 'WOMEN',
        data.category as HYROXCategory
      )

      // Save race simulation
      const response = await fetch('/api/sport-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: data.clientId,
          testDate: data.testDate,
          category: 'SPORT_SPECIFIC',
          protocol: 'HYROX_RACE_SIMULATION',
          sport: 'HYROX',
          rawData: {
            stationTimes,
            runPacePerKm,
            roxzoneTime: data.roxzoneTime,
            category: data.category,
            estimate: raceEstimate,
          },
          notes: data.notes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Misslyckades att spara simulering')
      }

      const resultData = await response.json()

      setResult({
        ...resultData.data,
        estimate: raceEstimate,
        client,
      })

      onTestSaved?.(resultData.data)
    } catch (err) {
      console.error('Failed to save race simulation:', err)
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
    } finally {
      setSubmitting(false)
    }
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            HYROX Race Simulering
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Inga klienter hittades. Lägg till klienter för att kunna genomföra simulering.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                HYROX Race Simulering
              </CardTitle>
              <CardDescription>
                Uppskatta din totala racetid baserat på stationstider och löptempo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Klient</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj klient" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="testDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Datum</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="OPEN">Open (lättare vikter)</SelectItem>
                          <SelectItem value="PRO">Pro (tyngre vikter)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Station Times */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Stationstider
              </CardTitle>
              <CardDescription>
                Ange din tid för varje station (mm:ss)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {STATIONS.map(({ key, station, label, distance }) => {
                  const timeSeconds = getStationTimeInSeconds(key)
                  const tier = getStationTier(station, timeSeconds)
                  const weight = selectedClient ? getStationWeight(station, division as 'MEN' | 'WOMEN', category as 'OPEN' | 'PRO') : null

                  return (
                    <div key={key} className="space-y-2 p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{label}</span>
                        {distance && (
                          <Badge variant="outline" className="text-xs">
                            {distance}
                          </Badge>
                        )}
                      </div>

                      {weight !== null && weight > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Vikt: {weight} kg{station === 'FARMERS_CARRY' ? ' per hand' : ''}
                        </p>
                      )}

                      {station === 'WALL_BALLS' && selectedClient && (
                        <p className="text-xs text-muted-foreground">
                          Reps: {getWallBallReps(division as 'MEN' | 'WOMEN')}
                        </p>
                      )}

                      <div className="flex items-center gap-1">
                        <FormField
                          control={form.control}
                          name={`${key}.minutes` as any}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  max={20}
                                  placeholder="min"
                                  className="text-center"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <span className="text-muted-foreground">:</span>
                        <FormField
                          control={form.control}
                          name={`${key}.seconds` as any}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  max={59}
                                  placeholder="sek"
                                  className="text-center"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      {tier && (
                        <div className="flex justify-end">
                          <TestBenchmarkBadge tier={tier} size="sm" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Running & Transitions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Footprints className="h-5 w-5" />
                Löpning & Övergångar
              </CardTitle>
              <CardDescription>
                8 x 1 km löpning mellan stationerna
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Run Pace */}
                <div className="space-y-2">
                  <FormLabel className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Löptempo (per km)
                  </FormLabel>
                  <div className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name="runPaceMinutes"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              type="number"
                              min={3}
                              max={10}
                              placeholder="min"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <span className="text-xl text-muted-foreground">:</span>
                    <FormField
                      control={form.control}
                      name="runPaceSeconds"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={59}
                              placeholder="sek"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <span className="text-sm text-muted-foreground">/km</span>
                  </div>
                  <FormDescription>
                    Total löptid: {formatStationTime(((form.watch('runPaceMinutes') || 5) * 60 + (form.watch('runPaceSeconds') || 0)) * 8)}
                  </FormDescription>
                </div>

                {/* Roxzone Time */}
                <FormField
                  control={form.control}
                  name="roxzoneTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4" />
                        Roxzone tid (per station)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={15}
                          max={120}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                        />
                      </FormControl>
                      <FormDescription>
                        Total Roxzone-tid: {formatStationTime((field.value || 30) * 8)} (8 övergångar)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Live Estimate */}
          {liveEstimate && (
            <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                  <Clock className="h-5 w-5" />
                  Uppskattad racetid
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Total Time */}
                <div className="text-center">
                  <p className="text-4xl font-bold text-orange-600">
                    {liveEstimate.totalTimeFormatted}
                  </p>
                  <div className="mt-2">
                    <Badge className={`${TIER_COLORS[liveEstimate.tier]} text-white`}>
                      {TIER_LABELS[liveEstimate.tier]}
                    </Badge>
                  </div>
                </div>

                {/* Time Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Stationer</span>
                    <span className="font-mono">{formatStationTime(liveEstimate.stationTime)}</span>
                  </div>
                  <Progress value={(liveEstimate.stationTime / liveEstimate.totalTime) * 100} className="h-2" />

                  <div className="flex justify-between text-sm">
                    <span>Löpning (8 km)</span>
                    <span className="font-mono">{formatStationTime(liveEstimate.runningTime)}</span>
                  </div>
                  <Progress value={(liveEstimate.runningTime / liveEstimate.totalTime) * 100} className="h-2" />

                  <div className="flex justify-between text-sm">
                    <span>Roxzone</span>
                    <span className="font-mono">{formatStationTime(liveEstimate.roxzoneTime)}</span>
                  </div>
                  <Progress value={(liveEstimate.roxzoneTime / liveEstimate.totalTime) * 100} className="h-2" />
                </div>

                {/* Weak/Strong Stations */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300 mb-1">
                      <TrendingDown className="h-4 w-4" />
                      <span className="text-sm font-medium">Svagaste station</span>
                    </div>
                    <p className="font-bold">
                      {STATIONS.find(s => s.station === liveEstimate.weakestStation)?.label}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm font-medium">Starkaste station</span>
                    </div>
                    <p className="font-bold">
                      {STATIONS.find(s => s.station === liveEstimate.strongestStation)?.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anteckningar</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Strategi, mål, observationer..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Sparar...' : 'Spara simulering'}
          </Button>
        </form>
      </Form>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="h-5 w-5" />
              Simulering sparad
            </CardTitle>
            <CardDescription>
              {result.client?.name} - HYROX {result.rawData?.category} -{' '}
              {new Date(result.testDate).toLocaleDateString('sv-SE')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {result.estimate?.totalTimeFormatted}
              </p>
              <Badge className={`${TIER_COLORS[result.estimate?.tier]} text-white mt-2`}>
                {TIER_LABELS[result.estimate?.tier]}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
