'use client'

/**
 * Volleyball Test Battery Form
 *
 * Standard volleyball physical test battery:
 * - Spike Jump / Attack Jump (Volleyball-specific vertical jump with approach)
 * - Block Jump (Vertical jump from static position)
 * - T-Test Agility (Court movement agility)
 * - CMJ (General explosive power)
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
import { Trophy, CheckCircle, AlertTriangle, Timer, Zap, ArrowUp } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLocale } from '@/i18n/client'

type AppLocale = 'en' | 'sv'

const createVolleyballTestSchema = (locale: AppLocale) => z.object({
  clientId: z.string().min(1, locale === 'sv' ? 'Välj en klient' : 'Select a client'),
  testDate: z.string().min(1, locale === 'sv' ? 'Välj testdatum' : 'Select a test date'),
  position: z.enum(['setter', 'outside_hitter', 'middle_blocker', 'opposite', 'libero']),
  // Spike Jump (reach height in cm)
  spikeJump: z.number().min(200).max(400).optional(),
  // Block Jump (reach height in cm)
  blockJump: z.number().min(180).max(380).optional(),
  // T-Test Agility (seconds)
  tTest: z.number().min(7).max(15).optional(),
  // CMJ (jump height in cm)
  cmjHeight: z.number().min(15).max(80).optional(),
  notes: z.string().optional(),
})

type VolleyballTestFormData = z.infer<ReturnType<typeof createVolleyballTestSchema>>

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface VolleyballTestBatteryFormProps {
  clients: Client[]
  onTestSaved?: (tests: any[]) => void
}

const POSITION_LABELS: Record<string, Record<AppLocale, string>> = {
  setter: { sv: 'Passare', en: 'Setter' },
  outside_hitter: { sv: 'Kantspiker', en: 'Outside hitter' },
  middle_blocker: { sv: 'Centerblockare', en: 'Middle blocker' },
  opposite: { sv: 'Diagonal', en: 'Opposite' },
  libero: { sv: 'Libero', en: 'Libero' },
}

// Position-specific benchmarks (elite level)
const POSITION_BENCHMARKS: Record<string, { spikeJump: number; blockJump: number; tTest: number; cmj: number }> = {
  setter: { spikeJump: 310, blockJump: 290, tTest: 9.5, cmj: 48 },
  outside_hitter: { spikeJump: 340, blockJump: 310, tTest: 9.2, cmj: 55 },
  middle_blocker: { spikeJump: 350, blockJump: 330, tTest: 9.8, cmj: 52 },
  opposite: { spikeJump: 345, blockJump: 315, tTest: 9.4, cmj: 54 },
  libero: { spikeJump: 290, blockJump: 270, tTest: 8.8, cmj: 45 },
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

export function VolleyballTestBatteryForm({ clients, onTestSaved }: VolleyballTestBatteryFormProps) {
  const rawLocale = useLocale()
  const locale: AppLocale = rawLocale === 'sv' ? 'sv' : 'en'
  const t = (sv: string, en: string) => (locale === 'sv' ? sv : en)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('spike')

  const form = useForm<VolleyballTestFormData>({
    resolver: zodResolver(createVolleyballTestSchema(locale)),
    defaultValues: {
      testDate: new Date().toISOString().split('T')[0],
      position: 'outside_hitter',
    },
  })

  const position = form.watch('position')
  const benchmarks = POSITION_BENCHMARKS[position] || POSITION_BENCHMARKS.outside_hitter

  // Watch values for live comparison
  const spikeJump = form.watch('spikeJump')
  const blockJump = form.watch('blockJump')
  const tTest = form.watch('tTest')
  const cmjHeight = form.watch('cmjHeight')

  async function handleSubmit(data: VolleyballTestFormData) {
    setSubmitting(true)
    setResults([])
    setError(null)

    try {
      const client = clients.find((c) => c.id === data.clientId)
      if (!client) throw new Error(t('Klient hittades inte', 'Client not found'))

      const savedTests: any[] = []

      // Save Spike Jump test if data provided
      if (data.spikeJump) {
        const spikeResponse = await fetch('/api/sport-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: data.clientId,
            testDate: data.testDate,
            category: 'POWER',
            protocol: 'SPIKE_JUMP',
            sport: 'TEAM_VOLLEYBALL',
            rawData: {
              reachHeight: data.spikeJump,
              variant: 'spike_jump',
              position: data.position,
            },
            notes: data.notes,
          }),
        })
        if (spikeResponse.ok) {
          const result = await spikeResponse.json()
          savedTests.push({ ...result.data, type: 'Spike Jump' })
        }
      }

      // Save Block Jump test if data provided
      if (data.blockJump) {
        const blockResponse = await fetch('/api/sport-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: data.clientId,
            testDate: data.testDate,
            category: 'POWER',
            protocol: 'VERTICAL_JUMP_CMJ',
            sport: 'TEAM_VOLLEYBALL',
            rawData: {
              reachHeight: data.blockJump,
              variant: 'block_jump',
              position: data.position,
            },
            notes: data.notes,
          }),
        })
        if (blockResponse.ok) {
          const result = await blockResponse.json()
          savedTests.push({ ...result.data, type: 'Block Jump' })
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
            sport: 'TEAM_VOLLEYBALL',
            rawData: {
              totalTime: data.tTest,
              position: data.position,
            },
            notes: data.notes,
          }),
        })
        if (tTestResponse.ok) {
          const result = await tTestResponse.json()
          savedTests.push({ ...result.data, type: 'T-Test' })
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
            sport: 'TEAM_VOLLEYBALL',
            rawData: {
              jumpHeight: data.cmjHeight,
              variant: 'cmj',
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
        throw new Error(t('Inga testresultat att spara. Fyll i minst ett test.', 'No test results to save. Fill in at least one test.'))
      }

      setResults(savedTests)
      onTestSaved?.(savedTests)
    } catch (err) {
      console.error('Failed to save volleyball tests:', err)
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
            <Trophy className="h-5 w-5 text-yellow-500" />
            {t('Volleyboll - Testbatteri', 'Volleyball - Test battery')}
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
                <Trophy className="h-5 w-5 text-yellow-500" />
                {t('Volleyboll - Testbatteri', 'Volleyball - Test battery')}
              </CardTitle>
              <CardDescription>
                {t('Fysiska tester för volleybollspelare: Spike Jump, Block Jump, T-Test, CMJ', 'Physical tests for volleyball players: Spike Jump, Block Jump, T-Test, CMJ')}
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
              <TabsTrigger value="spike" className="flex items-center gap-1">
                <ArrowUp className="h-4 w-4" />
                <span className="hidden sm:inline">Spike</span>
              </TabsTrigger>
              <TabsTrigger value="block" className="flex items-center gap-1">
                <ArrowUp className="h-4 w-4" />
                <span className="hidden sm:inline">Block</span>
              </TabsTrigger>
              <TabsTrigger value="ttest" className="flex items-center gap-1">
                <Timer className="h-4 w-4" />
                <span className="hidden sm:inline">T-Test</span>
              </TabsTrigger>
              <TabsTrigger value="cmj" className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">CMJ</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="spike">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ArrowUp className="h-5 w-5 text-yellow-500" />
                    Spike Jump / Attack Jump
                  </CardTitle>
                  <CardDescription>
                    {t('Maximal räckhöjd vid anfall med ansats. Mäter explosiv hoppkraft och teknik.', 'Maximum attack reach with approach. Measures explosive jump power and technique.')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="spikeJump"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Räckhöjd (cm)', 'Reach height (cm)')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={200}
                            max={400}
                            step={1}
                            placeholder="ex: 330"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('Mäts som maximal höjd handen når vid anfall', 'Measured as the maximum height the hand reaches during attack')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {spikeJump && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('Resultat:', 'Result:')}</span>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${getBenchmarkClass(spikeJump, benchmarks.spikeJump)}`}>
                            {spikeJump} cm
                          </span>
                          <p className={`text-xs ${getBenchmarkClass(spikeJump, benchmarks.spikeJump)}`}>
                            {getBenchmarkLabel(locale, spikeJump, benchmarks.spikeJump)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('Elitkrav för', 'Elite target for')} {getPositionLabel(position, locale)}: {benchmarks.spikeJump} cm
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="block">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ArrowUp className="h-5 w-5 text-blue-500" />
                    Block Jump
                  </CardTitle>
                  <CardDescription>
                    {t('Maximal räckhöjd vid block från stående position. Mäter statisk hoppkraft.', 'Maximum block reach from a standing position. Measures static jump power.')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="blockJump"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Räckhöjd (cm)', 'Reach height (cm)')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={180}
                            max={380}
                            step={1}
                            placeholder="ex: 305"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('Mäts som maximal höjd händerna når vid block utan ansats', 'Measured as the maximum height the hands reach during a block without approach')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {blockJump && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('Resultat:', 'Result:')}</span>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${getBenchmarkClass(blockJump, benchmarks.blockJump)}`}>
                            {blockJump} cm
                          </span>
                          <p className={`text-xs ${getBenchmarkClass(blockJump, benchmarks.blockJump)}`}>
                            {getBenchmarkLabel(locale, blockJump, benchmarks.blockJump)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('Elitkrav för', 'Elite target for')} {getPositionLabel(position, locale)}: {benchmarks.blockJump} cm
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
                    <Timer className="h-5 w-5 text-orange-500" />
                    T-Test Agility
                  </CardTitle>
                  <CardDescription>
                    {t('Mäter snabbhet och riktningsförändringar på plan. Viktigt för spelrörlighet.', 'Measures speed and changes of direction on court. Important for game movement.')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="tTest"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Tid (sekunder)', 'Time (seconds)')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={7}
                            max={15}
                            step={0.01}
                            placeholder="ex: 9.2"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('Standard T-bana med sidosteg och backpedaling', 'Standard T-course with side shuffles and backpedaling')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {tTest && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('Resultat:', 'Result:')}</span>
                        <div className="text-right">
                          <span className={`text-xl font-bold ${getBenchmarkClass(tTest, benchmarks.tTest, true)}`}>
                            {tTest.toFixed(2)} s
                          </span>
                          <p className={`text-xs ${getBenchmarkClass(tTest, benchmarks.tTest, true)}`}>
                            {getBenchmarkLabel(locale, tTest, benchmarks.tTest, true)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('Elitkrav för', 'Elite target for')} {getPositionLabel(position, locale)}: {benchmarks.tTest.toFixed(2)} s
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
                    {t('Generell vertikal hoppkapacitet utan ansats. Mäter explosiv benstyrka.', 'General vertical jump capacity without approach. Measures explosive leg strength.')}
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
                            placeholder="ex: 52"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('Ren hopphöjd mätt från marken', 'Pure jump height measured from the ground')}
                        </FormDescription>
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
