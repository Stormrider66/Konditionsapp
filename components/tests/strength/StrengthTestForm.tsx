'use client'

/**
 * Strength Test Form (1RM Tests)
 *
 * Supports multiple exercises:
 * - Bench Press
 * - Squat
 * - Deadlift
 * - Power Clean
 * - Leg Press
 * - Overhead Press
 *
 * Can calculate estimated 1RM from submaximal loads
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dumbbell, CheckCircle, AlertTriangle, TrendingUp, Calculator } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { CompactResult } from '@/components/tests/shared/TestResultDisplay'
import { TestBenchmarkBadge } from '@/components/tests/shared/TestBenchmarkBadge'
import {
  estimateOneRepMax,
  calculateRelativeStrength,
  classifyStrength,
  getTrainingWeights,
  type OneRepMaxFormula,
  type StrengthExercise,
} from '@/lib/calculations/sport-tests/strength-tests'

const createStrengthTestSchema = (locale: string) => z.object({
  clientId: z.string().min(1, locale === 'sv' ? 'Välj en klient' : 'Select a client'),
  testDate: z.string().min(1, locale === 'sv' ? 'Välj testdatum' : 'Select a test date'),
  exercise: z.enum(['BENCH_PRESS', 'SQUAT', 'DEADLIFT', 'POWER_CLEAN', 'LEG_PRESS', 'OVERHEAD_PRESS']),
  weight: z.number().min(10).max(500),
  reps: z.number().min(1).max(20),
  isEstimated: z.boolean(),
  bodyWeight: z.number().min(30).max(200),
  formula: z.enum(['EPLEY', 'BRZYCKI', 'LANDER']).optional(),
  notes: z.string().optional(),
})

type StrengthTestFormData = z.infer<ReturnType<typeof createStrengthTestSchema>>

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface StrengthTestFormProps {
  clients: Client[]
  onTestSaved?: (test: any) => void
}

const exerciseOptions = [
  { value: 'BENCH_PRESS', label: 'Bench press', svLabel: 'Bänkpress', protocol: 'BENCH_PRESS_1RM' },
  { value: 'SQUAT', label: 'Squat', svLabel: 'Knäböj', protocol: 'SQUAT_1RM' },
  { value: 'DEADLIFT', label: 'Deadlift', svLabel: 'Marklyft', protocol: 'DEADLIFT_1RM' },
  { value: 'POWER_CLEAN', label: 'Power clean', svLabel: 'Frivändning', protocol: 'POWER_CLEAN_1RM' },
  { value: 'LEG_PRESS', label: 'Leg press', svLabel: 'Benpress', protocol: 'LEG_PRESS_1RM' },
  { value: 'OVERHEAD_PRESS', label: 'Overhead press', svLabel: 'Axelpress', protocol: 'OVERHEAD_PRESS_1RM' },
]

export function StrengthTestForm({ clients, onTestSaved }: StrengthTestFormProps) {
  const locale = useLocale()
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<StrengthTestFormData>({
    resolver: zodResolver(createStrengthTestSchema(locale)),
    defaultValues: {
      clientId: clients[0]?.id ?? '',
      testDate: new Date().toISOString().split('T')[0],
      exercise: 'SQUAT',
      reps: 1,
      isEstimated: false,
      bodyWeight: clients[0]?.weight ?? 70,
      formula: 'EPLEY',
    },
  })

  const selectedClient = clients.find((c) => c.id === form.watch('clientId'))
  const exercise = form.watch('exercise')
  const weight = form.watch('weight')
  const reps = form.watch('reps')
  const isEstimated = form.watch('isEstimated')
  const formula = form.watch('formula') as OneRepMaxFormula
  const bodyWeight = form.watch('bodyWeight')

  // Auto-fill body weight when client is selected
  useEffect(() => {
    if (!form.getValues('clientId') && clients[0]?.id) {
      form.setValue('clientId', clients[0].id)
    }
  }, [clients, form])

  useEffect(() => {
    if (selectedClient?.weight) {
      form.setValue('bodyWeight', selectedClient.weight)
    }
  }, [selectedClient, form])

  // Calculate estimated 1RM
  const estimated1RM =
    weight && reps
      ? isEstimated && reps > 1
        ? estimateOneRepMax(weight, reps, formula)
        : weight
      : null

  // Calculate relative strength and tier
  const relativeStrength =
    estimated1RM && bodyWeight ? calculateRelativeStrength(estimated1RM, bodyWeight) : null

  const liveTier =
    exercise && relativeStrength && selectedClient
      ? classifyStrength(exercise as StrengthExercise, relativeStrength, selectedClient.gender)
      : null

  const selectedExercise = exerciseOptions.find((e) => e.value === exercise)

  async function handleSubmit(data: StrengthTestFormData) {
    setSubmitting(true)
    setResult(null)
    setError(null)

    try {
      const client = clients.find((c) => c.id === data.clientId)
      if (!client) throw new Error(locale === 'sv' ? 'Klient hittades inte' : 'Client not found')

      const oneRM =
        data.isEstimated && data.reps > 1
          ? estimateOneRepMax(data.weight, data.reps, data.formula as OneRepMaxFormula)
          : data.weight

      const relStr = calculateRelativeStrength(oneRM, data.bodyWeight)
      const tier = classifyStrength(data.exercise as StrengthExercise, relStr, client.gender)
      const trainingWeights = getTrainingWeights(oneRM)

      const protocol = exerciseOptions.find((e) => e.value === data.exercise)?.protocol

      const response = await fetch('/api/sport-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: data.clientId,
          testDate: data.testDate,
          category: 'STRENGTH',
          protocol,
          sport: 'GENERAL_FITNESS',
          rawData: {
            weight: data.weight,
            reps: data.reps,
            isEstimated: data.isEstimated,
            formula: data.formula,
            bodyWeight: data.bodyWeight,
            oneRepMax: oneRM,
            relativeStrength: relStr,
          },
          notes: data.notes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || (locale === 'sv' ? 'Misslyckades att spara test' : 'Failed to save test'))
      }

      const resultData = await response.json()

      setResult({
        ...resultData.data,
        strengthPrSync: resultData.strengthPrSync,
        tier,
        oneRepMax: oneRM,
        relativeStrength: relStr,
        trainingWeights,
        client,
        exerciseLabel: locale === 'sv' ? selectedExercise?.svLabel : selectedExercise?.label,
      })

      onTestSaved?.(resultData.data)
      form.reset({
        clientId: data.clientId,
        testDate: new Date().toISOString().split('T')[0],
        exercise: 'SQUAT',
        reps: 1,
        isEstimated: false,
        bodyWeight: data.bodyWeight,
        formula: 'EPLEY',
        notes: '',
      })
    } catch (err) {
      console.error('Failed to save strength test:', err)
      setError(err instanceof Error ? err.message : locale === 'sv' ? 'Ett fel uppstod' : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            {locale === 'sv' ? 'Styrketest (1RM)' : 'Strength test (1RM)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {locale === 'sv'
              ? 'Inga klienter hittades. Lägg till klienter för att kunna registrera test.'
              : 'No clients found. Add clients before registering a test.'}
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
                <Dumbbell className="h-5 w-5" />
                {locale === 'sv' ? 'Styrketest (1RM)' : 'Strength test (1RM)'}
              </CardTitle>
              <CardDescription>
                {locale === 'sv'
                  ? 'Registrera maxstyrka direkt eller beräkna från submaximal belastning'
                  : 'Record max strength directly or estimate it from a submaximal load'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{locale === 'sv' ? 'Klient' : 'Client'}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
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

              <FormField
                control={form.control}
                name="exercise"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{locale === 'sv' ? 'Övning' : 'Exercise'}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {exerciseOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {locale === 'sv' ? option.svLabel : option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Estimation toggle */}
              <FormField
                control={form.control}
                name="isEstimated"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        {locale === 'sv' ? 'Beräkna 1RM' : 'Calculate 1RM'}
                      </FormLabel>
                      <FormDescription>
                        {locale === 'sv'
                          ? 'Uppskatta 1RM från submaximal belastning'
                          : 'Estimate 1RM from a submaximal load'}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{locale === 'sv' ? 'Vikt (kg)' : 'Weight (kg)'}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          min={10}
                          max={500}
                          placeholder={locale === 'sv' ? 't.ex. 100' : 'e.g. 100'}
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        {isEstimated
                          ? locale === 'sv' ? 'Vikt som lyfts för beräkning' : 'Weight lifted for the estimate'
                          : locale === 'sv' ? 'Direkt 1RM vikt' : 'Direct 1RM weight'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{locale === 'sv' ? 'Antal repetitioner' : 'Number of reps'}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        {isEstimated
                          ? locale === 'sv' ? 'Reps gjorda vid given vikt' : 'Reps completed at the given weight'
                          : locale === 'sv' ? '1 för direkt 1RM' : '1 for direct 1RM'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {isEstimated && reps > 1 && (
                <FormField
                  control={form.control}
                  name="formula"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{locale === 'sv' ? 'Beräkningsformel' : 'Estimation formula'}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EPLEY">
                            {locale === 'sv' ? 'Epley (rekommenderad)' : 'Epley (recommended)'}
                          </SelectItem>
                          <SelectItem value="BRZYCKI">Brzycki</SelectItem>
                          <SelectItem value="LANDER">Lander</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {locale === 'sv'
                          ? 'Epley: 1RM = vikt × (1 + reps/30)'
                          : 'Epley: 1RM = weight × (1 + reps/30)'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="bodyWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{locale === 'sv' ? 'Kroppsvikt (kg)' : 'Body weight (kg)'}</FormLabel>
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
                    <FormDescription>
                      {locale === 'sv' ? 'För beräkning av relativ styrka' : 'Used to calculate relative strength'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Live calculation preview */}
              {estimated1RM && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {isEstimated && reps > 1
                      ? locale === 'sv' ? 'Beräknad 1RM' : 'Estimated 1RM'
                      : locale === 'sv' ? 'Resultat' : 'Result'}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">1RM</p>
                      <span className="text-2xl font-bold text-primary">{estimated1RM}</span>
                      <span className="text-sm text-muted-foreground ml-1">kg</span>
                    </div>
                    {relativeStrength && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {locale === 'sv' ? 'Relativ styrka' : 'Relative strength'}
                        </p>
                        <span className="text-2xl font-bold text-primary">
                          {relativeStrength}
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">× BW</span>
                      </div>
                    )}
                    {liveTier && (
                      <div className="flex items-center col-span-2">
                        <TestBenchmarkBadge tier={liveTier} />
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
                    <FormLabel>{locale === 'sv' ? 'Anteckningar' : 'Notes'}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={locale === 'sv'
                          ? 'Teknik, utrustning, observationer...'
                          : 'Technique, equipment, observations...'}
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
            {submitting
              ? locale === 'sv' ? 'Sparar...' : 'Saving...'
              : locale === 'sv' ? 'Spara styrketest' : 'Save strength test'}
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
              {locale === 'sv' ? 'Test sparat' : 'Test saved'}
            </CardTitle>
            <CardDescription>
              {result.client?.name} - {result.exerciseLabel} 1RM -{' '}
              {new Date(result.testDate).toLocaleDateString(dateLocale)}
              {result.strengthPrSync?.success && (locale === 'sv' ? ' · Styrke-PR uppdaterad' : ' · Strength PR updated')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <CompactResult
                label="1RM"
                value={result.oneRepMax}
                unit="kg"
                tier={result.tier}
              />
              <CompactResult
                label={locale === 'sv' ? 'Relativ styrka' : 'Relative strength'}
                value={result.relativeStrength}
                unit="× BW"
              />
              {result.rawData?.isEstimated && (
                <CompactResult
                  label={locale === 'sv' ? 'Testad vikt' : 'Tested weight'}
                  value={result.rawData.weight}
                  unit={`kg × ${result.rawData.reps} reps`}
                />
              )}
            </div>

            {/* Training recommendations */}
            {result.trainingWeights && (
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">
                  {locale === 'sv' ? 'Träningsvikter baserat på 1RM:' : 'Training weights based on 1RM:'}
                </p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="p-2 bg-muted rounded">
                    <p className="text-muted-foreground">
                      {locale === 'sv' ? 'Styrka' : 'Strength'} ({result.trainingWeights.strength.reps} reps)
                    </p>
                    <p className="font-semibold">{result.trainingWeights.strength.weight} kg</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-muted-foreground">
                      {locale === 'sv' ? 'Hypertrofi' : 'Hypertrophy'} ({result.trainingWeights.hypertrophy.reps} reps)
                    </p>
                    <p className="font-semibold">{result.trainingWeights.hypertrophy.weight} kg</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-muted-foreground">
                      {locale === 'sv' ? 'Uthållighet' : 'Endurance'} ({result.trainingWeights.endurance.reps} reps)
                    </p>
                    <p className="font-semibold">{result.trainingWeights.endurance.weight} kg</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
