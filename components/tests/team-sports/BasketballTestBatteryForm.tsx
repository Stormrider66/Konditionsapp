'use client'

/**
 * Basketball Test Battery Form
 *
 * Standard basketball physical test battery:
 * - Yo-Yo IR1 (Endurance)
 * - CMJ / Vertical Jump (Explosive power)
 * - Lane Agility Test (Basketball-specific agility)
 * - 20m Sprint (Speed)
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
import { Trophy, CheckCircle, AlertTriangle, Activity, Timer, Zap, Move } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const basketballTestSchema = z.object({
  clientId: z.string().min(1, 'Valj en klient'),
  testDate: z.string().min(1, 'Valj testdatum'),
  position: z.enum(['point_guard', 'shooting_guard', 'small_forward', 'power_forward', 'center']),
  // Yo-Yo IR1
  yoyoLevel: z.number().min(5).max(23).optional(),
  yoyoShuttle: z.number().min(1).max(16).optional(),
  // CMJ
  cmjHeight: z.number().min(15).max(100).optional(),
  // Lane Agility
  laneAgility: z.number().min(8).max(16).optional(),
  // 20m Sprint
  sprint20m: z.number().min(2).max(5).optional(),
  notes: z.string().optional(),
})

type BasketballTestFormData = z.infer<typeof basketballTestSchema>

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface BasketballTestBatteryFormProps {
  clients: Client[]
  onTestSaved?: (tests: any[]) => void
}

const POSITION_LABELS: Record<string, string> = {
  point_guard: 'Spelvandare',
  shooting_guard: 'Shooting guard',
  small_forward: 'Liten forward',
  power_forward: 'Stor forward',
  center: 'Center',
}

// Position-specific benchmarks (elite level)
const POSITION_BENCHMARKS: Record<string, { yoyoIR1: number; cmj: number; laneAgility: number; sprint20m: number }> = {
  point_guard: { yoyoIR1: 20.0, cmj: 55, laneAgility: 10.5, sprint20m: 2.90 },
  shooting_guard: { yoyoIR1: 19.5, cmj: 58, laneAgility: 10.8, sprint20m: 2.92 },
  small_forward: { yoyoIR1: 19.0, cmj: 60, laneAgility: 11.0, sprint20m: 2.95 },
  power_forward: { yoyoIR1: 18.5, cmj: 58, laneAgility: 11.2, sprint20m: 3.00 },
  center: { yoyoIR1: 17.5, cmj: 55, laneAgility: 11.5, sprint20m: 3.10 },
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

export function BasketballTestBatteryForm({ clients, onTestSaved }: BasketballTestBatteryFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('yoyo')

  const form = useForm<BasketballTestFormData>({
    resolver: zodResolver(basketballTestSchema),
    defaultValues: {
      testDate: new Date().toISOString().split('T')[0],
      position: 'point_guard',
    },
  })

  const selectedClient = clients.find((c) => c.id === form.watch('clientId'))
  const position = form.watch('position')
  const benchmarks = POSITION_BENCHMARKS[position] || POSITION_BENCHMARKS.point_guard

  // Watch values for live comparison
  const yoyoLevel = form.watch('yoyoLevel')
  const cmjHeight = form.watch('cmjHeight')
  const laneAgility = form.watch('laneAgility')
  const sprint20m = form.watch('sprint20m')

  async function handleSubmit(data: BasketballTestFormData) {
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
            sport: 'TEAM_BASKETBALL',
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
            sport: 'TEAM_BASKETBALL',
            rawData: {
              jumpHeight: data.cmjHeight,
              position: data.position,
            },
            notes: data.notes,
          }),
        })
        if (cmjResponse.ok) {
          const result = await cmjResponse.json()
          savedTests.push({ ...result.data, type: 'CMJ' })
        }
      }

      // Save Lane Agility if data provided
      if (data.laneAgility) {
        const laneAgilityResponse = await fetch('/api/sport-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: data.clientId,
            testDate: data.testDate,
            category: 'AGILITY',
            protocol: 'LANE_AGILITY',
            sport: 'TEAM_BASKETBALL',
            rawData: {
              time: data.laneAgility,
              position: data.position,
            },
            notes: data.notes,
          }),
        })
        if (laneAgilityResponse.ok) {
          const result = await laneAgilityResponse.json()
          savedTests.push({ ...result.data, type: 'Lane Agility' })
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
            sport: 'TEAM_BASKETBALL',
            rawData: {
              totalTime: data.sprint20m,
              position: data.position,
            },
            notes: data.notes,
          }),
        })
        if (sprint20Response.ok) {
          const result = await sprint20Response.json()
          savedTests.push({ ...result.data, type: '20m Sprint' })
        }
      }

      if (savedTests.length === 0) {
        throw new Error('Inga testresultat att spara. Fyll i minst ett test.')
      }

      setResults(savedTests)
      onTestSaved?.(savedTests)
    } catch (err) {
      console.error('Failed to save basketball tests:', err)
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
            <Trophy className="h-5 w-5 text-orange-500" />
            Basket - Testbatteri
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
                <Trophy className="h-5 w-5 text-orange-500" />
                Basket - Testbatteri
              </CardTitle>
              <CardDescription>
                Fysiska tester for basketspelare: Yo-Yo IR1, CMJ, Lane Agility, 20m Sprint
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
                <span className="hidden sm:inline">Yo-Yo IR1</span>
              </TabsTrigger>
              <TabsTrigger value="cmj" className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">CMJ</span>
              </TabsTrigger>
              <TabsTrigger value="laneagility" className="flex items-center gap-1">
                <Move className="h-4 w-4" />
                <span className="hidden sm:inline">Lane Agility</span>
              </TabsTrigger>
              <TabsTrigger value="sprint20" className="flex items-center gap-1">
                <Timer className="h-4 w-4" />
                <span className="hidden sm:inline">20m</span>
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
                    Mater aerob kapacitet och aterhaltningsformaga
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
                              placeholder="ex: 17"
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

            <TabsContent value="cmj">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-purple-500" />
                    Counter Movement Jump (CMJ)
                  </CardTitle>
                  <CardDescription>
                    Mater explosiv benstyrka och vertikalt hopp
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
                            max={100}
                            step={0.5}
                            placeholder="ex: 55"
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
                        Elitkrav for {POSITION_LABELS[position]}: {benchmarks.cmj} cm
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="laneagility">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Move className="h-5 w-5 text-orange-500" />
                    Lane Agility Test
                  </CardTitle>
                  <CardDescription>
                    Mater basketspecifik smidighet och laterala rorelser
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="laneAgility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tid (sekunder)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={8}
                            max={16}
                            step={0.01}
                            placeholder="ex: 10.5"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Tid for att genomfora NBA Lane Agility Drill
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {laneAgility && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Resultat:</span>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${getBenchmarkClass(laneAgility, benchmarks.laneAgility, true)}`}>
                            {laneAgility.toFixed(2)} s
                          </span>
                          <p className={`text-xs ${getBenchmarkClass(laneAgility, benchmarks.laneAgility, true)}`}>
                            {getBenchmarkLabel(laneAgility, benchmarks.laneAgility, true)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Elitkrav for {POSITION_LABELS[position]}: {benchmarks.laneAgility.toFixed(2)} s
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sprint20">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Timer className="h-5 w-5 text-yellow-500" />
                    20 meter Sprint
                  </CardTitle>
                  <CardDescription>
                    Mater sprintsnabbhet och acceleration
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
                            placeholder="ex: 2.95"
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
