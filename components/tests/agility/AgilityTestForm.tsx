'use client'

/**
 * Agility Test Form
 *
 * Supports multiple agility tests:
 * - T-Test
 * - Illinois Agility
 * - Pro Agility (5-10-5)
 * - Lane Agility (Basketball)
 * - Arrowhead Agility
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shuffle, CheckCircle, AlertTriangle, TrendingUp, SquareArrowOutUpRight } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { CompactResult } from '@/components/tests/shared/TestResultDisplay'
import { TestBenchmarkBadge, type BenchmarkTier } from '@/components/tests/shared/TestBenchmarkBadge'
import {
  classifyTTest,
  classifyIllinoisAgility,
  classifyProAgility,
  classifyLaneAgility,
  getAgilityTestDescription,
  calculateCODDeficit,
  type AgilityTestType,
} from '@/lib/calculations/sport-tests/agility-tests'

const agilityTestSchema = z.object({
  clientId: z.string().min(1, 'Välj en klient'),
  testDate: z.string().min(1, 'Välj testdatum'),
  testType: z.enum(['T_TEST', 'ILLINOIS', 'PRO_AGILITY_5_10_5', 'LANE_AGILITY', 'ARROWHEAD_AGILITY']),
  time: z.number().min(3).max(30),
  linearTime: z.number().min(1).max(10).optional(), // For COD deficit calculation
  surface: z.enum(['INDOOR', 'OUTDOOR_TRACK', 'GRASS', 'TURF']).optional(),
  attempts: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
})

type AgilityTestFormData = z.infer<typeof agilityTestSchema>

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface AgilityTestFormProps {
  clients: Client[]
  onTestSaved?: (test: any) => void
}

const testTypeOptions = [
  { value: 'T_TEST', label: 'T-Test', description: 'Snabbhetstest med riktningsförändringar i T-form' },
  { value: 'ILLINOIS', label: 'Illinois Agility', description: 'Löpbana med slalom runt koner' },
  { value: 'PRO_AGILITY_5_10_5', label: '5-10-5 Pro Agility', description: 'Kort shuttle med snabba riktningsförändringar' },
  { value: 'LANE_AGILITY', label: 'Lane Agility (Basket)', description: 'Basketspecifikt test runt straffområdet' },
  { value: 'ARROWHEAD_AGILITY', label: 'Arrowhead Agility', description: 'Pilformad bana med diagonala riktningsförändringar' },
]

function getClassifier(testType: string): (time: number, gender: 'MALE' | 'FEMALE') => BenchmarkTier {
  switch (testType) {
    case 'T_TEST':
      return classifyTTest as (time: number, gender: 'MALE' | 'FEMALE') => BenchmarkTier
    case 'ILLINOIS':
      return classifyIllinoisAgility as (time: number, gender: 'MALE' | 'FEMALE') => BenchmarkTier
    case 'PRO_AGILITY_5_10_5':
      return classifyProAgility as (time: number, gender: 'MALE' | 'FEMALE') => BenchmarkTier
    case 'LANE_AGILITY':
      return classifyLaneAgility as (time: number, gender: 'MALE' | 'FEMALE') => BenchmarkTier
    case 'ARROWHEAD_AGILITY':
      return classifyTTest as (time: number, gender: 'MALE' | 'FEMALE') => BenchmarkTier // Use T-Test as approximation
    default:
      return () => 'INTERMEDIATE'
  }
}

export function AgilityTestForm({ clients, onTestSaved }: AgilityTestFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<AgilityTestFormData>({
    resolver: zodResolver(agilityTestSchema),
    defaultValues: {
      testDate: new Date().toISOString().split('T')[0],
      testType: 'T_TEST',
      surface: 'INDOOR',
      attempts: 3,
    },
  })

  const selectedClient = clients.find((c) => c.id === form.watch('clientId'))
  const testType = form.watch('testType')
  const time = form.watch('time')
  const linearTime = form.watch('linearTime')

  // Live tier calculation
  const liveTier =
    time && selectedClient
      ? getClassifier(testType)(time, selectedClient.gender)
      : null

  // Live COD deficit calculation
  const liveCODDeficit =
    time && linearTime ? calculateCODDeficit(time, linearTime) : null

  const selectedTestOption = testTypeOptions.find((t) => t.value === testType)

  async function handleSubmit(data: AgilityTestFormData) {
    setSubmitting(true)
    setResult(null)
    setError(null)

    try {
      const client = clients.find((c) => c.id === data.clientId)
      if (!client) throw new Error('Klient hittades inte')

      const classifier = getClassifier(data.testType)
      const tier = classifier(data.time, client.gender)
      const codDeficit = data.linearTime
        ? calculateCODDeficit(data.time, data.linearTime)
        : undefined

      const response = await fetch('/api/sport-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: data.clientId,
          testDate: data.testDate,
          category: 'AGILITY',
          protocol: data.testType,
          sport: data.testType === 'LANE_AGILITY' ? 'TEAM_BASKETBALL' : 'GENERAL_FITNESS',
          rawData: {
            time: data.time,
            linearTime: data.linearTime,
            codDeficit,
            surface: data.surface,
            attempts: data.attempts,
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
        codDeficit,
        client,
        testTypeLabel: selectedTestOption?.label,
      })

      onTestSaved?.(resultData.data)
      form.reset({
        testDate: new Date().toISOString().split('T')[0],
        testType: 'T_TEST',
        surface: 'INDOOR',
        attempts: 3,
      })
    } catch (err) {
      console.error('Failed to save agility test:', err)
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
            <Shuffle className="h-5 w-5" />
            Agilitytest
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
                <Shuffle className="h-5 w-5" />
                Agilitytest
              </CardTitle>
              <CardDescription>
                Mät snabbhet vid riktningsförändringar och rörelseförmåga
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

              <FormField
                control={form.control}
                name="testType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Testtyp</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {testTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col">
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTestOption && (
                      <FormDescription>{selectedTestOption.description}</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tid (s)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min={3}
                          max={30}
                          placeholder="t.ex. 10.5"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Bästa tid av alla försök</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linearTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linjär tid (s) - valfritt</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min={1}
                          max={10}
                          placeholder="t.ex. 4.5"
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                          }
                        />
                      </FormControl>
                      <FormDescription>För COD-deficit beräkning</FormDescription>
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

              {/* Live calculation preview */}
              {liveTier && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Resultat
                  </p>
                  <div className="flex items-center gap-4">
                    <TestBenchmarkBadge tier={liveTier} />
                    {liveCODDeficit !== null && (
                      <div>
                        <span className="text-sm text-muted-foreground">COD-deficit: </span>
                        <span className="font-semibold">{liveCODDeficit}s</span>
                      </div>
                    )}
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
                        placeholder="Teknik, underlag, observationer..."
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
            {submitting ? 'Sparar...' : 'Spara agilitytest'}
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
              {result.client?.name} - {result.testTypeLabel} -{' '}
              {new Date(result.testDate).toLocaleDateString('sv-SE')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <CompactResult
                label="Tid"
                value={result.primaryResult}
                unit="s"
                tier={result.tier}
              />
              {result.codDeficit !== undefined && (
                <CompactResult label="COD-deficit" value={result.codDeficit} unit="s" />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
