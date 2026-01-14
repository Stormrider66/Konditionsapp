'use client'

/**
 * Tennis Test Battery Form
 *
 * Standard tennis physical test battery:
 * - Serve Speed (Sport-specific power)
 * - Pro Agility 5-10-5 Test (Court movement)
 * - 20m Sprint (Linear speed)
 * - Yo-Yo IR1 (Endurance)
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
import { Trophy, CheckCircle, AlertTriangle, Activity, Timer, Zap } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const tennisTestSchema = z.object({
  clientId: z.string().min(1, 'Välj en klient'),
  testDate: z.string().min(1, 'Välj testdatum'),
  playerType: z.enum(['baseline', 'serve_volley', 'all_court']),
  // Serve Speed
  serveSpeed: z.number().min(80).max(260).optional(),
  // Pro Agility 5-10-5
  proAgility: z.number().min(3).max(7).optional(),
  // 20m Sprint
  sprint20m: z.number().min(2).max(5).optional(),
  // Yo-Yo IR1
  yoyoLevel: z.number().min(5).max(23).optional(),
  yoyoShuttle: z.number().min(1).max(16).optional(),
  notes: z.string().optional(),
})

type TennisTestFormData = z.infer<typeof tennisTestSchema>

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface TennisTestBatteryFormProps {
  clients: Client[]
  onTestSaved?: (tests: any[]) => void
}

const PLAYER_TYPE_LABELS: Record<string, string> = {
  baseline: 'Baselinjespelare',
  serve_volley: 'Serve-volley',
  all_court: 'Allround',
}

// Player type-specific benchmarks (elite level)
const PLAYER_TYPE_BENCHMARKS: Record<string, { serveSpeed: number; proAgility: number; sprint20m: number; yoyoIR1: number }> = {
  baseline: { serveSpeed: 180, proAgility: 4.2, sprint20m: 2.95, yoyoIR1: 19.5 },
  serve_volley: { serveSpeed: 200, proAgility: 4.0, sprint20m: 2.90, yoyoIR1: 18.5 },
  all_court: { serveSpeed: 190, proAgility: 4.1, sprint20m: 2.92, yoyoIR1: 19.0 },
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

export function TennisTestBatteryForm({ clients, onTestSaved }: TennisTestBatteryFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('serve')

  const form = useForm<TennisTestFormData>({
    resolver: zodResolver(tennisTestSchema),
    defaultValues: {
      testDate: new Date().toISOString().split('T')[0],
      playerType: 'all_court',
    },
  })

  const selectedClient = clients.find((c) => c.id === form.watch('clientId'))
  const playerType = form.watch('playerType')
  const benchmarks = PLAYER_TYPE_BENCHMARKS[playerType] || PLAYER_TYPE_BENCHMARKS.all_court

  // Watch values for live comparison
  const serveSpeed = form.watch('serveSpeed')
  const proAgility = form.watch('proAgility')
  const sprint20m = form.watch('sprint20m')
  const yoyoLevel = form.watch('yoyoLevel')

  async function handleSubmit(data: TennisTestFormData) {
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
            sport: 'TENNIS',
            rawData: {
              speed: data.serveSpeed,
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

      // Save Pro Agility 5-10-5 test if data provided
      if (data.proAgility) {
        const agilityResponse = await fetch('/api/sport-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: data.clientId,
            testDate: data.testDate,
            category: 'AGILITY',
            protocol: 'PRO_AGILITY_5_10_5',
            sport: 'TENNIS',
            rawData: {
              totalTime: data.proAgility,
              playerType: data.playerType,
            },
            notes: data.notes,
          }),
        })
        if (agilityResponse.ok) {
          const result = await agilityResponse.json()
          savedTests.push({ ...result.data, type: 'Pro Agility 5-10-5' })
        }
      }

      // Save 20m sprint if data provided
      if (data.sprint20m) {
        const sprint20Response = await fetch('/api/sport-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: data.clientId,
            testDate: data.testDate,
            category: 'SPEED',
            protocol: 'SPRINT_20M',
            sport: 'TENNIS',
            rawData: {
              totalTime: data.sprint20m,
              playerType: data.playerType,
            },
            notes: data.notes,
          }),
        })
        if (sprint20Response.ok) {
          const result = await sprint20Response.json()
          savedTests.push({ ...result.data, type: '20m Sprint' })
        }
      }

      // Save Yo-Yo IR1 test if data provided
      if (data.yoyoLevel && data.yoyoShuttle) {
        const yoyoResponse = await fetch('/api/sport-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: data.clientId,
            testDate: data.testDate,
            category: 'ENDURANCE_FIELD',
            protocol: 'YOYO_IR1',
            sport: 'TENNIS',
            rawData: {
              level: data.yoyoLevel,
              shuttle: data.yoyoShuttle,
              playerType: data.playerType,
            },
            notes: data.notes,
          }),
        })
        if (yoyoResponse.ok) {
          const result = await yoyoResponse.json()
          savedTests.push({ ...result.data, type: 'Yo-Yo IR1' })
        }
      }

      if (savedTests.length === 0) {
        throw new Error('Inga testresultat att spara. Fyll i minst ett test.')
      }

      setResults(savedTests)
      onTestSaved?.(savedTests)
    } catch (err) {
      console.error('Failed to save tennis tests:', err)
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
            <Trophy className="h-5 w-5 text-green-500" />
            Tennis - Testbatteri
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
                <Trophy className="h-5 w-5 text-green-500" />
                Tennis - Testbatteri
              </CardTitle>
              <CardDescription>
                Fysiska tester för tennisspelare: Serve Speed, Pro Agility 5-10-5, 20m Sprint, Yo-Yo IR1
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
                        Jämförs mot elitreferensvärden för {PLAYER_TYPE_LABELS[playerType]}
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
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Serve</span>
              </TabsTrigger>
              <TabsTrigger value="agility" className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Agility</span>
              </TabsTrigger>
              <TabsTrigger value="sprint" className="flex items-center gap-1">
                <Timer className="h-4 w-4" />
                <span className="hidden sm:inline">20m</span>
              </TabsTrigger>
              <TabsTrigger value="yoyo" className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Yo-Yo</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="serve">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Serve Speed
                  </CardTitle>
                  <CardDescription>
                    Mäter kraftutveckling i serven - sportspecifik power
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
                            min={80}
                            max={260}
                            step={1}
                            placeholder="ex: 190"
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
                        Elitkrav för {PLAYER_TYPE_LABELS[playerType]}: {benchmarks.serveSpeed} km/h
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="agility">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Pro Agility 5-10-5 Test
                  </CardTitle>
                  <CardDescription>
                    Mäter rörlighet och riktningsändringar - banrörelse
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="proAgility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tid (sekunder)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={3}
                            max={7}
                            step={0.01}
                            placeholder="ex: 4.1"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription>
                          5 yards - 10 yards - 5 yards (total 20 yards)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {proAgility && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Resultat:</span>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${getBenchmarkClass(proAgility, benchmarks.proAgility, true)}`}>
                            {proAgility.toFixed(2)} s
                          </span>
                          <p className={`text-xs ${getBenchmarkClass(proAgility, benchmarks.proAgility, true)}`}>
                            {getBenchmarkLabel(proAgility, benchmarks.proAgility, true)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Elitkrav för {PLAYER_TYPE_LABELS[playerType]}: {benchmarks.proAgility.toFixed(2)} s
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sprint">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Timer className="h-5 w-5 text-orange-500" />
                    20 meter Sprint
                  </CardTitle>
                  <CardDescription>
                    Mäter linjär sprintsnabbhet
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="sprint20m"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tid (sekunder)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={2}
                            max={5}
                            step={0.01}
                            placeholder="ex: 2.92"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {sprint20m && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Resultat:</span>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${getBenchmarkClass(sprint20m, benchmarks.sprint20m, true)}`}>
                            {sprint20m.toFixed(2)} s
                          </span>
                          <p className={`text-xs ${getBenchmarkClass(sprint20m, benchmarks.sprint20m, true)}`}>
                            {getBenchmarkLabel(sprint20m, benchmarks.sprint20m, true)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Elitkrav för {PLAYER_TYPE_LABELS[playerType]}: {benchmarks.sprint20m.toFixed(2)} s
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="yoyo">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5 text-purple-500" />
                    Yo-Yo Intermittent Recovery Test (IR1)
                  </CardTitle>
                  <CardDescription>
                    Mäter aerob kapacitet och återhämtningsförmåga
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="yoyoLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nivå</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={5}
                              max={23}
                              step={1}
                              placeholder="ex: 19"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="yoyoShuttle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shuttle</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={16}
                              step={1}
                              placeholder="ex: 4"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {yoyoLevel && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Resultat:</span>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${getBenchmarkClass(yoyoLevel, benchmarks.yoyoIR1)}`}>
                            {yoyoLevel.toFixed(1)}
                          </span>
                          <p className={`text-xs ${getBenchmarkClass(yoyoLevel, benchmarks.yoyoIR1)}`}>
                            {getBenchmarkLabel(yoyoLevel, benchmarks.yoyoIR1)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Elitkrav för {PLAYER_TYPE_LABELS[playerType]}: {benchmarks.yoyoIR1.toFixed(1)}
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
                        placeholder="Testförhållanden, känsla, observationer..."
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
