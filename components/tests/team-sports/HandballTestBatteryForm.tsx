'use client'

/**
 * Handball Test Battery Form
 *
 * Standard handball physical test battery:
 * - Yo-Yo IR1 (Endurance)
 * - 10m Sprint (Acceleration)
 * - CMJ (Explosive power)
 * - Medicine Ball Throw (Upper body power)
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
import { Trophy, CheckCircle, AlertTriangle, Activity, Timer, Zap, Circle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLocale } from '@/i18n/client'

type AppLocale = 'en' | 'sv'

const createHandballTestSchema = (locale: AppLocale) => z.object({
  clientId: z.string().min(1, locale === 'sv' ? 'Välj en klient' : 'Select a client'),
  testDate: z.string().min(1, locale === 'sv' ? 'Välj testdatum' : 'Select a test date'),
  position: z.enum(['goalkeeper', 'wing', 'back', 'center_back', 'pivot']),
  // Yo-Yo IR1
  yoyoLevel: z.number().min(5).max(23).optional(),
  yoyoShuttle: z.number().min(1).max(16).optional(),
  // Sprint test
  sprint10m: z.number().min(1).max(3).optional(),
  // CMJ
  cmjHeight: z.number().min(15).max(80).optional(),
  // Medicine Ball
  medicineBallThrow: z.number().min(3).max(20).optional(),
  notes: z.string().optional(),
})

type HandballTestFormData = z.infer<ReturnType<typeof createHandballTestSchema>>

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface HandballTestBatteryFormProps {
  clients: Client[]
  onTestSaved?: (tests: any[]) => void
}

const POSITION_LABELS: Record<string, Record<AppLocale, string>> = {
  goalkeeper: { sv: 'Målvakt', en: 'Goalkeeper' },
  wing: { sv: 'Kantspelare', en: 'Wing' },
  back: { sv: 'Nia', en: 'Back' },
  center_back: { sv: 'Mittnia/Playmaker', en: 'Center back/playmaker' },
  pivot: { sv: 'Linjespelare/Pivot', en: 'Pivot' },
}

// Position-specific benchmarks (elite level)
const POSITION_BENCHMARKS: Record<string, { yoyoIR1: number; sprint10m: number; cmj: number; medicineBall: number }> = {
  goalkeeper: { yoyoIR1: 17.5, sprint10m: 1.75, cmj: 45, medicineBall: 12.0 },
  wing: { yoyoIR1: 20.5, sprint10m: 1.65, cmj: 50, medicineBall: 11.5 },
  back: { yoyoIR1: 19.5, sprint10m: 1.68, cmj: 52, medicineBall: 14.0 },
  center_back: { yoyoIR1: 20.0, sprint10m: 1.70, cmj: 48, medicineBall: 12.5 },
  pivot: { yoyoIR1: 18.5, sprint10m: 1.72, cmj: 46, medicineBall: 13.5 },
}

function getBenchmarkClass(actual: number | undefined, target: number, lowerIsBetter = false): string {
  if (!actual) return 'text-muted-foreground'
  if (lowerIsBetter) {
    return actual <= target ? 'text-green-600' : 'text-orange-500'
  }
  return actual >= target ? 'text-green-600' : 'text-orange-500'
}

function getPositionLabel(position: string, locale: AppLocale): string {
  return POSITION_LABELS[position]?.[locale] ?? position
}

function getBenchmarkLabel(locale: AppLocale, actual: number | undefined, target: number, lowerIsBetter = false): string {
  if (!actual) return '-'
  const percentage = lowerIsBetter
    ? Math.round((target / actual) * 100)
    : Math.round((actual / target) * 100)
  return locale === 'sv' ? `${percentage}% av elit` : `${percentage}% of elite`
}

export function HandballTestBatteryForm({ clients, onTestSaved }: HandballTestBatteryFormProps) {
  const rawLocale = useLocale()
  const locale: AppLocale = rawLocale === 'sv' ? 'sv' : 'en'
  const t = (sv: string, en: string) => (locale === 'sv' ? sv : en)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('yoyo')

  const form = useForm<HandballTestFormData>({
    resolver: zodResolver(createHandballTestSchema(locale)),
    defaultValues: {
      testDate: new Date().toISOString().split('T')[0],
      position: 'back',
    },
  })

  const position = form.watch('position')
  const benchmarks = POSITION_BENCHMARKS[position] || POSITION_BENCHMARKS.back

  // Watch values for live comparison
  const yoyoLevel = form.watch('yoyoLevel')
  const sprint10m = form.watch('sprint10m')
  const cmjHeight = form.watch('cmjHeight')
  const medicineBallThrow = form.watch('medicineBallThrow')

  async function handleSubmit(data: HandballTestFormData) {
    setSubmitting(true)
    setResults([])
    setError(null)

    try {
      const client = clients.find((c) => c.id === data.clientId)
      if (!client) throw new Error(t('Klient hittades inte', 'Client not found'))

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
            sport: 'TEAM_HANDBALL',
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

      // Save 10m sprint if data provided
      if (data.sprint10m) {
        const sprintResponse = await fetch('/api/sport-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: data.clientId,
            testDate: data.testDate,
            category: 'SPEED',
            protocol: 'SPRINT_10M',
            sport: 'TEAM_HANDBALL',
            rawData: {
              totalTime: data.sprint10m,
              position: data.position,
            },
            notes: data.notes,
          }),
        })
        if (sprintResponse.ok) {
          const result = await sprintResponse.json()
          savedTests.push({ ...result.data, type: '10m Sprint' })
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
            sport: 'TEAM_HANDBALL',
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

      // Save Medicine Ball throw if data provided
      if (data.medicineBallThrow) {
        const mbResponse = await fetch('/api/sport-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: data.clientId,
            testDate: data.testDate,
            category: 'POWER',
            protocol: 'MEDICINE_BALL_THROW',
            sport: 'TEAM_HANDBALL',
            rawData: {
              throwDistance: data.medicineBallThrow,
              ballWeight: 3, // Standard 3kg ball
              position: data.position,
            },
            notes: data.notes,
          }),
        })
        if (mbResponse.ok) {
          const result = await mbResponse.json()
          savedTests.push({ ...result.data, type: t('Medicinbollskast', 'Medicine Ball Throw') })
        }
      }

      if (savedTests.length === 0) {
        throw new Error(t('Inga testresultat att spara. Fyll i minst ett test.', 'No test results to save. Fill in at least one test.'))
      }

      setResults(savedTests)
      onTestSaved?.(savedTests)
    } catch (err) {
      console.error('Failed to save handball tests:', err)
      setError(err instanceof Error ? err.message : t('Ett fel uppstod', 'Something went wrong'))
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
            {t('Handboll - Testbatteri', 'Handball - Test battery')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {t('Inga klienter hittades. Lägg till klienter för att kunna registrera test.', 'No clients found. Add clients before registering tests.')}
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
                {t('Handboll - Testbatteri', 'Handball - Test battery')}
              </CardTitle>
              <CardDescription>
                {t('Fysiska tester för handbollsspelare: Yo-Yo IR1, Sprint 10m, CMJ, Medicinbollskast', 'Physical tests for handball players: Yo-Yo IR1, Sprint 10m, CMJ, Medicine Ball Throw')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Klient', 'Client')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('Välj klient', 'Select client')} />
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
                      <FormLabel>{t('Testdatum', 'Test date')}</FormLabel>
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
                              {label[locale]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {t('Jämförs mot elitreferensvärden för', 'Compared with elite reference values for')} {getPositionLabel(position, locale)}
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
                <span className="hidden sm:inline">10m</span>
              </TabsTrigger>
              <TabsTrigger value="cmj" className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">CMJ</span>
              </TabsTrigger>
              <TabsTrigger value="medball" className="flex items-center gap-1">
                <Circle className="h-4 w-4" />
                <span className="hidden sm:inline">{t('Boll', 'Ball')}</span>
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
                    {t('Mäter aerob kapacitet och återhämtningsförmåga', 'Measures aerobic capacity and recovery ability')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="yoyoLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Nivå', 'Level')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={5}
                              max={23}
                              step={1}
                              placeholder="ex: 18"
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
                        <span className="text-sm text-muted-foreground">{t('Resultat:', 'Result:')}</span>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${getBenchmarkClass(yoyoLevel, benchmarks.yoyoIR1)}`}>
                            {yoyoLevel.toFixed(1)}
                          </span>
                          <p className={`text-xs ${getBenchmarkClass(yoyoLevel, benchmarks.yoyoIR1)}`}>
                            {getBenchmarkLabel(locale, yoyoLevel, benchmarks.yoyoIR1)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('Elitkrav för', 'Elite target for')} {getPositionLabel(position, locale)}: {benchmarks.yoyoIR1.toFixed(1)}
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
                    10 meter Sprint
                  </CardTitle>
                  <CardDescription>
                    {t('Mäter acceleration och startstyrka', 'Measures acceleration and starting power')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="sprint10m"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Tid (sekunder)', 'Time (seconds)')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={3}
                            step={0.01}
                            placeholder="ex: 1.68"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {sprint10m && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('Resultat:', 'Result:')}</span>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${getBenchmarkClass(sprint10m, benchmarks.sprint10m, true)}`}>
                            {sprint10m.toFixed(2)} s
                          </span>
                          <p className={`text-xs ${getBenchmarkClass(sprint10m, benchmarks.sprint10m, true)}`}>
                            {getBenchmarkLabel(locale, sprint10m, benchmarks.sprint10m, true)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('Elitkrav för', 'Elite target for')} {getPositionLabel(position, locale)}: {benchmarks.sprint10m.toFixed(2)} s
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
                    {t('Mäter explosiv benstyrka', 'Measures explosive leg strength')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="cmjHeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Hopphöjd (cm)', 'Jump height (cm)')}</FormLabel>
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
                        <span className="text-sm text-muted-foreground">{t('Resultat:', 'Result:')}</span>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${getBenchmarkClass(cmjHeight, benchmarks.cmj)}`}>
                            {cmjHeight.toFixed(1)} cm
                          </span>
                          <p className={`text-xs ${getBenchmarkClass(cmjHeight, benchmarks.cmj)}`}>
                            {getBenchmarkLabel(locale, cmjHeight, benchmarks.cmj)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('Elitkrav för', 'Elite target for')} {getPositionLabel(position, locale)}: {benchmarks.cmj} cm
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="medball">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Circle className="h-5 w-5 text-red-500" />
                    {t('Medicinbollskast (3 kg)', 'Medicine Ball Throw (3 kg)')}
                  </CardTitle>
                  <CardDescription>
                    {t('Mäter överkroppens explosiva styrka', 'Measures upper-body explosive power')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="medicineBallThrow"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Kastlängd (meter)', 'Throw distance (meters)')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={3}
                            max={20}
                            step={0.1}
                            placeholder="ex: 12.5"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('Stående kast med 3 kg medicinboll', 'Standing throw with a 3 kg medicine ball')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {medicineBallThrow && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('Resultat:', 'Result:')}</span>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${getBenchmarkClass(medicineBallThrow, benchmarks.medicineBall)}`}>
                            {medicineBallThrow.toFixed(1)} m
                          </span>
                          <p className={`text-xs ${getBenchmarkClass(medicineBallThrow, benchmarks.medicineBall)}`}>
                            {getBenchmarkLabel(locale, medicineBallThrow, benchmarks.medicineBall)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('Elitkrav för', 'Elite target for')} {getPositionLabel(position, locale)}: {benchmarks.medicineBall.toFixed(1)} m
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
                    <FormLabel>{t('Anteckningar', 'Notes')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('Testförhållanden, känsla, observationer...', 'Test conditions, feeling, observations...')}
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
            {submitting ? t('Sparar...', 'Saving...') : t('Spara testbatteri', 'Save test battery')}
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
              {t(`${results.length} test sparade`, `${results.length} tests saved`)}
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
