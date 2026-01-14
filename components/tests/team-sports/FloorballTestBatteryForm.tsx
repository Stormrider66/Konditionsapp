'use client'

/**
 * Floorball Test Battery Form
 *
 * Standard floorball physical test battery:
 * - Yo-Yo IR1 (Endurance)
 * - 20m Sprint (Max speed)
 * - 5-10-5 Agility Test
 * - Standing Long Jump (Horizontal power)
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
import { Trophy, CheckCircle, AlertTriangle, Activity, Timer, Zap, ArrowRight } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const floorballTestSchema = z.object({
  clientId: z.string().min(1, 'Valj en klient'),
  testDate: z.string().min(1, 'Valj testdatum'),
  position: z.enum(['goalkeeper', 'defender', 'center', 'forward']),
  // Yo-Yo IR1
  yoyoLevel: z.number().min(5).max(23).optional(),
  yoyoShuttle: z.number().min(1).max(16).optional(),
  // Sprint test
  sprint20m: z.number().min(2).max(5).optional(),
  // Agility test (5-10-5)
  agility: z.number().min(3).max(8).optional(),
  // Standing Long Jump
  longJump: z.number().min(100).max(350).optional(),
  notes: z.string().optional(),
})

type FloorballTestFormData = z.infer<typeof floorballTestSchema>

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface FloorballTestBatteryFormProps {
  clients: Client[]
  onTestSaved?: (tests: any[]) => void
}

const POSITION_LABELS: Record<string, string> = {
  goalkeeper: 'Malvakt',
  defender: 'Back',
  center: 'Center',
  forward: 'Forward',
}

// Position-specific benchmarks (elite level)
const POSITION_BENCHMARKS: Record<string, { yoyoIR1: number; sprint20m: number; agility: number; longJump: number }> = {
  goalkeeper: { yoyoIR1: 17.0, sprint20m: 3.20, agility: 4.8, longJump: 230 },
  defender: { yoyoIR1: 19.5, sprint20m: 3.05, agility: 4.5, longJump: 260 },
  center: { yoyoIR1: 21.0, sprint20m: 3.00, agility: 4.4, longJump: 265 },
  forward: { yoyoIR1: 20.0, sprint20m: 2.95, agility: 4.3, longJump: 270 },
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

export function FloorballTestBatteryForm({ clients, onTestSaved }: FloorballTestBatteryFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('yoyo')

  const form = useForm<FloorballTestFormData>({
    resolver: zodResolver(floorballTestSchema),
    defaultValues: {
      testDate: new Date().toISOString().split('T')[0],
      position: 'center',
    },
  })

  const position = form.watch('position')
  const benchmarks = POSITION_BENCHMARKS[position] || POSITION_BENCHMARKS.center

  // Watch values for live comparison
  const yoyoLevel = form.watch('yoyoLevel')
  const sprint20m = form.watch('sprint20m')
  const agility = form.watch('agility')
  const longJump = form.watch('longJump')

  async function handleSubmit(data: FloorballTestFormData) {
    setSubmitting(true)
    setResults([])
    setError(null)

    try {
      const client = clients.find((c) => c.id === data.clientId)
      if (!client) throw new Error('Klient hittades inte')

      const savedTests: any[] = []

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
            sport: 'TEAM_FLOORBALL',
            rawData: {
              level: data.yoyoLevel,
              shuttle: data.yoyoShuttle,
              position: data.position,
            },
            notes: data.notes,
          }),
        })
        if (yoyoResponse.ok) {
          const result = await yoyoResponse.json()
          savedTests.push({ ...result.data, type: 'Yo-Yo IR1' })
        }
      }

      // Save 20m sprint if data provided
      if (data.sprint20m) {
        const sprintResponse = await fetch('/api/sport-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: data.clientId,
            testDate: data.testDate,
            category: 'SPEED',
            protocol: 'SPRINT_20M',
            sport: 'TEAM_FLOORBALL',
            rawData: {
              totalTime: data.sprint20m,
              position: data.position,
            },
            notes: data.notes,
          }),
        })
        if (sprintResponse.ok) {
          const result = await sprintResponse.json()
          savedTests.push({ ...result.data, type: '20m Sprint' })
        }
      }

      // Save 5-10-5 agility test if data provided
      if (data.agility) {
        const agilityResponse = await fetch('/api/sport-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: data.clientId,
            testDate: data.testDate,
            category: 'AGILITY',
            protocol: 'AGILITY_5_10_5',
            sport: 'TEAM_FLOORBALL',
            rawData: {
              totalTime: data.agility,
              position: data.position,
            },
            notes: data.notes,
          }),
        })
        if (agilityResponse.ok) {
          const result = await agilityResponse.json()
          savedTests.push({ ...result.data, type: '5-10-5 Agility' })
        }
      }

      // Save Standing Long Jump if data provided
      if (data.longJump) {
        const jumpResponse = await fetch('/api/sport-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: data.clientId,
            testDate: data.testDate,
            category: 'POWER',
            protocol: 'STANDING_LONG_JUMP',
            sport: 'TEAM_FLOORBALL',
            rawData: {
              jumpDistance: data.longJump,
              position: data.position,
            },
            notes: data.notes,
          }),
        })
        if (jumpResponse.ok) {
          const result = await jumpResponse.json()
          savedTests.push({ ...result.data, type: 'Langdhopp' })
        }
      }

      if (savedTests.length === 0) {
        throw new Error('Inga testresultat att spara. Fyll i minst ett test.')
      }

      setResults(savedTests)
      onTestSaved?.(savedTests)
    } catch (err) {
      console.error('Failed to save floorball tests:', err)
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
            <Trophy className="h-5 w-5 text-blue-500" />
            Innebandy - Testbatteri
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
                <Trophy className="h-5 w-5 text-blue-500" />
                Innebandy - Testbatteri
              </CardTitle>
              <CardDescription>
                Fysiska tester for innebandyspelare: Yo-Yo IR1, Sprint 20m, 5-10-5 Agility, Langdhopp
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
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(POSITION_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Jamfors mot elitreferensvarden for {POSITION_LABELS[position]}
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
              <TabsTrigger value="yoyo" className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Yo-Yo</span>
              </TabsTrigger>
              <TabsTrigger value="sprint" className="flex items-center gap-1">
                <Timer className="h-4 w-4" />
                <span className="hidden sm:inline">20m</span>
              </TabsTrigger>
              <TabsTrigger value="agility" className="flex items-center gap-1">
                <ArrowRight className="h-4 w-4" />
                <span className="hidden sm:inline">5-10-5</span>
              </TabsTrigger>
              <TabsTrigger value="jump" className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Hopp</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="yoyo">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Yo-Yo Intermittent Recovery Test (IR1)
                  </CardTitle>
                  <CardDescription>
                    Mater aerob kapacitet och aterhamtningsformaga
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="yoyoLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Niva</FormLabel>
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
                        Elitkrav for {POSITION_LABELS[position]}: {benchmarks.yoyoIR1.toFixed(1)}
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
                    <Timer className="h-5 w-5 text-yellow-500" />
                    20 meter Sprint
                  </CardTitle>
                  <CardDescription>
                    Mater maximal sprintsnabbhet
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
                            placeholder="ex: 3.05"
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
                        Elitkrav for {POSITION_LABELS[position]}: {benchmarks.sprint20m.toFixed(2)} s
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
                    <ArrowRight className="h-5 w-5 text-orange-500" />
                    5-10-5 Agility Test
                  </CardTitle>
                  <CardDescription>
                    Mater riktningsforandringsformaga och snabbhet
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="agility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tid (sekunder)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={3}
                            max={8}
                            step={0.01}
                            placeholder="ex: 4.5"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Sprint 5 yard, vand och spring 10 yard, vand och spring 5 yard
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {agility && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Resultat:</span>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${getBenchmarkClass(agility, benchmarks.agility, true)}`}>
                            {agility.toFixed(2)} s
                          </span>
                          <p className={`text-xs ${getBenchmarkClass(agility, benchmarks.agility, true)}`}>
                            {getBenchmarkLabel(agility, benchmarks.agility, true)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Elitkrav for {POSITION_LABELS[position]}: {benchmarks.agility.toFixed(2)} s
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="jump">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-purple-500" />
                    Staende langdhopp
                  </CardTitle>
                  <CardDescription>
                    Mater horisontell explosiv kraft
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="longJump"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hopplangd (cm)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={100}
                            max={350}
                            step={1}
                            placeholder="ex: 260"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {longJump && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Resultat:</span>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${getBenchmarkClass(longJump, benchmarks.longJump)}`}>
                            {longJump.toFixed(0)} cm
                          </span>
                          <p className={`text-xs ${getBenchmarkClass(longJump, benchmarks.longJump)}`}>
                            {getBenchmarkLabel(longJump, benchmarks.longJump)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Elitkrav for {POSITION_LABELS[position]}: {benchmarks.longJump} cm
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
