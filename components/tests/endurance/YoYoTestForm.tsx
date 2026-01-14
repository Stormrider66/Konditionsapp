'use client'

/**
 * Yo-Yo Intermittent Recovery Test Form
 *
 * Standard endurance test for team sports:
 * - Yo-Yo IR1 (for most team sports)
 * - Yo-Yo IR2 (for elite/higher intensity sports)
 *
 * Measures intermittent aerobic capacity
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
import { Activity, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { CompactResult } from '@/components/tests/shared/TestResultDisplay'
import { TestBenchmarkBadge, type BenchmarkTier } from '@/components/tests/shared/TestBenchmarkBadge'
import {
  analyzeYoYoIR1,
  estimateVO2maxFromYoYoIR2,
  calculateYoYoDistance,
  classifyYoYoIR1,
} from '@/lib/calculations/sport-tests/endurance-tests'

const yoyoTestSchema = z.object({
  clientId: z.string().min(1, 'Välj en klient'),
  testDate: z.string().min(1, 'Välj testdatum'),
  testVersion: z.enum(['IR1', 'IR2']),
  level: z.number().min(5).max(25),
  shuttle: z.number().min(1).max(8),
  sport: z.enum([
    'TEAM_FOOTBALL',
    'TEAM_HANDBALL',
    'TEAM_FLOORBALL',
    'TEAM_ICE_HOCKEY',
    'TEAM_BASKETBALL',
    'TEAM_VOLLEYBALL',
    'GENERAL_FITNESS',
  ]),
  surface: z.enum(['INDOOR', 'OUTDOOR_TRACK', 'GRASS', 'TURF']).optional(),
  notes: z.string().optional(),
})

type YoYoTestFormData = z.infer<typeof yoyoTestSchema>

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface YoYoTestFormProps {
  clients: Client[]
  onTestSaved?: (test: any) => void
  defaultSport?: string
}

const sportOptions = [
  { value: 'TEAM_FOOTBALL', label: 'Fotboll' },
  { value: 'TEAM_HANDBALL', label: 'Handboll' },
  { value: 'TEAM_FLOORBALL', label: 'Innebandy' },
  { value: 'TEAM_ICE_HOCKEY', label: 'Ishockey' },
  { value: 'TEAM_BASKETBALL', label: 'Basket' },
  { value: 'TEAM_VOLLEYBALL', label: 'Volleyboll' },
  { value: 'GENERAL_FITNESS', label: 'Allmän kondition' },
]

// Yo-Yo level descriptions
const levelDescriptions: Record<number, string> = {
  5: 'Uppvärmningsnivå',
  9: 'Startnivå',
  11: 'Måttlig',
  13: 'Bra',
  15: 'Bra',
  17: 'Mycket bra',
  19: 'Utmärkt',
  21: 'Elit',
  23: 'Världsklass',
}

export function YoYoTestForm({ clients, onTestSaved, defaultSport }: YoYoTestFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<YoYoTestFormData>({
    resolver: zodResolver(yoyoTestSchema),
    defaultValues: {
      testDate: new Date().toISOString().split('T')[0],
      testVersion: 'IR1',
      level: 17,
      shuttle: 4,
      sport: (defaultSport as any) || 'GENERAL_FITNESS',
      surface: 'INDOOR',
    },
  })

  const selectedClient = clients.find((c) => c.id === form.watch('clientId'))
  const testVersion = form.watch('testVersion')
  const level = form.watch('level')
  const shuttle = form.watch('shuttle')
  const sport = form.watch('sport')

  // Live calculation
  const liveDistance = level && shuttle ? calculateYoYoDistance(level, shuttle) : null

  const liveResult =
    level && shuttle && selectedClient
      ? analyzeYoYoIR1(level, shuttle, selectedClient.gender, sport)
      : null

  async function handleSubmit(data: YoYoTestFormData) {
    setSubmitting(true)
    setResult(null)
    setError(null)

    try {
      const client = clients.find((c) => c.id === data.clientId)
      if (!client) throw new Error('Klient hittades inte')

      const yoyoResult = analyzeYoYoIR1(
        data.level,
        data.shuttle,
        client.gender,
        data.sport
      )

      const response = await fetch('/api/sport-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: data.clientId,
          testDate: data.testDate,
          category: 'ENDURANCE_FIELD',
          protocol: data.testVersion === 'IR1' ? 'YOYO_IR1' : 'YOYO_IR2',
          sport: data.sport,
          rawData: {
            level: data.level,
            shuttle: data.shuttle,
            testVersion: data.testVersion,
            surface: data.surface,
            totalDistance: yoyoResult.totalDistance,
            estimatedVO2max: yoyoResult.estimatedVO2max,
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
        tier: yoyoResult.tier,
        yoyoResult,
        client,
      })

      onTestSaved?.(resultData.data)
    } catch (err) {
      console.error('Failed to save Yo-Yo test:', err)
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
            <Activity className="h-5 w-5" />
            Yo-Yo Intermittent Recovery Test
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
                <Activity className="h-5 w-5" />
                Yo-Yo Intermittent Recovery Test
              </CardTitle>
              <CardDescription>
                Standard uthållighetstest för lagidrott. Mäter intermittent aerob kapacitet.
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
                  name="testVersion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Testversion</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="IR1">Yo-Yo IR1 (standard)</SelectItem>
                          <SelectItem value="IR2">Yo-Yo IR2 (intensivare)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        IR1: Standard för de flesta. IR2: För väl tränade elitspelare.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sport</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sportOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Välj sport för sportspecifika riktmärken
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nivå (Level)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={5}
                          max={25}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        {levelDescriptions[level] || 'Nivå ' + level}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shuttle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shuttle (inom nivån)</FormLabel>
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
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                            <SelectItem key={s} value={s.toString()}>
                              Shuttle {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Sista genomförd shuttle på nivån</FormDescription>
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

              {/* Live calculation preview */}
              {liveResult && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Resultat
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Nivå</p>
                      <span className="text-2xl font-bold text-primary">
                        {level}.{shuttle}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Distans</p>
                      <span className="text-2xl font-bold text-primary">
                        {liveResult.totalDistance}
                      </span>
                      <span className="text-sm text-muted-foreground ml-1">m</span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Est. VO2max</p>
                      <span className="text-2xl font-bold text-primary">
                        {liveResult.estimatedVO2max}
                      </span>
                      <span className="text-sm text-muted-foreground ml-1">ml/kg/min</span>
                    </div>
                    <div className="flex items-center">
                      <TestBenchmarkBadge tier={liveResult.tier} />
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
                        placeholder="Uppvärmning, temperatur, känsla, avbrottsorsak..."
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
            {submitting ? 'Sparar...' : 'Spara Yo-Yo test'}
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
              {result.client?.name} - Yo-Yo {result.rawData?.testVersion} -{' '}
              {new Date(result.testDate).toLocaleDateString('sv-SE')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <CompactResult
                label="Nivå"
                value={`${result.rawData?.level}.${result.rawData?.shuttle}`}
                tier={result.tier}
              />
              <CompactResult
                label="Distans"
                value={result.yoyoResult?.totalDistance}
                unit="m"
              />
              <CompactResult
                label="Est. VO2max"
                value={result.yoyoResult?.estimatedVO2max}
                unit="ml/kg/min"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
