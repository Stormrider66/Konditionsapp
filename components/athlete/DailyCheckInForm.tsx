'use client'

/**
 * Daily Check-In Form Component
 *
 * Comprehensive daily metrics collection form for athletes:
 * - HRV (Heart Rate Variability)
 * - RHR (Resting Heart Rate)
 * - Wellness Questionnaire (7 questions)
 *
 * Automatically calculates readiness score on submission.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'

// Form schema
const checkInSchema = z.object({
  // HRV data (optional)
  hrvRMSSD: z.number().min(1).max(300).optional().nullable(),
  hrvQuality: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']).optional().nullable(),

  // RHR data (optional)
  restingHR: z.number().min(30).max(120).optional().nullable(),

  // Wellness questionnaire (required)
  sleepQuality: z.number().min(1).max(10),
  sleepHours: z.number().min(0).max(14).step(0.5),
  muscleSoreness: z.number().min(1).max(10),
  energyLevel: z.number().min(1).max(10),
  mood: z.number().min(1).max(10),
  stress: z.number().min(1).max(10),
  injuryPain: z.number().min(1).max(10),

  // Notes (optional)
  notes: z.string().max(500).optional(),
})

type CheckInFormData = z.infer<typeof checkInSchema>

interface DailyCheckInFormProps {
  clientId: string
  onSuccess?: () => void
}

export function DailyCheckInForm({ clientId, onSuccess }: DailyCheckInFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [readinessResult, setReadinessResult] = useState<any>(null)
  const [injuryResponse, setInjuryResponse] = useState<any>(null)

  const form = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      hrvRMSSD: undefined,
      hrvQuality: undefined,
      restingHR: undefined,
      sleepQuality: 5,
      sleepHours: 7,
      muscleSoreness: 1, // Default to no soreness
      energyLevel: 5,
      mood: 5,
      stress: 1, // Default to no stress
      injuryPain: 1, // Default to no pain
      notes: '',
    },
  })

  async function onSubmit(data: CheckInFormData) {
    setIsSubmitting(true)
    setReadinessResult(null)

    try {
      // Invert negative scales so backend receives 10 = Good, 1 = Bad
      // UI: 1 = No pain/stress (Good), 10 = High pain/stress (Bad)
      // Backend: 10 = No pain/stress (Good), 1 = High pain/stress (Bad)
      const muscleSorenessScore = 11 - data.muscleSoreness
      const stressScore = 11 - data.stress
      const injuryPainScore = 11 - data.injuryPain

      const response = await fetch('/api/daily-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          date: new Date().toISOString(),
          hrvRMSSD: data.hrvRMSSD || null,
          hrvQuality: data.hrvQuality || null,
          restingHR: data.restingHR || null,
          sleepQuality: data.sleepQuality,
          sleepHours: data.sleepHours,
          muscleSoreness: muscleSorenessScore,
          energyLevel: data.energyLevel,
          mood: data.mood,
          stress: stressScore,
          injuryPain: injuryPainScore,
          notes: data.notes || null,
        }),
      })

      if (!response.ok) {
        const responseText = await response.text()
        console.error('Check-in submission failed:', response.status, responseText)
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch {
          errorData = { error: `Server error: ${response.status}` }
        }
        throw new Error(errorData.error || 'Failed to submit check-in')
      }

      const result = await response.json()

      setReadinessResult(result.assessments?.readiness)
      setInjuryResponse(result.injuryResponse)

      // Show appropriate toast based on injury trigger
      if (result.injuryResponse?.triggered) {
        toast({
          title: '⚠️ Injury/Fatigue Alert',
          description: 'Your workouts have been automatically adjusted. Your coach has been notified.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Check-in submitted',
          description: 'Your daily metrics have been recorded successfully.',
        })
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error('Error submitting check-in:', error)
      toast({
        title: 'Error',
        description: 'Failed to submit check-in. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* HRV Section */}
          <Card>
            <CardHeader>
              <CardTitle>Heart Rate Variability (HRV)</CardTitle>
              <CardDescription>
                Optional - measure with app like HRV4Training or Elite HRV
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="hrvRMSSD"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HRV RMSSD (ms)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 65"
                        {...field}
                        onChange={e =>
                          field.onChange(
                            e.target.value ? parseFloat(e.target.value) : undefined
                          )
                        }
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>Typical range: 20-100 ms</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hrvQuality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Measurement Quality</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select quality" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EXCELLENT">Excellent</SelectItem>
                        <SelectItem value="GOOD">Good</SelectItem>
                        <SelectItem value="FAIR">Fair</SelectItem>
                        <SelectItem value="POOR">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How consistent was your measurement?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* RHR Section */}
          <Card>
            <CardHeader>
              <CardTitle>Resting Heart Rate (RHR)</CardTitle>
              <CardDescription>
                Optional - measure first thing in the morning before getting up
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="restingHR"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resting HR (bpm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 55"
                        {...field}
                        onChange={e =>
                          field.onChange(
                            e.target.value ? parseFloat(e.target.value) : undefined
                          )
                        }
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription>Typical range: 40-80 bpm</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Wellness Questionnaire */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Wellness</CardTitle>
              <CardDescription>
                Answer all 7 questions (1 = poor, 10 = excellent)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="sleepQuality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sleep Quality: {field.value}/10</FormLabel>
                    <FormControl>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[field.value]}
                        onValueChange={vals => field.onChange(vals[0])}
                      />
                    </FormControl>
                    <FormDescription>
                      1 = Very poor, 10 = Excellent
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sleepHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sleep Duration: {field.value} hours</FormLabel>
                    <FormControl>
                      <Slider
                        min={0}
                        max={12}
                        step={0.5}
                        value={[field.value]}
                        onValueChange={vals => field.onChange(vals[0])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="muscleSoreness"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Muscle Soreness: {field.value}/10</FormLabel>
                    <FormControl>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[field.value]}
                        onValueChange={vals => field.onChange(vals[0])}
                      />
                    </FormControl>
                    <FormDescription>
                      1 = No soreness, 10 = Extreme soreness
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="energyLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Energy Level: {field.value}/10</FormLabel>
                    <FormControl>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[field.value]}
                        onValueChange={vals => field.onChange(vals[0])}
                      />
                    </FormControl>
                    <FormDescription>
                      1 = Exhausted, 10 = Full of energy
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mood: {field.value}/10</FormLabel>
                    <FormControl>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[field.value]}
                        onValueChange={vals => field.onChange(vals[0])}
                      />
                    </FormControl>
                    <FormDescription>
                      1 = Very low, 10 = Excellent
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stress Level: {field.value}/10</FormLabel>
                    <FormControl>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[field.value]}
                        onValueChange={vals => field.onChange(vals[0])}
                      />
                    </FormControl>
                    <FormDescription>
                      1 = No stress, 10 = Extreme stress
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="injuryPain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Injury/Pain: {field.value}/10</FormLabel>
                    <FormControl>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[field.value]}
                        onValueChange={vals => field.onChange(vals[0])}
                      />
                    </FormControl>
                    <FormDescription>
                      1 = No pain, 10 = Extreme pain
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle>Notes (Optional)</CardTitle>
              <CardDescription>
                Any additional observations or comments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Felt tired after late night, slight knee discomfort..."
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Submitting...' : 'Submit Check-In'}
          </Button>
        </form>
      </Form>

      {/* Injury Auto-Response Alert */}
      {injuryResponse?.triggered && (
        <Alert variant="destructive" className="border-2">
          <AlertDescription>
            <div className="space-y-4">
              <div>
                <p className="font-bold text-lg mb-1">⚠️ Automatiskt skaderespons aktiverat</p>
                <p className="font-medium text-sm opacity-90">
                  Dina träningspass har automatiskt justerats baserat på rapporterade värden
                </p>
              </div>

              <div className="p-4 bg-background/60 rounded-lg space-y-3">
                <div>
                  <p className="font-semibold mb-1">{injuryResponse.summary?.title}</p>
                  <p className="text-sm opacity-90">{injuryResponse.summary?.message}</p>
                </div>

                {injuryResponse.summary?.programAdjustment && (
                  <div className="pt-2 border-t border-white/20">
                    <p className="text-sm font-medium mb-1">Programjustering:</p>
                    <p className="text-sm opacity-90">{injuryResponse.summary.programAdjustment}</p>
                  </div>
                )}

                {injuryResponse.summary?.nextSteps && injuryResponse.summary.nextSteps.length > 0 && (
                  <div className="pt-2 border-t border-white/20">
                    <p className="text-sm font-medium mb-2">Nästa steg (Coach):</p>
                    <ul className="space-y-1 text-sm opacity-90">
                      {injuryResponse.summary.nextSteps.slice(0, 3).map((step: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-0.5">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs opacity-75">
                <span>Din coach har blivit notifierad</span>
                <span className="font-mono">
                  {injuryResponse.injuryResponse?.workoutsModified || 0} pass modifierade
                </span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Readiness Result */}
      {readinessResult && !injuryResponse?.triggered && (
        <Alert variant={readinessResult.score < 5 ? "destructive" : "default"}>
          <AlertDescription>
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-lg">
                  Readiness Score: {readinessResult.score.toFixed(1)}/10
                </p>
                <p className="font-medium text-muted-foreground">{readinessResult.status}</p>
              </div>

              <div className="p-3 bg-background/50 rounded-md">
                <p className="font-medium mb-1">Rekommendation:</p>
                <p className="text-sm">{readinessResult.recommendation}</p>
              </div>

              {(readinessResult.criticalFlags?.length > 0 || readinessResult.warnings?.length > 0) && (
                <div className="text-sm space-y-1">
                  <p className="font-medium">Orsaker:</p>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    {readinessResult.criticalFlags?.map((flag: string, i: number) => (
                      <li key={`crit-${i}`} className="text-red-500 font-medium">{flag}</li>
                    ))}
                    {readinessResult.warnings?.map((warning: string, i: number) => (
                      <li key={`warn-${i}`}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
