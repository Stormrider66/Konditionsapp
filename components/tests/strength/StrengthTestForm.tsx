'use client'

/**
 * Strength Test Form (1RM Tests)
 *
 * Supports multiple exercises:
 * - Bench Press
 * - Squat
 * - Deadlift
 * - Leg Press
 * - Overhead Press
 *
 * Can calculate estimated 1RM from submaximal loads
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dumbbell, CheckCircle, AlertTriangle, TrendingUp, Calculator } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { CompactResult } from '@/components/tests/shared/TestResultDisplay'
import { TestBenchmarkBadge, type BenchmarkTier } from '@/components/tests/shared/TestBenchmarkBadge'
import {
  estimateOneRepMax,
  calculateRelativeStrength,
  classifyStrength,
  getTrainingWeights,
  type OneRepMaxFormula,
  type StrengthExercise,
} from '@/lib/calculations/sport-tests/strength-tests'

const strengthTestSchema = z.object({
  clientId: z.string().min(1, 'Välj en klient'),
  testDate: z.string().min(1, 'Välj testdatum'),
  exercise: z.enum(['BENCH_PRESS', 'SQUAT', 'DEADLIFT', 'LEG_PRESS', 'OVERHEAD_PRESS']),
  weight: z.number().min(10).max(500),
  reps: z.number().min(1).max(20),
  isEstimated: z.boolean(),
  bodyWeight: z.number().min(30).max(200),
  formula: z.enum(['EPLEY', 'BRZYCKI', 'LANDER']).optional(),
  notes: z.string().optional(),
})

type StrengthTestFormData = z.infer<typeof strengthTestSchema>

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
  { value: 'BENCH_PRESS', label: 'Bänkpress', protocol: 'BENCH_PRESS_1RM' },
  { value: 'SQUAT', label: 'Knäböj', protocol: 'SQUAT_1RM' },
  { value: 'DEADLIFT', label: 'Marklyft', protocol: 'DEADLIFT_1RM' },
  { value: 'LEG_PRESS', label: 'Benpress', protocol: 'LEG_PRESS_1RM' },
  { value: 'OVERHEAD_PRESS', label: 'Axelpress', protocol: 'OVERHEAD_PRESS_1RM' },
]

export function StrengthTestForm({ clients, onTestSaved }: StrengthTestFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<StrengthTestFormData>({
    resolver: zodResolver(strengthTestSchema),
    defaultValues: {
      testDate: new Date().toISOString().split('T')[0],
      exercise: 'SQUAT',
      reps: 1,
      isEstimated: false,
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
      if (!client) throw new Error('Klient hittades inte')

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
        throw new Error(errorData.error || 'Misslyckades att spara test')
      }

      const resultData = await response.json()

      setResult({
        ...resultData.data,
        tier,
        oneRepMax: oneRM,
        relativeStrength: relStr,
        trainingWeights,
        client,
        exerciseLabel: selectedExercise?.label,
      })

      onTestSaved?.(resultData.data)
      form.reset({
        testDate: new Date().toISOString().split('T')[0],
        exercise: 'SQUAT',
        reps: 1,
        isEstimated: false,
        formula: 'EPLEY',
      })
    } catch (err) {
      console.error('Failed to save strength test:', err)
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
            <Dumbbell className="h-5 w-5" />
            Styrketest (1RM)
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
                <Dumbbell className="h-5 w-5" />
                Styrketest (1RM)
              </CardTitle>
              <CardDescription>
                Registrera maxstyrka direkt eller beräkna från submaximal belastning
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
                name="exercise"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Övning</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {exerciseOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                        Beräkna 1RM
                      </FormLabel>
                      <FormDescription>
                        Uppskatta 1RM från submaximal belastning
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
                      <FormLabel>Vikt (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          min={10}
                          max={500}
                          placeholder="t.ex. 100"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        {isEstimated ? 'Vikt som lyfts för beräkning' : 'Direkt 1RM vikt'}
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
                      <FormLabel>Antal repetitioner</FormLabel>
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
                        {isEstimated ? 'Reps gjorda vid given vikt' : '1 för direkt 1RM'}
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
                      <FormLabel>Beräkningsformel</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EPLEY">Epley (rekommenderad)</SelectItem>
                          <SelectItem value="BRZYCKI">Brzycki</SelectItem>
                          <SelectItem value="LANDER">Lander</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Epley: 1RM = vikt × (1 + reps/30)
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
                    <FormDescription>För beräkning av relativ styrka</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Live calculation preview */}
              {estimated1RM && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {isEstimated && reps > 1 ? 'Beräknad 1RM' : 'Resultat'}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">1RM</p>
                      <span className="text-2xl font-bold text-primary">{estimated1RM}</span>
                      <span className="text-sm text-muted-foreground ml-1">kg</span>
                    </div>
                    {relativeStrength && (
                      <div>
                        <p className="text-xs text-muted-foreground">Relativ styrka</p>
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
                    <FormLabel>Anteckningar</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Teknik, utrustning, observationer..."
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
            {submitting ? 'Sparar...' : 'Spara styrketest'}
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
              Test sparat
            </CardTitle>
            <CardDescription>
              {result.client?.name} - {result.exerciseLabel} 1RM -{' '}
              {new Date(result.testDate).toLocaleDateString('sv-SE')}
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
                label="Relativ styrka"
                value={result.relativeStrength}
                unit="× BW"
              />
              {result.rawData?.isEstimated && (
                <CompactResult
                  label="Testad vikt"
                  value={result.rawData.weight}
                  unit={`kg × ${result.rawData.reps} reps`}
                />
              )}
            </div>

            {/* Training recommendations */}
            {result.trainingWeights && (
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">Träningsvikter baserat på 1RM:</p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="p-2 bg-muted rounded">
                    <p className="text-muted-foreground">Styrka ({result.trainingWeights.strength.reps} reps)</p>
                    <p className="font-semibold">{result.trainingWeights.strength.weight} kg</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-muted-foreground">Hypertrofi ({result.trainingWeights.hypertrophy.reps} reps)</p>
                    <p className="font-semibold">{result.trainingWeights.hypertrophy.weight} kg</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-muted-foreground">Uthållighet ({result.trainingWeights.endurance.reps} reps)</p>
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
