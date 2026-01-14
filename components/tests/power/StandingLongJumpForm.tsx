'use client'

/**
 * Standing Long Jump Test Form
 *
 * Measures horizontal power - useful for:
 * - Floorball players (part of standard test battery)
 * - General explosive power assessment
 * - Youth athlete development
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
import { MoveHorizontal, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { CompactResult } from '@/components/tests/shared/TestResultDisplay'
import { TestBenchmarkBadge, type BenchmarkTier } from '@/components/tests/shared/TestBenchmarkBadge'
import { calculateLongJumpPowerIndex } from '@/lib/calculations/sport-tests/power-tests'

const standingLongJumpSchema = z.object({
  clientId: z.string().min(1, 'Välj en klient'),
  testDate: z.string().min(1, 'Välj testdatum'),
  jumpDistance: z.number().min(100).max(400),
  bodyWeight: z.number().min(30).max(200),
  attempts: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
})

type StandingLongJumpFormData = z.infer<typeof standingLongJumpSchema>

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface StandingLongJumpFormProps {
  clients: Client[]
  onTestSaved?: (test: any) => void
}

function classifyLongJump(
  distance: number,
  gender: 'MALE' | 'FEMALE'
): BenchmarkTier {
  const thresholds = gender === 'MALE'
    ? { worldClass: 300, elite: 270, advanced: 240, intermediate: 210 }
    : { worldClass: 250, elite: 220, advanced: 190, intermediate: 160 }

  if (distance >= thresholds.worldClass) return 'WORLD_CLASS'
  if (distance >= thresholds.elite) return 'ELITE'
  if (distance >= thresholds.advanced) return 'ADVANCED'
  if (distance >= thresholds.intermediate) return 'INTERMEDIATE'
  return 'BEGINNER'
}

export function StandingLongJumpForm({ clients, onTestSaved }: StandingLongJumpFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<StandingLongJumpFormData>({
    resolver: zodResolver(standingLongJumpSchema),
    defaultValues: {
      testDate: new Date().toISOString().split('T')[0],
      attempts: 3,
    },
  })

  const selectedClient = clients.find((c) => c.id === form.watch('clientId'))

  useEffect(() => {
    if (selectedClient?.weight) {
      form.setValue('bodyWeight', selectedClient.weight)
    }
  }, [selectedClient, form])

  const jumpDistance = form.watch('jumpDistance')
  const bodyWeight = form.watch('bodyWeight')

  const livePowerIndex =
    jumpDistance && bodyWeight ? calculateLongJumpPowerIndex(jumpDistance, bodyWeight) : null

  async function handleSubmit(data: StandingLongJumpFormData) {
    setSubmitting(true)
    setResult(null)
    setError(null)

    try {
      const client = clients.find((c) => c.id === data.clientId)
      if (!client) throw new Error('Klient hittades inte')

      const tier = classifyLongJump(data.jumpDistance, client.gender)
      const powerIndex = calculateLongJumpPowerIndex(data.jumpDistance, data.bodyWeight)

      const response = await fetch('/api/sport-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: data.clientId,
          testDate: data.testDate,
          category: 'POWER',
          protocol: 'STANDING_LONG_JUMP',
          sport: 'GENERAL_FITNESS',
          rawData: {
            jumpDistance: data.jumpDistance,
            bodyWeight: data.bodyWeight,
            attempts: data.attempts,
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
        powerIndex,
        client,
      })

      onTestSaved?.(resultData.data)
      form.reset({
        testDate: new Date().toISOString().split('T')[0],
        attempts: 3,
      })
    } catch (err) {
      console.error('Failed to save standing long jump test:', err)
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MoveHorizontal className="h-5 w-5" />
                Stående längdhopp
              </CardTitle>
              <CardDescription>
                Mäter horisontell explosivitet. Standard test för floorball och ungdomsidrott.
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
                  name="jumpDistance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hopplängd (cm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={100}
                          max={400}
                          placeholder="t.ex. 245"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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

              {livePowerIndex && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Kraftindex
                  </p>
                  <span className="text-2xl font-bold text-primary">{livePowerIndex}</span>
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
                        placeholder="Teknik, underlag, observationer..."
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
            {submitting ? 'Sparar...' : 'Spara stående längdhopp'}
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
              {result.client?.name} - {new Date(result.testDate).toLocaleDateString('sv-SE')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <CompactResult
                label="Hopplängd"
                value={result.primaryResult}
                unit="cm"
                tier={result.tier}
              />
              <CompactResult label="Kraftindex" value={result.powerIndex} />
            </div>

            {result.tier && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Prestandanivå:</span>
                <TestBenchmarkBadge tier={result.tier} />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
