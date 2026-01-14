'use client'

/**
 * Ice Hockey Test Battery Form
 *
 * Standard ice hockey physical test battery (off-ice):
 * - Yo-Yo IR1 (Off-ice endurance)
 * - 30m Sprint (Off-ice speed)
 * - Pro Agility 5-10-5 (Lateral movement)
 * - CMJ (Explosive power)
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
import { Trophy, CheckCircle, AlertTriangle, Activity, Timer, Zap, ArrowLeftRight } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const hockeyTestSchema = z.object({
  clientId: z.string().min(1, 'Välj en klient'),
  testDate: z.string().min(1, 'Välj testdatum'),
  position: z.enum(['goalie', 'defenseman', 'center', 'winger']),
  // Yo-Yo IR1
  yoyoLevel: z.number().min(5).max(23).optional(),
  yoyoShuttle: z.number().min(1).max(16).optional(),
  // Sprint test
  sprint30m: z.number().min(3).max(6).optional(),
  // Pro Agility 5-10-5
  proAgility: z.number().min(3).max(7).optional(),
  // CMJ
  cmjHeight: z.number().min(15).max(80).optional(),
  notes: z.string().optional(),
})

type HockeyTestFormData = z.infer<typeof hockeyTestSchema>

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface HockeyTestBatteryFormProps {
  clients: Client[]
  onTestSaved?: (tests: any[]) => void
}

const POSITION_LABELS: Record<string, string> = {
  goalie: 'Målvakt',
  defenseman: 'Back',
  center: 'Center',
  winger: 'Ytterforward',
}

// Position-specific benchmarks (elite level)
const POSITION_BENCHMARKS: Record<string, { yoyoIR1: number; sprint30m: number; proAgility: number; cmj: number }> = {
  goalie: { yoyoIR1: 16.5, sprint30m: 4.40, proAgility: 4.6, cmj: 42 },
  defenseman: { yoyoIR1: 18.5, sprint30m: 4.20, proAgility: 4.3, cmj: 48 },
  center: { yoyoIR1: 19.5, sprint30m: 4.15, proAgility: 4.2, cmj: 50 },
  winger: { yoyoIR1: 19.0, sprint30m: 4.10, proAgility: 4.1, cmj: 52 },
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

export function HockeyTestBatteryForm({ clients, onTestSaved }: HockeyTestBatteryFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('yoyo')

  const form = useForm<HockeyTestFormData>({
    resolver: zodResolver(hockeyTestSchema),
    defaultValues: {
      testDate: new Date().toISOString().split('T')[0],
      position: 'center',
    },
  })

  const selectedClient = clients.find((c) => c.id === form.watch('clientId'))
  const position = form.watch('position')
  const benchmarks = POSITION_BENCHMARKS[position] || POSITION_BENCHMARKS.center

  // Watch values for live comparison
  const yoyoLevel = form.watch('yoyoLevel')
  const sprint30m = form.watch('sprint30m')
  const proAgility = form.watch('proAgility')
  const cmjHeight = form.watch('cmjHeight')

  async function handleSubmit(data: HockeyTestFormData) {
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
            sport: 'TEAM_ICE_HOCKEY',
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

      // Save 30m sprint if data provided
      if (data.sprint30m) {
        const sprint30Response = await fetch('/api/sport-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: data.clientId,
            testDate: data.testDate,
            category: 'SPEED',
            protocol: 'SPRINT_30M',
            sport: 'TEAM_ICE_HOCKEY',
            rawData: {
              totalTime: data.sprint30m,
              position: data.position,
            },
            notes: data.notes,
          }),
        })
        if (sprint30Response.ok) {
          const result = await sprint30Response.json()
          savedTests.push({ ...result.data, type: '30m Sprint' })
        }
      }

      // Save Pro Agility 5-10-5 if data provided
      if (data.proAgility) {
        const proAgilityResponse = await fetch('/api/sport-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: data.clientId,
            testDate: data.testDate,
            category: 'AGILITY',
            protocol: 'PRO_AGILITY_5_10_5',
            sport: 'TEAM_ICE_HOCKEY',
            rawData: {
              totalTime: data.proAgility,
              position: data.position,
            },
            notes: data.notes,
          }),
        })
        if (proAgilityResponse.ok) {
          const result = await proAgilityResponse.json()
          savedTests.push({ ...result.data, type: 'Pro Agility 5-10-5' })
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
            sport: 'TEAM_ICE_HOCKEY',
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

      if (savedTests.length === 0) {
        throw new Error('Inga testresultat att spara. Fyll i minst ett test.')
      }

      setResults(savedTests)
      onTestSaved?.(savedTests)
    } catch (err) {
      console.error('Failed to save hockey tests:', err)
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
            <Trophy className="h-5 w-5 text-cyan-500" />
            Ishockey - Testbatteri
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
                <Trophy className="h-5 w-5 text-cyan-500" />
                Ishockey - Testbatteri
              </CardTitle>
              <CardDescription>
                Fysiska tester för ishockeyspelare (off-ice): Yo-Yo IR1, Sprint 30m, Pro Agility 5-10-5, CMJ
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
                        Jämförs mot elitreferensvärden för {POSITION_LABELS[position]}
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
              <TabsTrigger value="sprint30" className="flex items-center gap-1">
                <Timer className="h-4 w-4" />
                <span className="hidden sm:inline">30m</span>
              </TabsTrigger>
              <TabsTrigger value="proagility" className="flex items-center gap-1">
                <ArrowLeftRight className="h-4 w-4" />
                <span className="hidden sm:inline">5-10-5</span>
              </TabsTrigger>
              <TabsTrigger value="cmj" className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">CMJ</span>
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
                    Mäter aerob kapacitet och återhämtningsförmåga (off-ice)
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
                        Elitkrav för {POSITION_LABELS[position]}: {benchmarks.yoyoIR1.toFixed(1)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sprint30">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Timer className="h-5 w-5 text-orange-500" />
                    30 meter Sprint
                  </CardTitle>
                  <CardDescription>
                    Mäter maximal sprintsnabbhet (off-ice)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="sprint30m"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tid (sekunder)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={3}
                            max={6}
                            step={0.01}
                            placeholder="ex: 4.15"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {sprint30m && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Resultat:</span>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${getBenchmarkClass(sprint30m, benchmarks.sprint30m, true)}`}>
                            {sprint30m.toFixed(2)} s
                          </span>
                          <p className={`text-xs ${getBenchmarkClass(sprint30m, benchmarks.sprint30m, true)}`}>
                            {getBenchmarkLabel(sprint30m, benchmarks.sprint30m, true)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Elitkrav för {POSITION_LABELS[position]}: {benchmarks.sprint30m.toFixed(2)} s
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="proagility">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ArrowLeftRight className="h-5 w-5 text-cyan-500" />
                    Pro Agility 5-10-5
                  </CardTitle>
                  <CardDescription>
                    Mäter lateral rörlighet och riktningsförändringar
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
                            placeholder="ex: 4.20"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription>
                          5 yards - 10 yards - 5 yards shuttle run
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
                        Elitkrav för {POSITION_LABELS[position]}: {benchmarks.proAgility.toFixed(2)} s
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
                    Mäter explosiv benstyrka
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="cmjHeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hopphöjd (cm)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={15}
                            max={80}
                            step={0.5}
                            placeholder="ex: 48"
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
                        Elitkrav för {POSITION_LABELS[position]}: {benchmarks.cmj} cm
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
