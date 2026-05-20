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
import { useLocale } from 'next-intl'
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

import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/GlassCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowUp, Zap, Timer, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { CompactResult } from '@/components/tests/shared/TestResultDisplay'
import { TestBenchmarkBadge } from '@/components/tests/shared/TestBenchmarkBadge'
import {
  calculateJumpPower,
  calculateRSI,
  classifyVerticalJump,
} from '@/lib/calculations/sport-tests/power-tests'

// Zod schemas for each jump type
const createBaseJumpSchema = (locale: string) => z.object({
  clientId: z.string().min(1, locale === 'sv' ? 'Välj en klient' : 'Select a client'),
  testDate: z.string().min(1, locale === 'sv' ? 'Välj testdatum' : 'Select a test date'),
  bodyWeight: z.number().min(30).max(200),
  notes: z.string().optional(),
})

const createCmjSchema = (locale: string) => createBaseJumpSchema(locale).extend({
  protocol: z.literal('VERTICAL_JUMP_CMJ'),
  jumpHeight: z.number().min(10).max(100),
  armSwing: z.boolean().optional(),
  attempts: z.number().min(1).max(5).optional(),
})

const createSjSchema = (locale: string) => createBaseJumpSchema(locale).extend({
  protocol: z.literal('VERTICAL_JUMP_SJ'),
  jumpHeight: z.number().min(10).max(90),
  squatDepth: z.number().min(60).max(120).optional(), // knee angle in degrees
  attempts: z.number().min(1).max(5).optional(),
})

const createDjSchema = (locale: string) => createBaseJumpSchema(locale).extend({
  protocol: z.literal('VERTICAL_JUMP_DJ'),
  jumpHeight: z.number().min(10).max(80),
  contactTime: z.number().min(100).max(500), // milliseconds
  dropHeight: z.number().min(20).max(60), // cm
  attempts: z.number().min(1).max(5).optional(),
})

type CMJFormData = z.infer<ReturnType<typeof createCmjSchema>>
type SJFormData = z.infer<ReturnType<typeof createSjSchema>>
type DJFormData = z.infer<ReturnType<typeof createDjSchema>>

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
  const locale = useLocale()
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
      if (!client) throw new Error(locale === 'sv' ? 'Klient hittades inte' : 'Client not found')

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
        throw new Error(errorData.error || (locale === 'sv' ? 'Misslyckades att spara test' : 'Failed to save test'))
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
      setError(err instanceof Error ? err.message : locale === 'sv' ? 'Ett fel uppstod' : 'An error occurred')
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
          <CMJForm clients={clients} onSubmit={handleSubmit} submitting={submitting} locale={locale} />
        </TabsContent>

        <TabsContent value="SJ">
          <SJForm clients={clients} onSubmit={handleSubmit} submitting={submitting} locale={locale} />
        </TabsContent>

        <TabsContent value="DJ">
          <DJForm clients={clients} onSubmit={handleSubmit} submitting={submitting} locale={locale} />
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && <JumpTestResult result={result} locale={locale} />}
    </div>
  )
}

// CMJ Form Component
function CMJForm({
  clients,
  onSubmit,
  submitting,
  locale,
}: {
  clients: Client[]
  onSubmit: (data: CMJFormData) => void
  submitting: boolean
  locale: string
}) {
  const form = useForm<CMJFormData>({
    resolver: zodResolver(createCmjSchema(locale)),
    defaultValues: {
      clientId: clients[0]?.id ?? '',
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

        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <ArrowUp className="h-5 w-5 text-slate-900 dark:text-white" />
              <span className="text-slate-900 dark:text-white">Counter Movement Jump (CMJ)</span>
            </GlassCardTitle>
            <GlassCardDescription className="text-slate-500 dark:text-slate-400">
              {locale === 'sv'
                ? 'Standard vertikalhopp med motrörelse. Mest använda hopptest för explosiv styrka.'
                : 'Standard countermovement vertical jump. The most common jump test for explosive power.'}
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-900 dark:text-white">{locale === 'sv' ? 'Klient' : 'Client'}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10">
                          <SelectValue placeholder={locale === 'sv' ? 'Välj klient' : 'Select client'} />
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
                    <FormLabel>{locale === 'sv' ? 'Testdatum' : 'Test date'}</FormLabel>
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
                    <FormLabel className="text-slate-900 dark:text-white">{locale === 'sv' ? 'Hopphöjd (cm)' : 'Jump height (cm)'}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={10}
                        max={100}
                        placeholder={locale === 'sv' ? 't.ex. 42.5' : 'e.g. 42.5'}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10"
                      />
                    </FormControl>
                    <FormDescription className="text-slate-500 dark:text-slate-400">
                      {locale === 'sv' ? 'Bästa hopp av alla försök' : 'Best jump across all attempts'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bodyWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-900 dark:text-white">{locale === 'sv' ? 'Kroppsvikt (kg)' : 'Body weight (kg)'}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={30}
                        max={200}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10"
                      />
                    </FormControl>
                    <FormDescription className="text-slate-500 dark:text-slate-400">
                      {locale === 'sv' ? 'Vikt vid testtillfället' : 'Weight at the time of testing'}
                    </FormDescription>
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
                    <FormLabel className="text-slate-900 dark:text-white">{locale === 'sv' ? 'Armsving' : 'Arm swing'}</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === 'true')}
                      value={field.value ? 'true' : 'false'}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="false">{locale === 'sv' ? 'Händer på höfterna' : 'Hands on hips'}</SelectItem>
                        <SelectItem value="true">{locale === 'sv' ? 'Med armsving' : 'With arm swing'}</SelectItem>
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
                    <FormLabel>{locale === 'sv' ? 'Antal försök' : 'Number of attempts'}</FormLabel>
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
                  {locale === 'sv' ? 'Beräknad effekt (Sayers formel)' : 'Estimated power (Sayers formula)'}
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
                  <FormLabel>{locale === 'sv' ? 'Anteckningar' : 'Notes'}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={locale === 'sv'
                        ? 'Eventuella observationer, teknik, uppvärmning...'
                        : 'Observations, technique, warm-up...'}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </GlassCardContent>
        </GlassCard>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting
            ? locale === 'sv' ? 'Sparar...' : 'Saving...'
            : locale === 'sv' ? 'Spara CMJ-test' : 'Save CMJ test'}
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
  locale,
}: {
  clients: Client[]
  onSubmit: (data: SJFormData) => void
  submitting: boolean
  locale: string
}) {
  const form = useForm<SJFormData>({
    resolver: zodResolver(createSjSchema(locale)),
    defaultValues: {
      clientId: clients[0]?.id ?? '',
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
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-slate-900 dark:text-white" />
              <span className="text-slate-900 dark:text-white">Squat Jump (SJ)</span>
            </GlassCardTitle>
            <GlassCardDescription className="text-slate-500 dark:text-slate-400">
              {locale === 'sv'
                ? 'Hopp från stillastående knäböjläge utan motrörelse. Mäter ren koncentrisk styrka.'
                : 'Jump from a static squat position without countermovement. Measures pure concentric strength.'}
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-900 dark:text-white">{locale === 'sv' ? 'Klient' : 'Client'}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10">
                          <SelectValue placeholder={locale === 'sv' ? 'Välj klient' : 'Select client'} />
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
                    <FormLabel className="text-slate-900 dark:text-white">{locale === 'sv' ? 'Testdatum' : 'Test date'}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10" />
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
                    <FormLabel className="text-slate-900 dark:text-white">{locale === 'sv' ? 'Hopphöjd (cm)' : 'Jump height (cm)'}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={10}
                        max={90}
                        placeholder={locale === 'sv' ? 't.ex. 38.0' : 'e.g. 38.0'}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10"
                      />
                    </FormControl>
                    <FormDescription className="text-slate-500 dark:text-slate-400">
                      {locale === 'sv' ? 'SJ är typiskt 5-10cm lägre än CMJ' : 'SJ is typically 5-10 cm lower than CMJ'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bodyWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-900 dark:text-white">{locale === 'sv' ? 'Kroppsvikt (kg)' : 'Body weight (kg)'}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={30}
                        max={200}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10"
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
                  <FormLabel className="text-slate-900 dark:text-white">{locale === 'sv' ? 'Knävinkel (grader)' : 'Knee angle (degrees)'}</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="90">90° (standard)</SelectItem>
                      <SelectItem value="80">{locale === 'sv' ? '80° (djupare)' : '80° (deeper)'}</SelectItem>
                      <SelectItem value="100">{locale === 'sv' ? '100° (grundare)' : '100° (shallower)'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-slate-500 dark:text-slate-400">
                    {locale === 'sv' ? 'Standardiserad knävinkel vid startposition' : 'Standardized knee angle in the start position'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {liveCalculation && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {locale === 'sv' ? 'Beräknad effekt' : 'Estimated power'}
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
                  <FormLabel className="text-slate-900 dark:text-white">{locale === 'sv' ? 'Anteckningar' : 'Notes'}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={locale === 'sv' ? 'Teknik, startposition, observationer...' : 'Technique, start position, observations...'}
                      {...field}
                      className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </GlassCardContent>
        </GlassCard>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting
            ? locale === 'sv' ? 'Sparar...' : 'Saving...'
            : locale === 'sv' ? 'Spara SJ-test' : 'Save SJ test'}
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
  locale,
}: {
  clients: Client[]
  onSubmit: (data: DJFormData) => void
  submitting: boolean
  locale: string
}) {
  const form = useForm<DJFormData>({
    resolver: zodResolver(createDjSchema(locale)),
    defaultValues: {
      clientId: clients[0]?.id ?? '',
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
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-slate-900 dark:text-white" />
              <span className="text-slate-900 dark:text-white">
                {locale === 'sv' ? 'Drop Jump (DJ) - Reaktiv styrka' : 'Drop Jump (DJ) - Reactive strength'}
              </span>
            </GlassCardTitle>
            <GlassCardDescription className="text-slate-500 dark:text-slate-400">
              {locale === 'sv'
                ? 'Hopp från upphöjning med minimal markkontakttid. Mäter Reactive Strength Index (RSI).'
                : 'Jump from a box with minimal ground contact time. Measures Reactive Strength Index (RSI).'}
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-900 dark:text-white">{locale === 'sv' ? 'Klient' : 'Client'}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10">
                          <SelectValue placeholder={locale === 'sv' ? 'Välj klient' : 'Select client'} />
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
                    <FormLabel className="text-slate-900 dark:text-white">{locale === 'sv' ? 'Testdatum' : 'Test date'}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10" />
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
                  <FormLabel className="text-slate-900 dark:text-white">{locale === 'sv' ? 'Dropphöjd (cm)' : 'Drop height (cm)'}</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10">
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
                  <FormDescription className="text-slate-500 dark:text-slate-400">
                    {locale === 'sv' ? 'Höjd på lådan/upphöjningen' : 'Height of the box/platform'}
                  </FormDescription>
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
                    <FormLabel className="text-slate-900 dark:text-white">{locale === 'sv' ? 'Hopphöjd (cm)' : 'Jump height (cm)'}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={10}
                        max={80}
                        placeholder={locale === 'sv' ? 't.ex. 35.0' : 'e.g. 35.0'}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10"
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
                    <FormLabel className="text-slate-900 dark:text-white">{locale === 'sv' ? 'Markkontakttid (ms)' : 'Ground contact time (ms)'}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={100}
                        max={500}
                        placeholder={locale === 'sv' ? 't.ex. 180' : 'e.g. 180'}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10"
                      />
                    </FormControl>
                    <FormDescription className="text-slate-500 dark:text-slate-400">
                      {locale === 'sv' ? 'Kontakttid i millisekunder' : 'Contact time in milliseconds'}
                    </FormDescription>
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
                  <FormLabel className="text-slate-900 dark:text-white">{locale === 'sv' ? 'Kroppsvikt (kg)' : 'Body weight (kg)'}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min={30}
                      max={200}
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10"
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
                  {locale === 'sv' ? 'Beräknade värden' : 'Calculated values'}
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {liveRSI && (
                    <div>
                      <p className="text-xs text-muted-foreground">RSI</p>
                      <span className="text-2xl font-bold text-primary">{liveRSI}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        {liveRSI >= 2.0
                          ? locale === 'sv' ? '(Bra)' : '(Good)'
                          : liveRSI >= 1.5
                            ? locale === 'sv' ? '(Medel)' : '(Average)'
                            : locale === 'sv' ? '(Utveckla)' : '(Develop)'}
                      </span>
                    </div>
                  )}
                  {liveCalculation && (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground">{locale === 'sv' ? 'Effekt' : 'Power'}</p>
                        <span className="text-2xl font-bold text-primary">
                          {liveCalculation.peakPower}
                        </span>
                        <span className="text-muted-foreground ml-1">W</span>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{locale === 'sv' ? 'Relativ' : 'Relative'}</p>
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
                  <FormLabel className="text-slate-900 dark:text-white">{locale === 'sv' ? 'Anteckningar' : 'Notes'}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={locale === 'sv'
                        ? 'Landningsteknik, styvhet, observationer...'
                        : 'Landing technique, stiffness, observations...'}
                      {...field}
                      className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </GlassCardContent>
        </GlassCard>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting
            ? locale === 'sv' ? 'Sparar...' : 'Saving...'
            : locale === 'sv' ? 'Spara DJ-test' : 'Save DJ test'}
        </Button>
      </form>
    </Form>
  )
}

// Result display component
function JumpTestResult({ result, locale }: { result: any; locale: string }) {
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
  const rsi =
    result.rawData?.contactTime && result.primaryResult
      ? calculateRSI(result.primaryResult, result.rawData.contactTime)
      : null

  return (
    <GlassCard className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10 backdrop-blur-sm">
      <GlassCardHeader>
        <GlassCardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
          <CheckCircle className="h-5 w-5" />
          {locale === 'sv' ? 'Test sparat' : 'Test saved'}
        </GlassCardTitle>
        <GlassCardDescription className="text-green-600/80 dark:text-green-400/80">
          {result.client?.name} - {new Date(result.testDate).toLocaleDateString(dateLocale)}
        </GlassCardDescription>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CompactResult
            label={locale === 'sv' ? 'Hopphöjd' : 'Jump height'}
            value={result.primaryResult}
            unit="cm"
            tier={result.tier}
          />
          <CompactResult
            label={locale === 'sv' ? 'Effekt' : 'Power'}
            value={result.calculatedPower?.peakPower || result.peakPower}
            unit="W"
          />
          <CompactResult
            label={locale === 'sv' ? 'Relativ effekt' : 'Relative power'}
            value={result.calculatedPower?.relativePower || result.relativePower}
            unit="W/kg"
          />
          {rsi && <CompactResult label="RSI" value={rsi} />}
        </div>

        {result.tier && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{locale === 'sv' ? 'Prestandanivå:' : 'Performance level:'}</span>
            <TestBenchmarkBadge tier={result.tier} />
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
