'use client'

/**
 * Vertical Jump Test Form
 *
 * Supports three vertical jump protocols:
 * - CMJ (Counter Movement Jump) - Most common
 * - SJ (Squat Jump) - No counter movement
 * - DJ (Drop Jump) - For reactive strength (RSI)
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowUp, Zap, Timer, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { TestResultDisplay, CompactResult } from '@/components/tests/shared/TestResultDisplay'
import { TestBenchmarkBadge, type BenchmarkTier } from '@/components/tests/shared/TestBenchmarkBadge'
import {
  calculateJumpPower,
  calculateRSI,
  calculateFlightTime,
  classifyVerticalJump,
  type JumpPowerFormula,
} from '@/lib/calculations/sport-tests/power-tests'

// Zod schemas for each jump type
const baseJumpSchema = z.object({
  clientId: z.string().min(1, 'Välj en klient'),
  testDate: z.string().min(1, 'Välj testdatum'),
  bodyWeight: z.number().min(30).max(200),
  notes: z.string().optional(),
})

const cmjSchema = baseJumpSchema.extend({
  protocol: z.literal('VERTICAL_JUMP_CMJ'),
  jumpHeight: z.number().min(10).max(100),
  armSwing: z.boolean().optional(),
  attempts: z.number().min(1).max(5).optional(),
})

const sjSchema = baseJumpSchema.extend({
  protocol: z.literal('VERTICAL_JUMP_SJ'),
  jumpHeight: z.number().min(10).max(90),
  squatDepth: z.number().min(60).max(120).optional(), // knee angle in degrees
  attempts: z.number().min(1).max(5).optional(),
})

const djSchema = baseJumpSchema.extend({
  protocol: z.literal('VERTICAL_JUMP_DJ'),
  jumpHeight: z.number().min(10).max(80),
  contactTime: z.number().min(100).max(500), // milliseconds
  dropHeight: z.number().min(20).max(60), // cm
  attempts: z.number().min(1).max(5).optional(),
})

type CMJFormData = z.infer<typeof cmjSchema>
type SJFormData = z.infer<typeof sjSchema>
type DJFormData = z.infer<typeof djSchema>

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface VerticalJumpFormProps {
  clients: Client[]
  onTestSaved?: (test: any) => void
}

type JumpType = 'CMJ' | 'SJ' | 'DJ'

export function VerticalJumpForm({ clients, onTestSaved }: VerticalJumpFormProps) {
  const [jumpType, setJumpType] = useState<JumpType>('CMJ')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(data: CMJFormData | SJFormData | DJFormData) {
    setSubmitting(true)
    setResult(null)
    setError(null)

    try {
      const client = clients.find((c) => c.id === data.clientId)
      if (!client) throw new Error('Klient hittades inte')

      // Calculate derived metrics
      const power = calculateJumpPower(data.jumpHeight, data.bodyWeight)
      const tier = classifyVerticalJump(
        data.jumpHeight,
        client.gender
      )

      // Prepare raw data based on protocol
      const rawData: Record<string, unknown> = {
        jumpHeight: data.jumpHeight,
        bodyWeight: data.bodyWeight,
      }

      if (data.protocol === 'VERTICAL_JUMP_CMJ') {
        rawData.armSwing = (data as CMJFormData).armSwing
        rawData.attempts = (data as CMJFormData).attempts
      } else if (data.protocol === 'VERTICAL_JUMP_SJ') {
        rawData.squatDepth = (data as SJFormData).squatDepth
        rawData.attempts = (data as SJFormData).attempts
      } else if (data.protocol === 'VERTICAL_JUMP_DJ') {
        rawData.contactTime = (data as DJFormData).contactTime
        rawData.dropHeight = (data as DJFormData).dropHeight
        rawData.attempts = (data as DJFormData).attempts
      }

      const response = await fetch('/api/sport-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: data.clientId,
          testDate: data.testDate,
          category: 'POWER',
          protocol: data.protocol,
          sport: 'GENERAL_FITNESS',
          rawData,
          notes: data.notes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Misslyckades att spara test')
      }

      const resultData = await response.json()

      // Add calculated values to result
      setResult({
        ...resultData.data,
        calculatedPower: power,
        tier,
        client,
      })

      onTestSaved?.(resultData.data)
    } catch (err) {
      console.error('Failed to save vertical jump test:', err)
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={jumpType} onValueChange={(v) => setJumpType(v as JumpType)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="CMJ" className="flex items-center gap-2">
            <ArrowUp className="h-4 w-4" />
            CMJ
          </TabsTrigger>
          <TabsTrigger value="SJ" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            SJ
          </TabsTrigger>
          <TabsTrigger value="DJ" className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            DJ (RSI)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="CMJ">
          <CMJForm clients={clients} onSubmit={handleSubmit} submitting={submitting} />
        </TabsContent>

        <TabsContent value="SJ">
          <SJForm clients={clients} onSubmit={handleSubmit} submitting={submitting} />
        </TabsContent>

        <TabsContent value="DJ">
          <DJForm clients={clients} onSubmit={handleSubmit} submitting={submitting} />
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && <JumpTestResult result={result} />}
    </div>
  )
}

// CMJ Form Component
function CMJForm({
  clients,
  onSubmit,
  submitting,
}: {
  clients: Client[]
  onSubmit: (data: CMJFormData) => void
  submitting: boolean
}) {
  const form = useForm<CMJFormData>({
    resolver: zodResolver(cmjSchema),
    defaultValues: {
      protocol: 'VERTICAL_JUMP_CMJ',
      testDate: new Date().toISOString().split('T')[0],
      armSwing: false,
      attempts: 3,
    },
  })

  const selectedClient = clients.find((c) => c.id === form.watch('clientId'))

  // Auto-fill body weight when client is selected
  useEffect(() => {
    if (selectedClient?.weight) {
      form.setValue('bodyWeight', selectedClient.weight)
    }
  }, [selectedClient, form])

  const jumpHeight = form.watch('jumpHeight')
  const bodyWeight = form.watch('bodyWeight')

  // Live calculation preview
  const liveCalculation =
    jumpHeight && bodyWeight ? calculateJumpPower(jumpHeight, bodyWeight) : null

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUp className="h-5 w-5" />
              Counter Movement Jump (CMJ)
            </CardTitle>
            <CardDescription>
              Standard vertikalhopp med motrörelse. Mest använda hopptest för explosiv styrka.
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
                name="jumpHeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hopphöjd (cm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={10}
                        max={100}
                        placeholder="t.ex. 42.5"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>Bästa hopp av alla försök</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bodyWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kroppsvikt (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={30}
                        max={200}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>Vikt vid testtillfället</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="armSwing"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Armsving</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === 'true')}
                      value={field.value ? 'true' : 'false'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="false">Händer på höfterna</SelectItem>
                        <SelectItem value="true">Med armsving</SelectItem>
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
            </div>

            {/* Live calculation preview */}
            {liveCalculation && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Beräknad effekt (Sayers formel)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-2xl font-bold text-primary">
                      {liveCalculation.peakPower}
                    </span>
                    <span className="text-muted-foreground ml-1">W</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-primary">
                      {liveCalculation.relativePower}
                    </span>
                    <span className="text-muted-foreground ml-1">W/kg</span>
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
                      placeholder="Eventuella observationer, teknik, uppvärmning..."
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
          {submitting ? 'Sparar...' : 'Spara CMJ-test'}
        </Button>
      </form>
    </Form>
  )
}

// SJ Form Component
function SJForm({
  clients,
  onSubmit,
  submitting,
}: {
  clients: Client[]
  onSubmit: (data: SJFormData) => void
  submitting: boolean
}) {
  const form = useForm<SJFormData>({
    resolver: zodResolver(sjSchema),
    defaultValues: {
      protocol: 'VERTICAL_JUMP_SJ',
      testDate: new Date().toISOString().split('T')[0],
      squatDepth: 90,
      attempts: 3,
    },
  })

  const selectedClient = clients.find((c) => c.id === form.watch('clientId'))

  useEffect(() => {
    if (selectedClient?.weight) {
      form.setValue('bodyWeight', selectedClient.weight)
    }
  }, [selectedClient, form])

  const jumpHeight = form.watch('jumpHeight')
  const bodyWeight = form.watch('bodyWeight')
  const liveCalculation =
    jumpHeight && bodyWeight ? calculateJumpPower(jumpHeight, bodyWeight) : null

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Squat Jump (SJ)
            </CardTitle>
            <CardDescription>
              Hopp från stillastående knäböjläge utan motrörelse. Mäter ren koncentrisk styrka.
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
                name="jumpHeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hopphöjd (cm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={10}
                        max={90}
                        placeholder="t.ex. 38.0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>SJ är typiskt 5-10cm lägre än CMJ</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bodyWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kroppsvikt (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={30}
                        max={200}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="squatDepth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Knävinkel (grader)</FormLabel>
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
                      <SelectItem value="90">90° (standard)</SelectItem>
                      <SelectItem value="80">80° (djupare)</SelectItem>
                      <SelectItem value="100">100° (grundare)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Standardiserad knävinkel vid startposition</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {liveCalculation && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Beräknad effekt
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-2xl font-bold text-primary">
                      {liveCalculation.peakPower}
                    </span>
                    <span className="text-muted-foreground ml-1">W</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-primary">
                      {liveCalculation.relativePower}
                    </span>
                    <span className="text-muted-foreground ml-1">W/kg</span>
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
                    <Textarea placeholder="Teknik, startposition, observationer..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Sparar...' : 'Spara SJ-test'}
        </Button>
      </form>
    </Form>
  )
}

// DJ Form Component
function DJForm({
  clients,
  onSubmit,
  submitting,
}: {
  clients: Client[]
  onSubmit: (data: DJFormData) => void
  submitting: boolean
}) {
  const form = useForm<DJFormData>({
    resolver: zodResolver(djSchema),
    defaultValues: {
      protocol: 'VERTICAL_JUMP_DJ',
      testDate: new Date().toISOString().split('T')[0],
      dropHeight: 40,
      attempts: 3,
    },
  })

  const selectedClient = clients.find((c) => c.id === form.watch('clientId'))

  useEffect(() => {
    if (selectedClient?.weight) {
      form.setValue('bodyWeight', selectedClient.weight)
    }
  }, [selectedClient, form])

  const jumpHeight = form.watch('jumpHeight')
  const contactTime = form.watch('contactTime')
  const bodyWeight = form.watch('bodyWeight')

  const liveCalculation =
    jumpHeight && bodyWeight ? calculateJumpPower(jumpHeight, bodyWeight) : null
  const liveRSI = jumpHeight && contactTime ? calculateRSI(jumpHeight, contactTime) : null

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Drop Jump (DJ) - Reaktiv styrka
            </CardTitle>
            <CardDescription>
              Hopp från upphöjning med minimal markkontakttid. Mäter Reactive Strength Index (RSI).
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
              name="dropHeight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dropphöjd (cm)</FormLabel>
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
                      <SelectItem value="20">20 cm</SelectItem>
                      <SelectItem value="30">30 cm</SelectItem>
                      <SelectItem value="40">40 cm (standard)</SelectItem>
                      <SelectItem value="50">50 cm</SelectItem>
                      <SelectItem value="60">60 cm</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Höjd på lådan/upphöjningen</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="jumpHeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hopphöjd (cm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={10}
                        max={80}
                        placeholder="t.ex. 35.0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Markkontakttid (ms)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={100}
                        max={500}
                        placeholder="t.ex. 180"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>Kontakttid i millisekunder</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bodyWeight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kroppsvikt (kg)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min={30}
                      max={200}
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Live RSI calculation */}
            {(liveRSI || liveCalculation) && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Beräknade värden
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {liveRSI && (
                    <div>
                      <p className="text-xs text-muted-foreground">RSI</p>
                      <span className="text-2xl font-bold text-primary">{liveRSI}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        {liveRSI >= 2.0 ? '(Bra)' : liveRSI >= 1.5 ? '(Medel)' : '(Utveckla)'}
                      </span>
                    </div>
                  )}
                  {liveCalculation && (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground">Effekt</p>
                        <span className="text-2xl font-bold text-primary">
                          {liveCalculation.peakPower}
                        </span>
                        <span className="text-muted-foreground ml-1">W</span>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Relativ</p>
                        <span className="text-2xl font-bold text-primary">
                          {liveCalculation.relativePower}
                        </span>
                        <span className="text-muted-foreground ml-1">W/kg</span>
                      </div>
                    </>
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
                      placeholder="Landningsteknik, styvhet, observationer..."
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
          {submitting ? 'Sparar...' : 'Spara DJ-test'}
        </Button>
      </form>
    </Form>
  )
}

// Result display component
function JumpTestResult({ result }: { result: any }) {
  const rsi =
    result.rawData?.contactTime && result.primaryResult
      ? calculateRSI(result.primaryResult, result.rawData.contactTime)
      : null

  return (
    <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
          <CheckCircle className="h-5 w-5" />
          Test sparat
        </CardTitle>
        <CardDescription>
          {result.client?.name} - {new Date(result.testDate).toLocaleDateString('sv-SE')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CompactResult
            label="Hopphöjd"
            value={result.primaryResult}
            unit="cm"
            tier={result.tier}
          />
          <CompactResult
            label="Effekt"
            value={result.calculatedPower?.peakPower || result.peakPower}
            unit="W"
          />
          <CompactResult
            label="Relativ effekt"
            value={result.calculatedPower?.relativePower || result.relativePower}
            unit="W/kg"
          />
          {rsi && <CompactResult label="RSI" value={rsi} />}
        </div>

        {result.tier && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Prestandanivå:</span>
            <TestBenchmarkBadge tier={result.tier} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
