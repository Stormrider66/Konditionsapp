'use client'

/**
 * Sprint Test Form
 *
 * Supports multiple sprint distances:
 * - 5m, 10m, 20m, 30m, 40m
 * - Optional split times for detailed analysis
 * - Calculates acceleration, max velocity
 */

import { useState, useEffect } from 'react'
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
import { Timer, CheckCircle, AlertTriangle, TrendingUp, Gauge } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { CompactResult } from '@/components/tests/shared/TestResultDisplay'
import { TestBenchmarkBadge, type BenchmarkTier } from '@/components/tests/shared/TestBenchmarkBadge'
import {
  calculateAcceleration,
  calculateSpeed,
  classifySprintPerformance,
  sprintSpeedKmh,
  analyzeSprintSplits,
  type SprintSplit,
} from '@/lib/calculations/sport-tests/speed-tests'

const sprintDistances = [5, 10, 20, 30, 40] as const
type SprintDistance = (typeof sprintDistances)[number]

const sprintTestSchema = z.object({
  clientId: z.string().min(1, 'Välj en klient'),
  testDate: z.string().min(1, 'Välj testdatum'),
  distance: z.number().min(5).max(100),
  totalTime: z.number().min(0.5).max(15),
  hasSplits: z.boolean().optional(),
  split5m: z.number().min(0.5).max(3).optional(),
  split10m: z.number().min(0.8).max(4).optional(),
  split20m: z.number().min(2).max(6).optional(),
  split30m: z.number().min(3).max(8).optional(),
  startType: z.enum(['STANDING', 'THREE_POINT', 'BLOCK', 'FLYING']),
  surface: z.enum(['INDOOR', 'OUTDOOR_TRACK', 'GRASS', 'TURF']).optional(),
  attempts: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
})

type SprintTestFormData = z.infer<typeof sprintTestSchema>

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface SprintTestFormProps {
  clients: Client[]
  onTestSaved?: (test: any) => void
}

const distanceToProtocol: Record<SprintDistance, string> = {
  5: 'SPRINT_5M',
  10: 'SPRINT_10M',
  20: 'SPRINT_20M',
  30: 'SPRINT_30M',
  40: 'SPRINT_40M',
}

export function SprintTestForm({ clients, onTestSaved }: SprintTestFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<SprintTestFormData>({
    resolver: zodResolver(sprintTestSchema),
    defaultValues: {
      testDate: new Date().toISOString().split('T')[0],
      distance: 20,
      startType: 'STANDING',
      surface: 'INDOOR',
      hasSplits: false,
      attempts: 3,
    },
  })

  const selectedClient = clients.find((c) => c.id === form.watch('clientId'))
  const distance = form.watch('distance')
  const totalTime = form.watch('totalTime')
  const hasSplits = form.watch('hasSplits')

  // Live calculation preview
  const liveCalc =
    distance && totalTime
      ? {
          speed: calculateSpeed(distance, totalTime),
          speedKmh: sprintSpeedKmh(distance, totalTime),
          acceleration: calculateAcceleration(distance, totalTime),
          tier: selectedClient
            ? classifySprintPerformance(distance, totalTime, selectedClient.gender)
            : null,
        }
      : null

  async function handleSubmit(data: SprintTestFormData) {
    setSubmitting(true)
    setResult(null)
    setError(null)

    try {
      const client = clients.find((c) => c.id === data.clientId)
      if (!client) throw new Error('Klient hittades inte')

      // Build splits array if available
      const splits: SprintSplit[] = []
      if (data.hasSplits) {
        if (data.split5m) splits.push({ distance: 5, time: data.split5m })
        if (data.split10m) splits.push({ distance: 10, time: data.split10m })
        if (data.split20m) splits.push({ distance: 20, time: data.split20m })
        if (data.split30m) splits.push({ distance: 30, time: data.split30m })
      }
      splits.push({ distance: data.distance, time: data.totalTime })

      const sprintAnalysis = analyzeSprintSplits(splits)
      const tier = classifySprintPerformance(data.distance, data.totalTime, client.gender)

      // Determine protocol from distance
      const protocol =
        distanceToProtocol[data.distance as SprintDistance] ||
        `SPRINT_${data.distance}M`

      const response = await fetch('/api/sport-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: data.clientId,
          testDate: data.testDate,
          category: 'SPEED',
          protocol,
          sport: 'GENERAL_FITNESS',
          rawData: {
            totalTime: data.totalTime,
            distance: data.distance,
            startType: data.startType,
            surface: data.surface,
            attempts: data.attempts,
            splits: data.hasSplits ? splits : undefined,
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
        sprintAnalysis,
        client,
      })

      onTestSaved?.(resultData.data)
      form.reset({
        testDate: new Date().toISOString().split('T')[0],
        distance: 20,
        startType: 'STANDING',
        surface: 'INDOOR',
        hasSplits: false,
        attempts: 3,
      })
    } catch (err) {
      console.error('Failed to save sprint test:', err)
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Sprinttest
              </CardTitle>
              <CardDescription>
                Mät acceleration och maxhastighet över olika distanser
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
                  name="distance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distans (m)</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(parseInt(v))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="5">5 m</SelectItem>
                          <SelectItem value="10">10 m</SelectItem>
                          <SelectItem value="20">20 m</SelectItem>
                          <SelectItem value="30">30 m</SelectItem>
                          <SelectItem value="40">40 m</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tid (s)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.001"
                          min={0.5}
                          max={15}
                          placeholder="t.ex. 3.05"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Bästa tid av alla försök</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starttyp</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="STANDING">Stående start</SelectItem>
                          <SelectItem value="THREE_POINT">3-punktsstart</SelectItem>
                          <SelectItem value="BLOCK">Startblock</SelectItem>
                          <SelectItem value="FLYING">Flygande start</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="surface"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Underlag</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INDOOR">Inomhus</SelectItem>
                          <SelectItem value="OUTDOOR_TRACK">Löparbana</SelectItem>
                          <SelectItem value="GRASS">Gräs</SelectItem>
                          <SelectItem value="TURF">Konstgräs</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Split times toggle */}
              <FormField
                control={form.control}
                name="hasSplits"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Registrera deltider</FormLabel>
                      <FormDescription>
                        Lägg till mellantider för detaljerad analys
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Split time inputs */}
              {hasSplits && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  {distance >= 5 && (
                    <FormField
                      control={form.control}
                      name="split5m"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>5m tid</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.001"
                              placeholder="t.ex. 1.05"
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                  {distance >= 10 && (
                    <FormField
                      control={form.control}
                      name="split10m"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>10m tid</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.001"
                              placeholder="t.ex. 1.75"
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                  {distance >= 20 && (
                    <FormField
                      control={form.control}
                      name="split20m"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>20m tid</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.001"
                              placeholder="t.ex. 3.05"
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                  {distance >= 30 && (
                    <FormField
                      control={form.control}
                      name="split30m"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>30m tid</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.001"
                              placeholder="t.ex. 4.20"
                              {...field}
                              onChange={(e) =>
                                field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}

              {/* Live calculation preview */}
              {liveCalc && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Beräknade värden
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Hastighet</p>
                      <span className="text-xl font-bold text-primary">
                        {liveCalc.speedKmh}
                      </span>
                      <span className="text-sm text-muted-foreground ml-1">km/h</span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">m/s</p>
                      <span className="text-xl font-bold text-primary">{liveCalc.speed}</span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Acceleration</p>
                      <span className="text-xl font-bold text-primary">
                        {liveCalc.acceleration}
                      </span>
                      <span className="text-sm text-muted-foreground ml-1">m/s²</span>
                    </div>
                    {liveCalc.tier && (
                      <div className="flex items-center">
                        <TestBenchmarkBadge tier={liveCalc.tier} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="attempts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Antal försök</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anteckningar</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Teknik, väder, uppvärmning, observationer..."
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
            {submitting ? 'Sparar...' : 'Spara sprinttest'}
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
              {result.client?.name} - {result.rawData?.distance}m sprint -{' '}
              {new Date(result.testDate).toLocaleDateString('sv-SE')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <CompactResult
                label="Tid"
                value={result.primaryResult}
                unit="s"
                tier={result.tier}
              />
              <CompactResult
                label="Hastighet"
                value={sprintSpeedKmh(result.rawData?.distance, result.primaryResult)}
                unit="km/h"
              />
              <CompactResult
                label="m/s"
                value={result.sprintAnalysis?.averageSpeed || result.maxVelocity}
              />
              <CompactResult
                label="Acceleration"
                value={result.sprintAnalysis?.acceleration || result.acceleration}
                unit="m/s²"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
