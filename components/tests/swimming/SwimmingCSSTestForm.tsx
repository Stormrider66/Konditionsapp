'use client'

/**
 * Swimming CSS Test Form
 *
 * Critical Swim Speed test:
 * - 400m time trial
 * - 200m time trial
 * - Calculates CSS pace and training zones
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
import { Waves, CheckCircle, AlertTriangle, TrendingUp, Clock } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { CompactResult } from '@/components/tests/shared/TestResultDisplay'
import { TestBenchmarkBadge, type BenchmarkTier } from '@/components/tests/shared/TestBenchmarkBadge'
import {
  calculateCSS,
  classifyCSS,
  formatSwimPace,
  type SwimZone,
} from '@/lib/calculations/sport-tests/swimming-tests'

// Helper to convert mm:ss to seconds
function timeToSeconds(minutes: number, seconds: number): number {
  return minutes * 60 + seconds
}

// Helper to format seconds as mm:ss
function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = Math.round(totalSeconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const cssTestSchema = z.object({
  clientId: z.string().min(1, 'Välj en klient'),
  testDate: z.string().min(1, 'Välj testdatum'),
  time400mMinutes: z.number().min(3).max(15),
  time400mSeconds: z.number().min(0).max(59),
  time200mMinutes: z.number().min(1).max(8),
  time200mSeconds: z.number().min(0).max(59),
  poolLength: z.enum(['25', '50']),
  stroke: z.enum(['FREESTYLE', 'BACKSTROKE', 'BREASTSTROKE', 'BUTTERFLY']),
  notes: z.string().optional(),
})

type CSSTestFormData = z.infer<typeof cssTestSchema>

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface SwimmingCSSTestFormProps {
  clients: Client[]
  onTestSaved?: (test: any) => void
}

export function SwimmingCSSTestForm({ clients, onTestSaved }: SwimmingCSSTestFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<CSSTestFormData>({
    resolver: zodResolver(cssTestSchema),
    defaultValues: {
      testDate: new Date().toISOString().split('T')[0],
      poolLength: '25',
      stroke: 'FREESTYLE',
      time400mMinutes: 6,
      time400mSeconds: 0,
      time200mMinutes: 2,
      time200mSeconds: 45,
    },
  })

  const selectedClient = clients.find((c) => c.id === form.watch('clientId'))

  const time400mMinutes = form.watch('time400mMinutes')
  const time400mSeconds = form.watch('time400mSeconds')
  const time200mMinutes = form.watch('time200mMinutes')
  const time200mSeconds = form.watch('time200mSeconds')

  // Calculate times in seconds
  const time400m =
    time400mMinutes && time400mSeconds !== undefined
      ? timeToSeconds(time400mMinutes, time400mSeconds)
      : null
  const time200m =
    time200mMinutes && time200mSeconds !== undefined
      ? timeToSeconds(time200mMinutes, time200mSeconds)
      : null

  // Live CSS calculation
  const liveCSSResult =
    time400m && time200m && time400m > time200m ? calculateCSS(time400m, time200m) : null

  const liveTier =
    liveCSSResult && selectedClient
      ? classifyCSS(liveCSSResult.cssPer100m, selectedClient.gender)
      : null

  async function handleSubmit(data: CSSTestFormData) {
    setSubmitting(true)
    setResult(null)
    setError(null)

    try {
      const client = clients.find((c) => c.id === data.clientId)
      if (!client) throw new Error('Klient hittades inte')

      const t400 = timeToSeconds(data.time400mMinutes, data.time400mSeconds)
      const t200 = timeToSeconds(data.time200mMinutes, data.time200mSeconds)

      if (t400 <= t200) {
        throw new Error('400m-tiden måste vara längre än 200m-tiden')
      }

      const cssResult = calculateCSS(t400, t200)
      const tier = classifyCSS(cssResult.cssPer100m, client.gender)

      const response = await fetch('/api/sport-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: data.clientId,
          testDate: data.testDate,
          category: 'ENDURANCE_FIELD',
          protocol: 'CSS_TEST',
          sport: 'SWIMMING',
          rawData: {
            time400m: t400,
            time200m: t200,
            poolLength: parseInt(data.poolLength),
            stroke: data.stroke,
            css: cssResult.css,
            cssPer100m: cssResult.cssPer100m,
            zones: cssResult.zones,
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
        cssResult,
        client,
        time400mFormatted: formatTime(t400),
        time200mFormatted: formatTime(t200),
      })

      onTestSaved?.(resultData.data)
    } catch (err) {
      console.error('Failed to save CSS test:', err)
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
            <Waves className="h-5 w-5" />
            CSS-test (Simning)
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
                <Waves className="h-5 w-5" />
                Critical Swim Speed (CSS)
              </CardTitle>
              <CardDescription>
                Beräkna tröskeltempto genom 400m och 200m tidtagning. CSS motsvarar ditt uthålliga
                tempo i simning.
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
                          <SelectItem value="25">25 m</SelectItem>
                          <SelectItem value="50">50 m</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stroke"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Simsätt</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="FREESTYLE">Frisim (crawl)</SelectItem>
                          <SelectItem value="BACKSTROKE">Ryggsim</SelectItem>
                          <SelectItem value="BREASTSTROKE">Bröstsim</SelectItem>
                          <SelectItem value="BUTTERFLY">Fjärilsim</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 400m Time */}
              <div className="space-y-2">
                <FormLabel className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  400m tid
                </FormLabel>
                <div className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name="time400mMinutes"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="number"
                            min={3}
                            max={15}
                            placeholder="Min"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <span className="text-muted-foreground">:</span>
                  <FormField
                    control={form.control}
                    name="time400mSeconds"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={59}
                            placeholder="Sek"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormDescription>Maximal 400m tidtagning (mm:ss)</FormDescription>
              </div>

              {/* 200m Time */}
              <div className="space-y-2">
                <FormLabel className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  200m tid
                </FormLabel>
                <div className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name="time200mMinutes"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={8}
                            placeholder="Min"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <span className="text-muted-foreground">:</span>
                  <FormField
                    control={form.control}
                    name="time200mSeconds"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={59}
                            placeholder="Sek"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormDescription>Maximal 200m tidtagning (mm:ss)</FormDescription>
              </div>

              {/* Live CSS calculation */}
              {liveCSSResult && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Beräknad CSS
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">CSS tempo</p>
                        <span className="text-2xl font-bold text-primary">
                          {liveCSSResult.cssFormatted}
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">/100m</span>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Hastighet</p>
                        <span className="text-2xl font-bold text-primary">{liveCSSResult.css}</span>
                        <span className="text-sm text-muted-foreground ml-1">m/s</span>
                      </div>
                      {liveTier && (
                        <div className="flex items-center">
                          <TestBenchmarkBadge tier={liveTier} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Training zones */}
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium mb-2">Träningszoner:</p>
                    <div className="space-y-1">
                      {liveCSSResult.zones.map((zone) => (
                        <div
                          key={zone.zone}
                          className="flex items-center justify-between text-sm p-2 rounded bg-background"
                        >
                          <span className="font-medium">
                            Z{zone.zone} {zone.nameSwedish}
                          </span>
                          <span className="text-muted-foreground">
                            {formatSwimPace(zone.paceMax)} - {formatSwimPace(zone.paceMin)} /100m
                          </span>
                        </div>
                      ))}
                    </div>
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
                        placeholder="Teknik, känsla, bassängförhållanden..."
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
            {submitting ? 'Sparar...' : 'Spara CSS-test'}
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
              {result.client?.name} - CSS Test -{' '}
              {new Date(result.testDate).toLocaleDateString('sv-SE')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <CompactResult
                label="CSS tempo"
                value={result.cssResult?.cssFormatted}
                unit="/100m"
                tier={result.tier}
              />
              <CompactResult
                label="Hastighet"
                value={result.cssResult?.css}
                unit="m/s"
              />
              <CompactResult label="400m tid" value={result.time400mFormatted} />
              <CompactResult label="200m tid" value={result.time200mFormatted} />
            </div>

            {/* Zones summary */}
            {result.cssResult?.zones && (
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">Träningszoner sparade:</p>
                <div className="flex flex-wrap gap-2">
                  {result.cssResult.zones.map((zone: SwimZone) => (
                    <span
                      key={zone.zone}
                      className="text-xs px-2 py-1 bg-muted rounded"
                    >
                      Z{zone.zone}: {formatSwimPace(zone.paceMax)}-{formatSwimPace(zone.paceMin)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
