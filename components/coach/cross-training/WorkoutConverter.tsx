'use client';

/**
 * Cross-Training Workout Converter
 *
 * Convert running workouts to cross-training equivalents with:
 * - 6 modality options (DWR, cycling, elliptical, swimming, AlterG, rowing)
 * - Fitness retention prediction
 * - AlterG progression protocols
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowRight, Droplets, Bike, Footprints, Waves, Activity, TrendingUp } from 'lucide-react';

const converterSchema = z.object({
  workout: z.object({
    type: z.string(),
    duration: z.number().min(10).max(300),
    distance: z.number().optional(),
    intensity: z.string(),
    tss: z.number().min(0).max(300),
    targetHR: z.number().optional()
  }),
  targetModality: z.enum(['DEEP_WATER_RUNNING', 'CYCLING', 'ELLIPTICAL', 'SWIMMING', 'ALTERG', 'ROWING']),
  injuryContext: z.object({
    injuryType: z.string().optional(),
    severity: z.enum(['MILD', 'MODERATE', 'SEVERE']).optional(),
    expectedDuration: z.number().optional()
  }).optional(),
  altergSettings: z.object({
    currentBodyWeight: z.number().min(30).max(100).optional(),
    targetBodyWeight: z.number().min(30).max(100).optional()
  }).optional()
});

type ConverterFormData = z.infer<typeof converterSchema>;

export function WorkoutConverter() {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const form = useForm<ConverterFormData>({
    resolver: zodResolver(converterSchema),
    defaultValues: {
      workout: {
        type: 'EASY_RUN',
        duration: 60,
        intensity: 'EASY',
        tss: 50
      },
      targetModality: 'DEEP_WATER_RUNNING'
    }
  });

  const watchModality = form.watch('targetModality');

  async function onSubmit(data: ConverterFormData) {
    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/cross-training/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const resultData = await response.json();
      setResult(resultData.data);
    } catch (error) {
      console.error('Conversion failed:', error);
      alert(error instanceof Error ? error.message : 'Conversion failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Running Workout Details</CardTitle>
              <CardDescription>Enter the original running workout to convert</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="workout.type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workout Type</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Easy Run, Tempo, Intervals" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="workout.duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={10}
                          max={300}
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workout.tss"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TSS (Training Stress Score)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={300}
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="workout.intensity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intensity</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RECOVERY">Recovery</SelectItem>
                        <SelectItem value="EASY">Easy</SelectItem>
                        <SelectItem value="MODERATE">Moderate</SelectItem>
                        <SelectItem value="TEMPO">Tempo</SelectItem>
                        <SelectItem value="THRESHOLD">Threshold</SelectItem>
                        <SelectItem value="INTERVAL">Interval</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cross-Training Modality</CardTitle>
              <CardDescription>Select alternative training modality</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="targetModality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Modality</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DEEP_WATER_RUNNING">
                          <div className="flex items-center gap-2">
                            <Droplets className="h-4 w-4" />
                            <span>Deep Water Running (95-100% retention)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="CYCLING">
                          <div className="flex items-center gap-2">
                            <Bike className="h-4 w-4" />
                            <span>Cycling (70-80% retention)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="ELLIPTICAL">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            <span>Elliptical (60-70% retention)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="SWIMMING">
                          <div className="flex items-center gap-2">
                            <Waves className="h-4 w-4" />
                            <span>Swimming (40-50% retention)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="ALTERG">
                          <div className="flex items-center gap-2">
                            <Footprints className="h-4 w-4" />
                            <span>AlterG (80-95% retention)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="ROWING">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            <span>Rowing (60-75% retention)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Injury Context (Optional)</CardTitle>
              <CardDescription>Provide injury details for fitness retention prediction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="injuryContext.severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Injury Severity</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MILD">Mild</SelectItem>
                        <SelectItem value="MODERATE">Moderate</SelectItem>
                        <SelectItem value="SEVERE">Severe</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="injuryContext.expectedDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Duration (weeks)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 4"
                        {...field}
                        value={field.value || ''}
                        onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>Expected time away from running</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {watchModality === 'ALTERG' && (
            <Card>
              <CardHeader>
                <CardTitle>AlterG Settings</CardTitle>
                <CardDescription>Body weight support progression</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="altergSettings.currentBodyWeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Body Weight (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={30}
                            max={100}
                            placeholder="e.g., 50"
                            {...field}
                            value={field.value || ''}
                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="altergSettings.targetBodyWeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Body Weight (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={30}
                            max={100}
                            placeholder="e.g., 100"
                            {...field}
                            value={field.value || ''}
                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? 'Converting...' : 'Convert Workout'}
          </Button>
        </form>
      </Form>

      {result && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5" />
                Conversion Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Conversion Overview */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-3">Original Workout</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">{result.conversion.original.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">{result.conversion.original.duration} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">TSS:</span>
                      <span className="font-medium">{result.conversion.original.tss}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-primary/10 rounded-lg">
                  <h4 className="font-medium mb-3">Converted Workout</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Modality:</span>
                      <span className="font-medium">{result.equivalency.modality.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">{result.conversion.converted.duration} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Adjusted TSS:</span>
                      <span className="font-medium">{result.conversion.converted.tss}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Equivalency Details */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-3">Modality Equivalencies</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Fitness Retention</p>
                    <p className="text-2xl font-bold">{result.equivalency.fitnessRetention}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">TSS Multiplier</p>
                    <p className="text-2xl font-bold">{result.equivalency.tssMultiplier.toFixed(2)}x</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">HR Adjustment</p>
                    <p className="text-2xl font-bold">{result.equivalency.hrAdjustment > 0 ? '+' : ''}{result.equivalency.hrAdjustment} bpm</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Biomechanical Similarity</p>
                    <p className="text-2xl font-bold">{result.equivalency.biomechanicalSimilarity}%</p>
                  </div>
                </div>
              </div>

              {/* Fitness Projection */}
              {result.fitnessProjection && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-medium mb-3">Fitness Projection</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Expected Retention After {form.watch('injuryContext.expectedDuration')} Weeks</p>
                      <p className="text-3xl font-bold">
                        {result.fitnessProjection.expectedRetention.vo2maxRetention.toFixed(1)}% VO₂max
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Return Timeline:</p>
                      <div className="space-y-1 text-sm">
                        <p>• Week 1-2: {result.fitnessProjection.returnTimeline.week1to2}</p>
                        <p>• Week 3-4: {result.fitnessProjection.returnTimeline.week3to4}</p>
                        <p>• Week 5+: {result.fitnessProjection.returnTimeline.week5plus}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AlterG Progression */}
              {result.altergProgression && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium mb-3">AlterG Progression Protocol</h4>
                  <div className="space-y-2">
                    {result.altergProgression.phases.map((phase: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white rounded">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{phase.phase}</p>
                          <p className="text-xs text-muted-foreground">
                            {phase.bodyWeightSupport}% body weight • {phase.duration} weeks
                          </p>
                        </div>
                        <Badge variant="outline">{phase.progressionCriteria}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <h4 className="font-medium mb-3">Recommendations</h4>
                <ul className="space-y-2">
                  {result.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Conversion Notes */}
              {result.conversion.notes && result.conversion.notes.length > 0 && (
                <Alert>
                  <AlertDescription>
                    <p className="font-medium mb-2">Conversion Notes:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {result.conversion.notes.map((note: string, i: number) => (
                        <li key={i} className="text-sm">{note}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
