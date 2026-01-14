'use client'

/**
 * HYROX Station Test Form
 *
 * Test individual HYROX stations:
 * - SkiErg (1000m)
 * - Sled Push (50m)
 * - Sled Pull (50m)
 * - Burpee Broad Jump (80m)
 * - Row (1000m)
 * - Farmers Carry (200m)
 * - Sandbag Lunge (100m)
 * - Wall Balls (100/75 reps)
 */

import { useState } from 'react'
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
import { Flame, CheckCircle, AlertTriangle, TrendingUp, Clock, Dumbbell } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { CompactResult } from '@/components/tests/shared/TestResultDisplay'
import { TestBenchmarkBadge, type BenchmarkTier } from '@/components/tests/shared/TestBenchmarkBadge'
import {
  classifyStationPerformance,
  getStationWeight,
  getWallBallReps,
  getStationDescription,
  formatStationTime,
  type HYROXStation,
  type HYROXCategory,
} from '@/lib/calculations/sport-tests/hyrox-tests'

const hyroxStationSchema = z.object({
  clientId: z.string().min(1, 'Välj en klient'),
  testDate: z.string().min(1, 'Välj testdatum'),
  station: z.enum([
    'SKIERG_1K',
    'SLED_PUSH',
    'SLED_PULL',
    'BURPEE_BROAD_JUMP',
    'ROW_1K',
    'FARMERS_CARRY',
    'SANDBAG_LUNGE',
    'WALL_BALLS',
  ]),
  timeMinutes: z.number().min(0).max(20),
  timeSeconds: z.number().min(0).max(59),
  category: z.enum(['OPEN', 'PRO']),
  notes: z.string().optional(),
})

type HYROXStationFormData = z.infer<typeof hyroxStationSchema>

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface HYROXStationTestFormProps {
  clients: Client[]
  onTestSaved?: (test: any) => void
}

const stationOptions: { value: HYROXStation; label: string; description: string; distance?: string }[] = [
  { value: 'SKIERG_1K', label: 'SkiErg', description: 'Skidmaskin', distance: '1000m' },
  { value: 'SLED_PUSH', label: 'Sled Push', description: 'Skjut släde', distance: '50m' },
  { value: 'SLED_PULL', label: 'Sled Pull', description: 'Dra släde med rep', distance: '50m' },
  { value: 'BURPEE_BROAD_JUMP', label: 'Burpee Broad Jump', description: 'Burpees med längdhopp', distance: '80m' },
  { value: 'ROW_1K', label: 'Row', description: 'Roddmaskin', distance: '1000m' },
  { value: 'FARMERS_CARRY', label: 'Farmers Carry', description: 'Bär vikter', distance: '200m' },
  { value: 'SANDBAG_LUNGE', label: 'Sandbag Lunge', description: 'Utfallssteg med sandsäck', distance: '100m' },
  { value: 'WALL_BALLS', label: 'Wall Balls', description: 'Kasta boll mot vägg' },
]

export function HYROXStationTestForm({ clients, onTestSaved }: HYROXStationTestFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<HYROXStationFormData>({
    resolver: zodResolver(hyroxStationSchema),
    defaultValues: {
      testDate: new Date().toISOString().split('T')[0],
      station: 'SKIERG_1K',
      category: 'OPEN',
      timeMinutes: 3,
      timeSeconds: 30,
    },
  })

  const selectedClient = clients.find((c) => c.id === form.watch('clientId'))
  const station = form.watch('station')
  const category = form.watch('category')
  const timeMinutes = form.watch('timeMinutes')
  const timeSeconds = form.watch('timeSeconds')

  const totalSeconds = (timeMinutes || 0) * 60 + (timeSeconds || 0)
  const division = selectedClient?.gender === 'FEMALE' ? 'WOMEN' : 'MEN'

  // Get station weight
  const stationWeight = station && category
    ? getStationWeight(station, division, category as 'OPEN' | 'PRO')
    : null

  // Get wall ball reps
  const wallBallReps = station === 'WALL_BALLS' ? getWallBallReps(division) : null

  // Live tier calculation
  const liveTier = station && totalSeconds > 0
    ? classifyStationPerformance(station, totalSeconds, division)
    : null

  const selectedStation = stationOptions.find((s) => s.value === station)

  async function handleSubmit(data: HYROXStationFormData) {
    setSubmitting(true)
    setResult(null)
    setError(null)

    try {
      const client = clients.find((c) => c.id === data.clientId)
      if (!client) throw new Error('Klient hittades inte')

      const div = client.gender === 'FEMALE' ? 'WOMEN' : 'MEN'
      const time = data.timeMinutes * 60 + data.timeSeconds
      const tier = classifyStationPerformance(data.station, time, div)
      const weight = getStationWeight(data.station, div, data.category as 'OPEN' | 'PRO')
      const reps = data.station === 'WALL_BALLS' ? getWallBallReps(div) : undefined

      const protocol = `HYROX_${data.station}`

      const response = await fetch('/api/sport-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: data.clientId,
          testDate: data.testDate,
          category: 'SPORT_SPECIFIC',
          protocol,
          sport: 'HYROX',
          rawData: {
            time,
            station: data.station,
            category: data.category,
            weight,
            reps,
          },
          notes: data.notes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Misslyckades att spara test')
      }

      const resultData = await response.json()

      setResult({
        ...resultData.data,
        tier,
        timeFormatted: formatStationTime(time),
        weight,
        reps,
        client,
        stationLabel: selectedStation?.label,
      })

      onTestSaved?.(resultData.data)
    } catch (err) {
      console.error('Failed to save HYROX station test:', err)
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
            <Flame className="h-5 w-5" />
            HYROX Stationstest
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Inga klienter hittades. Lägg till klienter för att kunna registrera test.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5" />
                HYROX Stationstest
              </CardTitle>
              <CardDescription>
                Testa individuella HYROX-stationer för att identifiera styrkor och svagheter
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                      <FormLabel>Testdatum</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="station"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Station</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stationOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <span>{option.label}</span>
                                {option.distance && (
                                  <span className="text-xs text-muted-foreground">
                                    ({option.distance})
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedStation && (
                        <FormDescription>{selectedStation.description}</FormDescription>
                      )}
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

              {/* Station weight/reps info */}
              {selectedClient && (stationWeight !== null || wallBallReps !== null) && (
                <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-4">
                  <Dumbbell className="h-5 w-5 text-muted-foreground" />
                  {stationWeight !== null && stationWeight > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground">Vikt: </span>
                      <span className="font-medium">{stationWeight} kg</span>
                      {station === 'FARMERS_CARRY' && (
                        <span className="text-xs text-muted-foreground ml-1">(per hand)</span>
                      )}
                    </div>
                  )}
                  {wallBallReps !== null && (
                    <div>
                      <span className="text-sm text-muted-foreground">Reps: </span>
                      <span className="font-medium">{wallBallReps}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Time input */}
              <div className="space-y-2">
                <FormLabel className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tid
                </FormLabel>
                <div className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name="timeMinutes"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={20}
                            placeholder="Min"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <span className="text-muted-foreground text-xl">:</span>
                  <FormField
                    control={form.control}
                    name="timeSeconds"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={59}
                            placeholder="Sek"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormDescription>Tid för att genomföra stationen (mm:ss)</FormDescription>
              </div>

              {/* Live calculation preview */}
              {liveTier && totalSeconds > 0 && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Resultat
                  </p>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Tid</p>
                      <span className="text-2xl font-bold text-primary">
                        {formatStationTime(totalSeconds)}
                      </span>
                    </div>
                    <TestBenchmarkBadge tier={liveTier} />
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anteckningar</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Teknik, känsla, strategi..."
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
            {submitting ? 'Sparar...' : 'Spara stationstest'}
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
              Test sparat
            </CardTitle>
            <CardDescription>
              {result.client?.name} - {result.stationLabel} ({result.rawData?.category}) -{' '}
              {new Date(result.testDate).toLocaleDateString('sv-SE')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <CompactResult
                label="Tid"
                value={result.timeFormatted}
                tier={result.tier}
              />
              {result.weight > 0 && (
                <CompactResult label="Vikt" value={result.weight} unit="kg" />
              )}
              {result.reps && (
                <CompactResult label="Reps" value={result.reps} />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
