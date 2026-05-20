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
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
} from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowRight, Droplets, Bike, Footprints, Waves, Activity, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

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
      toast.error(error instanceof Error ? error.message : 'Conversion failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <GlassCard glow="blue" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
            <GlassCardHeader>
              <GlassCardTitle className="text-slate-900 dark:text-white font-semibold">Running Workout Details</GlassCardTitle>
              <GlassCardDescription className="text-slate-650 dark:text-slate-400">Enter the original running workout to convert</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4">
              <FormField
                control={form.control}
                name="workout.type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-350">Workout Type</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Easy Run, Tempo, Intervals" className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white" />
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
                      <FormLabel className="text-slate-700 dark:text-slate-350">Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={10}
                          max={300}
                          className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
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
                      <FormLabel className="text-slate-700 dark:text-slate-350">TSS (Training Stress Score)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={300}
                          className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
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
                    <FormLabel className="text-slate-700 dark:text-slate-350">Intensity</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
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
            </GlassCardContent>
          </GlassCard>

          <GlassCard glow="blue" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
            <GlassCardHeader>
              <GlassCardTitle className="text-slate-900 dark:text-white font-semibold">Cross-Training Modality</GlassCardTitle>
              <GlassCardDescription className="text-slate-650 dark:text-slate-400">Select alternative training modality</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4">
              <FormField
                control={form.control}
                name="targetModality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-350">Target Modality</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DEEP_WATER_RUNNING">
                          <div className="flex items-center gap-2">
                            <Droplets className="h-4 w-4 text-blue-500" />
                            <span>Deep Water Running (95-100% retention)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="CYCLING">
                          <div className="flex items-center gap-2">
                            <Bike className="h-4 w-4 text-emerald-500" />
                            <span>Cycling (70-80% retention)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="ELLIPTICAL">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-orange-500" />
                            <span>Elliptical (60-70% retention)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="SWIMMING">
                          <div className="flex items-center gap-2">
                            <Waves className="h-4 w-4 text-sky-500" />
                            <span>Swimming (40-50% retention)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="ALTERG">
                          <div className="flex items-center gap-2">
                            <Footprints className="h-4 w-4 text-purple-500" />
                            <span>AlterG (80-95% retention)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="ROWING">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-rose-500" />
                            <span>Rowing (60-75% retention)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </GlassCardContent>
          </GlassCard>

          <GlassCard glow="blue" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
            <GlassCardHeader>
              <GlassCardTitle className="text-slate-900 dark:text-white font-semibold">Injury Context (Optional)</GlassCardTitle>
              <GlassCardDescription className="text-slate-650 dark:text-slate-400">Provide injury details for fitness retention prediction</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4">
              <FormField
                control={form.control}
                name="injuryContext.severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-350">Injury Severity</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
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
                    <FormLabel className="text-slate-700 dark:text-slate-350">Expected Duration (weeks)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 4"
                        className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                        {...field}
                        value={field.value || ''}
                        onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription className="text-slate-500 dark:text-slate-450">Expected time away from running</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </GlassCardContent>
          </GlassCard>

          {watchModality === 'ALTERG' && (
            <GlassCard glow="blue" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
              <GlassCardHeader>
                <GlassCardTitle className="text-slate-900 dark:text-white font-semibold">AlterG Settings</GlassCardTitle>
                <GlassCardDescription className="text-slate-650 dark:text-slate-400">Body weight support progression</GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="altergSettings.currentBodyWeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-slate-350">Current Body Weight (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={30}
                            max={100}
                            placeholder="e.g., 50"
                            className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
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
                        <FormLabel className="text-slate-700 dark:text-slate-350">Target Body Weight (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={30}
                            max={100}
                            placeholder="e.g., 100"
                            className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
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
              </GlassCardContent>
            </GlassCard>
          )}

          <Button type="submit" size="lg" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md">
            {submitting ? 'Converting...' : 'Convert Workout'}
          </Button>
        </form>
      </Form>

      {result && (
        <div className="space-y-6">
          <GlassCard glow="purple" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
                <ArrowRight className="h-5 w-5 text-purple-500" />
                Conversion Results
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-6">
              {/* Conversion Overview */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded-lg">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Original Workout</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-450">Type:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{result.conversion.original.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-450">Duration:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{result.conversion.original.duration} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-450">TSS:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{result.conversion.original.tss}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-slate-900 dark:text-blue-100 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">Converted Workout</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-800 dark:text-blue-400">Modality:</span>
                      <span className="font-semibold text-blue-950 dark:text-blue-100">{result.equivalency.modality.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-800 dark:text-blue-400">Duration:</span>
                      <span className="font-semibold text-blue-950 dark:text-blue-100">{result.conversion.converted.duration} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-800 dark:text-blue-400">Adjusted TSS:</span>
                      <span className="font-semibold text-blue-950 dark:text-blue-100">{result.conversion.converted.tss}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Equivalency Details */}
              <div className="p-4 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded-lg">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Modality Equivalencies</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-450 font-medium">Fitness Retention</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{result.equivalency.fitnessRetention}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-450 font-medium">TSS Multiplier</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{result.equivalency.tssMultiplier.toFixed(2)}x</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-450 font-medium">HR Adjustment</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{result.equivalency.hrAdjustment > 0 ? '+' : ''}{result.equivalency.hrAdjustment} bpm</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-450 font-medium">Biomechanical Similarity</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{result.equivalency.biomechanicalSimilarity}%</p>
                  </div>
                </div>
              </div>

              {/* Fitness Projection */}
              {result.fitnessProjection && (
                <div className="p-4 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-500/20 text-orange-900 dark:text-orange-300 rounded-lg">
                  <h4 className="font-semibold text-orange-950 dark:text-orange-300 mb-3">Fitness Projection</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm opacity-80">Expected Retention After {form.watch('injuryContext.expectedDuration')} Weeks</p>
                      <p className="text-3xl font-bold mt-1">
                        {result.fitnessProjection.expectedRetention.vo2maxRetention.toFixed(1)}% VO₂max
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-2">Return Timeline:</p>
                      <div className="space-y-1 text-sm opacity-90">
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
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-500/20 text-blue-900 dark:text-blue-300 rounded-lg">
                  <h4 className="font-semibold text-blue-950 dark:text-blue-300 mb-3">AlterG Progression Protocol</h4>
                  <div className="space-y-2">
                    {result.altergProgression.phases.map((phase: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white/5 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 dark:text-white">{phase.phase}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-450">
                            {phase.bodyWeightSupport}% body weight • {phase.duration} weeks
                          </p>
                        </div>
                        <Badge variant="outline" className="border-blue-500/30 text-blue-750 dark:text-blue-300 font-semibold">{phase.progressionCriteria}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Recommendations</h4>
                <ul className="space-y-2">
                  {result.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <span className="text-slate-400">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Conversion Notes */}
              {result.conversion.notes && result.conversion.notes.length > 0 && (
                <Alert className="bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200 dark:border-white/5">
                  <AlertDescription className="text-slate-800 dark:text-slate-250">
                    <p className="font-semibold mb-2">Conversion Notes:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {result.conversion.notes.map((note: string, i: number) => (
                        <li key={i} className="text-sm">{note}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </GlassCardContent>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
