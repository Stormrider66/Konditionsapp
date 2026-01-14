'use client'

/**
 * Padel Test Battery Form
 *
 * Standard padel physical test battery:
 * - Serve Speed (Power)
 * - T-Test Agility (Lateral movement)
 * - CMJ / Vertical Jump (Explosive power for smashes)
 * - 5-10-5 Lateral Speed Test
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
import { Badge } from '@/components/ui/badge'
import { Trophy, CheckCircle, AlertTriangle, Timer, Zap, Target, ArrowLeftRight } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const padelTestSchema = z.object({
  clientId: z.string().min(1, 'Valj en klient'),
  testDate: z.string().min(1, 'Valj testdatum'),
  playerType: z.enum(['right_side', 'left_side', 'all_round']),
  // Serve Speed
  serveSpeed: z.number().min(50).max(200).optional(),
  // T-Test Agility
  tTest: z.number().min(5).max(20).optional(),
  // CMJ
  cmjHeight: z.number().min(15).max(80).optional(),
  // 5-10-5 Lateral Speed
  lateralSpeed: z.number().min(3).max(8).optional(),
  notes: z.string().optional(),
})

type PadelTestFormData = z.infer<typeof padelTestSchema>

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface PadelTestBatteryFormProps {
  clients: Client[]
  onTestSaved?: (tests: any[]) => void
}

const PLAYER_TYPE_LABELS: Record<string, string> = {
  right_side: 'Hogersida (Drive)',
  left_side: 'Vanstersida (Reves)',
  all_round: 'Allround',
}

// Player type-specific benchmarks (elite level)
const PLAYER_TYPE_BENCHMARKS: Record<string, { serveSpeed: number; tTest: number; cmj: number; lateralSpeed: number }> = {
  right_side: { serveSpeed: 140, tTest: 9.0, cmj: 45, lateralSpeed: 4.3 },
  left_side: { serveSpeed: 145, tTest: 8.8, cmj: 48, lateralSpeed: 4.1 },
  all_round: { serveSpeed: 142, tTest: 8.9, cmj: 46, lateralSpeed: 4.2 },
}

function getBenchmarkClass(actual: number | undefined, target: number, lowerIsBetter = false): string {
  if (!actual) return 'text-muted-foreground'
  if (lowerIsBetter) {
    return actual <= target ? 'text-green-600' : 'text-orange-500'
  }
  return actual >= target ? 'text-green-600' : 'text-orange-500'
}

function getBenchmarkLabel(actual: number | undefined, target: number, lowerIsBetter = false): string {
  if (!actual) return '-'
  const percentage = lowerIsBetter
    ? Math.round((target / actual) * 100)
    : Math.round((actual / target) * 100)
  return `${percentage}% av elit`
}

export function PadelTestBatteryForm({ clients, onTestSaved }: PadelTestBatteryFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('serve')

  const form = useForm<PadelTestFormData>({
    resolver: zodResolver(padelTestSchema),
    defaultValues: {
      testDate: new Date().toISOString().split('T')[0],
      playerType: 'all_round',
    },
  })

  const selectedClient = clients.find((c) => c.id === form.watch('clientId'))
  const playerType = form.watch('playerType')
  const benchmarks = PLAYER_TYPE_BENCHMARKS[playerType] || PLAYER_TYPE_BENCHMARKS.all_round

  // Watch values for live comparison
  const serveSpeed = form.watch('serveSpeed')
  const tTest = form.watch('tTest')
  const cmjHeight = form.watch('cmjHeight')
  const lateralSpeed = form.watch('lateralSpeed')

  async function handleSubmit(data: PadelTestFormData) {
    setSubmitting(true)
    setResults([])
    setError(null)

    try {
      const client = clients.find((c) => c.id === data.clientId)
      if (!client) throw new Error('Klient hittades inte')

      const savedTests: any[] = []

      // Save Serve Speed test if data provided
      if (data.serveSpeed) {
        const serveResponse = await fetch('/api/sport-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: data.clientId,
            testDate: data.testDate,
            category: 'POWER',
            protocol: 'SERVE_SPEED',
            sport: 'PADEL',
            rawData: {
              serveSpeed: data.serveSpeed,
              playerType: data.playerType,
            },
            notes: data.notes,
          }),
        })
        if (serveResponse.ok) {
          const result = await serveResponse.json()
          savedTests.push({ ...result.data, type: 'Serve Speed' })
        }
      }

      // Save T-Test if data provided
      if (data.tTest) {
        const tTestResponse = await fetch('/api/sport-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: data.clientId,
            testDate: data.testDate,
            category: 'AGILITY',
            protocol: 'T_TEST',
            sport: 'PADEL',
            rawData: {
              totalTime: data.tTest,
              playerType: data.playerType,
            },
            notes: data.notes,
          }),
        })
        if (tTestResponse.ok) {
          const result = await tTestResponse.json()
          savedTests.push({ ...result.data, type: 'T-Test Agility' })
        }
      }

      // Save CMJ if data provided
      if (data.cmjHeight) {
        const cmjResponse = await fetch('/api/sport-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: data.clientId,
            testDate: data.testDate,
            category: 'POWER',
            protocol: 'VERTICAL_JUMP_CMJ',
            sport: 'PADEL',
            rawData: {
              jumpHeight: data.cmjHeight,
              playerType: data.playerType,
            },
            notes: data.notes,
          }),
        })
        if (cmjResponse.ok) {
          const result = await cmjResponse.json()
          savedTests.push({ ...result.data, type: 'CMJ' })
        }
      }

      // Save 5-10-5 Lateral Speed if data provided
      if (data.lateralSpeed) {
        const lateralResponse = await fetch('/api/sport-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: data.clientId,
            testDate: data.testDate,
            category: 'AGILITY',
            protocol: 'PRO_AGILITY_5_10_5',
            sport: 'PADEL',
            rawData: {
              totalTime: data.lateralSpeed,
              playerType: data.playerType,
            },
            notes: data.notes,
          }),
        })
        if (lateralResponse.ok) {
          const result = await lateralResponse.json()
          savedTests.push({ ...result.data, type: '5-10-5 Lateral Speed' })
        }
      }

      if (savedTests.length === 0) {
        throw new Error('Inga testresultat att spara. Fyll i minst ett test.')
      }

      setResults(savedTests)
      onTestSaved?.(savedTests)
    } catch (err) {
      console.error('Failed to save padel tests:', err)
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
            <Trophy className="h-5 w-5 text-purple-500" />
            Padel - Testbatteri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Inga klienter hittades. Lagg till klienter for att kunna registrera test.
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
                <Trophy className="h-5 w-5 text-purple-500" />
                Padel - Testbatteri
              </CardTitle>
              <CardDescription>
                Fysiska tester for padelspelare: Serve Speed, T-Test, CMJ, 5-10-5 Lateral Speed
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
                            <SelectValue placeholder="Valj klient" />
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

                <FormField
                  control={form.control}
                  name="playerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spelartyp</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(PLAYER_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Jamfors mot elitreferensvarden for {PLAYER_TYPE_LABELS[playerType]}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Test Sections */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="serve" className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Serve</span>
              </TabsTrigger>
              <TabsTrigger value="ttest" className="flex items-center gap-1">
                <ArrowLeftRight className="h-4 w-4" />
                <span className="hidden sm:inline">T-Test</span>
              </TabsTrigger>
              <TabsTrigger value="cmj" className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">CMJ</span>
              </TabsTrigger>
              <TabsTrigger value="lateral" className="flex items-center gap-1">
                <Timer className="h-4 w-4" />
                <span className="hidden sm:inline">5-10-5</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="serve">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-purple-500" />
                    Serve Speed (Power)
                  </CardTitle>
                  <CardDescription>
                    Mater serveeffekt och kraftutveckling
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="serveSpeed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hastighet (km/h)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={50}
                            max={200}
                            step={1}
                            placeholder="ex: 140"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {serveSpeed && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Resultat:</span>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${getBenchmarkClass(serveSpeed, benchmarks.serveSpeed)}`}>
                            {serveSpeed} km/h
                          </span>
                          <p className={`text-xs ${getBenchmarkClass(serveSpeed, benchmarks.serveSpeed)}`}>
                            {getBenchmarkLabel(serveSpeed, benchmarks.serveSpeed)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Elitkrav for {PLAYER_TYPE_LABELS[playerType]}: {benchmarks.serveSpeed} km/h
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ttest">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ArrowLeftRight className="h-5 w-5 text-blue-500" />
                    T-Test Agility (Lateral Movement)
                  </CardTitle>
                  <CardDescription>
                    Mater lateral rorlighet och riktningsandringsformaga
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="tTest"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tid (sekunder)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={5}
                            max={20}
                            step={0.01}
                            placeholder="ex: 9.0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {tTest && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Resultat:</span>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${getBenchmarkClass(tTest, benchmarks.tTest, true)}`}>
                            {tTest.toFixed(2)} s
                          </span>
                          <p className={`text-xs ${getBenchmarkClass(tTest, benchmarks.tTest, true)}`}>
                            {getBenchmarkLabel(tTest, benchmarks.tTest, true)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Elitkrav for {PLAYER_TYPE_LABELS[playerType]}: {benchmarks.tTest.toFixed(2)} s
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cmj">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    CMJ / Vertical Jump (Explosive Power)
                  </CardTitle>
                  <CardDescription>
                    Mater explosiv benstyrka for smashes och overheadslag
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="cmjHeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hopphojd (cm)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={15}
                            max={80}
                            step={0.5}
                            placeholder="ex: 45"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {cmjHeight && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Resultat:</span>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${getBenchmarkClass(cmjHeight, benchmarks.cmj)}`}>
                            {cmjHeight.toFixed(1)} cm
                          </span>
                          <p className={`text-xs ${getBenchmarkClass(cmjHeight, benchmarks.cmj)}`}>
                            {getBenchmarkLabel(cmjHeight, benchmarks.cmj)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Elitkrav for {PLAYER_TYPE_LABELS[playerType]}: {benchmarks.cmj} cm
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lateral">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Timer className="h-5 w-5 text-orange-500" />
                    5-10-5 Lateral Speed Test
                  </CardTitle>
                  <CardDescription>
                    Mater lateral snabbhet och reaktionsformaga
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="lateralSpeed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tid (sekunder)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={3}
                            max={8}
                            step={0.01}
                            placeholder="ex: 4.2"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {lateralSpeed && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Resultat:</span>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${getBenchmarkClass(lateralSpeed, benchmarks.lateralSpeed, true)}`}>
                            {lateralSpeed.toFixed(2)} s
                          </span>
                          <p className={`text-xs ${getBenchmarkClass(lateralSpeed, benchmarks.lateralSpeed, true)}`}>
                            {getBenchmarkLabel(lateralSpeed, benchmarks.lateralSpeed, true)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Elitkrav for {PLAYER_TYPE_LABELS[playerType]}: {benchmarks.lateralSpeed.toFixed(2)} s
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

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
                        placeholder="Testforhallanden, kansla, observationer..."
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
            {submitting ? 'Sparar...' : 'Spara testbatteri'}
          </Button>
        </form>
      </Form>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {results.length > 0 && (
        <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="h-5 w-5" />
              {results.length} test sparade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {results.map((result, idx) => (
                <Badge key={idx} variant="outline" className="bg-green-100">
                  {result.type}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
