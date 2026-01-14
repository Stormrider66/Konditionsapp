'use client'

/**
 * Repeated Sprint Ability (RSA) Test Form
 *
 * Standard RSA test: 6x30m with 25s recovery
 * Measures fatigue resistance and sprint endurance
 */

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
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
import { Repeat, CheckCircle, AlertTriangle, TrendingUp, Plus, Trash2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { CompactResult } from '@/components/tests/shared/TestResultDisplay'
import { TestBenchmarkBadge, type BenchmarkTier } from '@/components/tests/shared/TestBenchmarkBadge'
import { analyzeRSA, sprintSpeedKmh } from '@/lib/calculations/sport-tests/speed-tests'

const rsaTestSchema = z.object({
  clientId: z.string().min(1, 'Välj en klient'),
  testDate: z.string().min(1, 'Välj testdatum'),
  sprintDistance: z.number().min(20).max(40),
  restTime: z.number().min(15).max(60),
  sprintTimes: z
    .array(
      z.object({
        time: z.number().min(2).max(10),
      })
    )
    .min(3, 'Minst 3 sprinter krävs')
    .max(10, 'Max 10 sprinter'),
  surface: z.enum(['INDOOR', 'OUTDOOR_TRACK', 'GRASS', 'TURF']).optional(),
  notes: z.string().optional(),
})

type RSATestFormData = z.infer<typeof rsaTestSchema>

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface RSATestFormProps {
  clients: Client[]
  onTestSaved?: (test: any) => void
}

function classifyRSA(
  fatigueIndex: number,
  gender: 'MALE' | 'FEMALE'
): BenchmarkTier {
  // Lower fatigue index = better performance
  const thresholds = gender === 'MALE'
    ? { elite: 3, advanced: 5, intermediate: 8 }
    : { elite: 4, advanced: 6, intermediate: 9 }

  if (fatigueIndex <= thresholds.elite) return 'ELITE'
  if (fatigueIndex <= thresholds.advanced) return 'ADVANCED'
  if (fatigueIndex <= thresholds.intermediate) return 'INTERMEDIATE'
  return 'BEGINNER'
}

export function RSATestForm({ clients, onTestSaved }: RSATestFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<RSATestFormData>({
    resolver: zodResolver(rsaTestSchema),
    defaultValues: {
      testDate: new Date().toISOString().split('T')[0],
      sprintDistance: 30,
      restTime: 25,
      sprintTimes: [
        { time: 0 },
        { time: 0 },
        { time: 0 },
        { time: 0 },
        { time: 0 },
        { time: 0 },
      ],
      surface: 'INDOOR',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'sprintTimes',
  })

  const selectedClient = clients.find((c) => c.id === form.watch('clientId'))
  const sprintTimes = form.watch('sprintTimes')
  const sprintDistance = form.watch('sprintDistance')
  const restTime = form.watch('restTime')

  // Live RSA analysis
  const validTimes = sprintTimes
    .map((s) => s.time)
    .filter((t) => t > 0)

  const liveAnalysis = validTimes.length >= 3 ? analyzeRSA(validTimes, restTime) : null

  async function handleSubmit(data: RSATestFormData) {
    setSubmitting(true)
    setResult(null)
    setError(null)

    try {
      const client = clients.find((c) => c.id === data.clientId)
      if (!client) throw new Error('Klient hittades inte')

      const times = data.sprintTimes.map((s) => s.time).filter((t) => t > 0)
      const rsaAnalysis = analyzeRSA(times, data.restTime)
      const tier = classifyRSA(rsaAnalysis.fatigueIndex, client.gender)

      const response = await fetch('/api/sport-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: data.clientId,
          testDate: data.testDate,
          category: 'SPEED',
          protocol: 'RSA_6X30M',
          sport: 'GENERAL_FITNESS',
          rawData: {
            sprintTimes: times,
            sprintDistance: data.sprintDistance,
            restTime: data.restTime,
            surface: data.surface,
            ...rsaAnalysis,
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
        rsaAnalysis,
        client,
      })

      onTestSaved?.(resultData.data)
    } catch (err) {
      console.error('Failed to save RSA test:', err)
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
                <Repeat className="h-5 w-5" />
                Repeated Sprint Ability (RSA)
              </CardTitle>
              <CardDescription>
                Mäter uthållighet vid upprepade sprinter. Standard: 6×30m med 25s vila.
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
                  name="sprintDistance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sprintdistans (m)</FormLabel>
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
                          <SelectItem value="20">20 m</SelectItem>
                          <SelectItem value="30">30 m (standard)</SelectItem>
                          <SelectItem value="40">40 m</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="restTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vilotid (s)</FormLabel>
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
                          <SelectItem value="20">20 s</SelectItem>
                          <SelectItem value="25">25 s (standard)</SelectItem>
                          <SelectItem value="30">30 s</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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

              {/* Sprint times input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>Sprinttider (s)</FormLabel>
                  {fields.length < 10 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ time: 0 })}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Lägg till sprint
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {fields.map((field, index) => (
                    <FormField
                      key={field.id}
                      control={form.control}
                      name={`sprintTimes.${index}.time`}
                      render={({ field }) => (
                        <FormItem>
                          <div className="relative">
                            <FormLabel className="text-xs text-muted-foreground absolute -top-2 left-2 bg-background px-1">
                              Sprint {index + 1}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min={2}
                                max={10}
                                placeholder="0.00"
                                className="text-center"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value ? parseFloat(e.target.value) : 0
                                  )
                                }
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                {fields.length > 3 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(fields.length - 1)}
                    className="text-muted-foreground"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Ta bort sista
                  </Button>
                )}
              </div>

              {/* Live RSA analysis */}
              {liveAnalysis && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    RSA-analys
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Bästa tid</p>
                      <span className="text-xl font-bold text-green-600">
                        {liveAnalysis.bestTime}
                      </span>
                      <span className="text-sm text-muted-foreground ml-1">s</span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sämsta tid</p>
                      <span className="text-xl font-bold text-orange-600">
                        {liveAnalysis.worstTime}
                      </span>
                      <span className="text-sm text-muted-foreground ml-1">s</span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Medeltid</p>
                      <span className="text-xl font-bold text-primary">
                        {liveAnalysis.meanTime}
                      </span>
                      <span className="text-sm text-muted-foreground ml-1">s</span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Fatigue Index</p>
                      <span className="text-xl font-bold text-primary">
                        {liveAnalysis.fatigueIndex}
                      </span>
                      <span className="text-sm text-muted-foreground ml-1">%</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Sprint Decrement (Sdec)</p>
                      <span className="text-lg font-semibold">
                        {liveAnalysis.performanceDecrement}%
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total tid</p>
                      <span className="text-lg font-semibold">{liveAnalysis.totalTime}s</span>
                    </div>
                  </div>
                  {selectedClient && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Nivå:</span>
                      <TestBenchmarkBadge
                        tier={classifyRSA(liveAnalysis.fatigueIndex, selectedClient.gender)}
                      />
                    </div>
                  )}
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
                        placeholder="Uppvärmning, återhämtning mellan sprinter, observationer..."
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
            {submitting ? 'Sparar...' : 'Spara RSA-test'}
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
              {result.client?.name} - RSA {result.rsaAnalysis?.sprintCount}×
              {result.rawData?.sprintDistance}m -{' '}
              {new Date(result.testDate).toLocaleDateString('sv-SE')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <CompactResult
                label="Bästa tid"
                value={result.rsaAnalysis?.bestTime || result.primaryResult}
                unit="s"
              />
              <CompactResult
                label="Medeltid"
                value={result.rsaAnalysis?.meanTime}
                unit="s"
              />
              <CompactResult
                label="Fatigue Index"
                value={result.rsaAnalysis?.fatigueIndex || result.secondaryResult}
                unit="%"
                tier={result.tier}
              />
              <CompactResult
                label="Sdec"
                value={result.rsaAnalysis?.performanceDecrement}
                unit="%"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
