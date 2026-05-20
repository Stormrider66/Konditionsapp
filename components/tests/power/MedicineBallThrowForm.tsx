'use client'

/**
 * Medicine Ball Throw Test Form
 *
 * Measures upper body power - especially for:
 * - Handball players (core test for arm power)
 * - Basketball players
 * - General upper body power assessment
 */

import { useState } from 'react'
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
import { Target, CheckCircle, AlertTriangle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { CompactResult } from '@/components/tests/shared/TestResultDisplay'
import { TestBenchmarkBadge } from '@/components/tests/shared/TestBenchmarkBadge'
import { classifyMedicineBallThrow } from '@/lib/calculations/sport-tests/power-tests'

const createMedicineBallThrowSchema = (locale: string) => z.object({
  clientId: z.string().min(1, locale === 'sv' ? 'Välj en klient' : 'Select a client'),
  testDate: z.string().min(1, locale === 'sv' ? 'Välj testdatum' : 'Select a test date'),
  throwDistance: z.number().min(3).max(20),
  ballWeight: z.number().min(1).max(5),
  throwType: z.enum(['OVERHEAD', 'CHEST_PASS', 'ROTATIONAL']),
  attempts: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
})

type MedicineBallThrowFormData = z.infer<ReturnType<typeof createMedicineBallThrowSchema>>

interface Client {
  id: string
  name: string
  weight: number
  gender: 'MALE' | 'FEMALE'
}

interface MedicineBallThrowFormProps {
  clients: Client[]
  onTestSaved?: (test: any) => void
}

export function MedicineBallThrowForm({ clients, onTestSaved }: MedicineBallThrowFormProps) {
  const locale = useLocale()
  const dateLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<MedicineBallThrowFormData>({
    resolver: zodResolver(createMedicineBallThrowSchema(locale)),
    defaultValues: {
      clientId: clients[0]?.id ?? '',
      testDate: new Date().toISOString().split('T')[0],
      ballWeight: 3,
      throwType: 'OVERHEAD',
      attempts: 3,
    },
  })

  const selectedClient = clients.find((c) => c.id === form.watch('clientId'))
  const throwDistance = form.watch('throwDistance')
  const ballWeight = form.watch('ballWeight')

  // Live tier calculation
  const liveTier =
    throwDistance && ballWeight && selectedClient
      ? classifyMedicineBallThrow(throwDistance, ballWeight, selectedClient.gender)
      : null

  async function handleSubmit(data: MedicineBallThrowFormData) {
    setSubmitting(true)
    setResult(null)
    setError(null)

    try {
      const client = clients.find((c) => c.id === data.clientId)
      if (!client) throw new Error(locale === 'sv' ? 'Klient hittades inte' : 'Client not found')

      const tier = classifyMedicineBallThrow(data.throwDistance, data.ballWeight, client.gender)

      const response = await fetch('/api/sport-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: data.clientId,
          testDate: data.testDate,
          category: 'POWER',
          protocol: 'MEDICINE_BALL_THROW',
          sport: 'TEAM_HANDBALL',
          rawData: {
            throwDistance: data.throwDistance,
            ballWeight: data.ballWeight,
            throwType: data.throwType,
            attempts: data.attempts,
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
        tier,
        client,
      })

      onTestSaved?.(resultData.data)
      form.reset({
        clientId: data.clientId,
        testDate: new Date().toISOString().split('T')[0],
        ballWeight: 3,
        throwType: 'OVERHEAD',
        attempts: 3,
      })
    } catch (err) {
      console.error('Failed to save medicine ball throw test:', err)
      setError(err instanceof Error ? err.message : locale === 'sv' ? 'Ett fel uppstod' : 'An error occurred')
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
                <Target className="h-5 w-5" />
                {locale === 'sv' ? 'Medicinbollskast' : 'Medicine ball throw'}
              </CardTitle>
              <CardDescription>
                {locale === 'sv'
                  ? 'Mäter explosiv överkroppsstyrka. Standard test för handbollsspelare.'
                  : 'Measures explosive upper-body power. Standard test for handball players.'}
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="throwDistance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{locale === 'sv' ? 'Kastlängd (m)' : 'Throw distance (m)'}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min={3}
                          max={20}
                          placeholder={locale === 'sv' ? 't.ex. 12.5' : 'e.g. 12.5'}
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        {locale === 'sv' ? 'Bästa kast av alla försök' : 'Best throw from all attempts'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ballWeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{locale === 'sv' ? 'Bollvikt (kg)' : 'Ball weight (kg)'}</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(parseFloat(v))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="2">
                            {locale === 'sv' ? '2 kg (kvinnor standard)' : '2 kg (women standard)'}
                          </SelectItem>
                          <SelectItem value="3">
                            {locale === 'sv' ? '3 kg (män standard)' : '3 kg (men standard)'}
                          </SelectItem>
                          <SelectItem value="4">4 kg</SelectItem>
                          <SelectItem value="5">5 kg</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="throwType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{locale === 'sv' ? 'Kasttyp' : 'Throw type'}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="OVERHEAD">
                          {locale === 'sv' ? 'Överhands (stående)' : 'Overhead (standing)'}
                        </SelectItem>
                        <SelectItem value="CHEST_PASS">
                          {locale === 'sv' ? 'Bröstkast' : 'Chest pass'}
                        </SelectItem>
                        <SelectItem value="ROTATIONAL">
                          {locale === 'sv' ? 'Rotationskast' : 'Rotational throw'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {locale === 'sv' ? 'Standard: överhands stående kast' : 'Standard: standing overhead throw'}
                    </FormDescription>
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

              {liveTier && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {locale === 'sv' ? 'Prestandanivå:' : 'Performance level:'}
                  </span>
                  <TestBenchmarkBadge tier={liveTier} />
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
                        placeholder={locale === 'sv' ? 'Teknik, kastvarianter, observationer...' : 'Technique, throw variations, observations...'}
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
              : locale === 'sv' ? 'Spara medicinbollskast' : 'Save medicine ball throw'}
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
              {result.client?.name} - {new Date(result.testDate).toLocaleDateString(dateLocale)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <CompactResult
                label={locale === 'sv' ? 'Kastlängd' : 'Throw distance'}
                value={result.primaryResult}
                unit="m"
                tier={result.tier}
              />
              <CompactResult
                label={locale === 'sv' ? 'Bollvikt' : 'Ball weight'}
                value={result.rawData?.ballWeight}
                unit="kg"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
