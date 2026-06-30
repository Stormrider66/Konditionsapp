'use client';

/**
 * VDOT Calculator
 *
 * Calculate VDOT from race results and generate training paces
 * Based on Jack Daniels' Running Formula
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RolePanel } from '@/components/layouts/role-shell/RolePage';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { toast } from 'sonner';

const vdotSchema = z.object({
  raceDistance: z.enum(['1500', '3000', '5000', '10000', '21097', '42195']),
  raceTime: z.object({
    hours: z.number().min(0).max(10),
    minutes: z.number().min(0).max(59),
    seconds: z.number().min(0).max(59)
  })
});

type VDOTFormData = z.infer<typeof vdotSchema>;

export function VDOTCalculator() {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const form = useForm<VDOTFormData>({
    resolver: zodResolver(vdotSchema),
    defaultValues: {
      raceDistance: '5000',
      raceTime: {
        hours: 0,
        minutes: 20,
        seconds: 0
      }
    }
  });

  async function onSubmit(data: VDOTFormData) {
    setSubmitting(true);
    setResult(null);

    try {
      // Convert time to seconds
      const totalSeconds =
        data.raceTime.hours * 3600 +
        data.raceTime.minutes * 60 +
        data.raceTime.seconds;

      const response = await fetch('/api/calculations/vdot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distance: parseInt(data.raceDistance),
          timeSeconds: totalSeconds
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const resultData = await response.json();
      setResult(resultData.data);
    } catch (error) {
      console.error('VDOT calculation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Calculation failed');
    } finally {
      setSubmitting(false);
    }
  }

  const watchDistance = form.watch('raceDistance');

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <RolePanel className="p-5 sm:p-6">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Race Result</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Enter a recent race result to calculate your VDOT
              </p>
            </div>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="raceDistance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-350">Race Distance</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1500">1500m</SelectItem>
                        <SelectItem value="3000">3000m</SelectItem>
                        <SelectItem value="5000">5K (5000m)</SelectItem>
                        <SelectItem value="10000">10K (10000m)</SelectItem>
                        <SelectItem value="21097">Half Marathon (21.1 km)</SelectItem>
                        <SelectItem value="42195">Marathon (42.2 km)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel className="text-slate-700 dark:text-slate-350">Race Time</FormLabel>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <FormField
                    control={form.control}
                    name="raceTime.hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Hours"
                            min={0}
                            max={10}
                            className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription className="text-slate-500 dark:text-slate-450">Hours</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="raceTime.minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Minutes"
                            min={0}
                            max={59}
                            className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription className="text-slate-500 dark:text-slate-450">Minutes</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="raceTime.seconds"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Seconds"
                            min={0}
                            max={59}
                            className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription className="text-slate-500 dark:text-slate-450">Seconds</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </RolePanel>

          <Button type="submit" size="lg" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md">
            {submitting ? 'Calculating...' : 'Calculate VDOT'}
          </Button>
        </form>
      </Form>

      {result && (
        <div className="space-y-6">
          {/* VDOT Score */}
          <RolePanel className="p-5 sm:p-6">
            <div className="mb-4">
              <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                <Target className="h-5 w-5 text-blue-500" />
                Your VDOT Score <InfoTooltip conceptKey="vdot" />
              </h3>
            </div>
            <div>
              <div className="text-center p-8 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 font-medium">VDOT</p>
                <p className="text-6xl font-bold text-slate-900 dark:text-white">{result.vdot.toFixed(1)}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">
                  Based on {getDistanceName(result.distance)} in {formatTime(result.timeSeconds)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded-lg text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-450 font-medium">VO₂max Estimate</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{result.vo2maxEstimate.toFixed(1)} ml/kg/min</p>
                </div>
                <div className="p-4 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded-lg text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-455 font-medium">Race Pace</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{result.racePace.toFixed(2)} min/km</p>
                </div>
              </div>
            </div>
          </RolePanel>

          {/* Training Paces */}
          <RolePanel className="p-5 sm:p-6">
            <div className="mb-4">
              <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Training Paces (Jack Daniels)
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Recommended training paces based on your VDOT
              </p>
            </div>
            <div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-500/20 rounded-lg">
                  <div>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-300">Easy (E)</p>
                    <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80">59-74% VO₂max • Conversational pace</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono text-emerald-900 dark:text-emerald-300">{result.trainingPaces.easy.min.toFixed(2)}</p>
                    <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80">to {result.trainingPaces.easy.max.toFixed(2)} min/km</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-500/20 rounded-lg">
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-300">Marathon (M)</p>
                    <p className="text-sm text-blue-700/80 dark:text-blue-400/80">75-84% VO₂max • Sustainable pace</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono text-blue-900 dark:text-blue-300">{result.trainingPaces.marathon.toFixed(2)}</p>
                    <p className="text-sm text-blue-700/80 dark:text-blue-400/80">min/km</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-amber-50/55 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-500/20 rounded-lg">
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-305 font-medium">Threshold (T)</p>
                    <p className="text-sm text-amber-700/80 dark:text-amber-400/80">83-88% VO₂max • Comfortably hard</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono text-amber-900 dark:text-amber-305">{result.trainingPaces.threshold.toFixed(2)}</p>
                    <p className="text-sm text-amber-700/80 dark:text-amber-400/80">min/km</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-500/20 rounded-lg">
                  <div>
                    <p className="font-semibold text-orange-900 dark:text-orange-300">Interval (I)</p>
                    <p className="text-sm text-orange-700/80 dark:text-orange-400/80">95-100% VO₂max • Hard but controlled</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono text-orange-900 dark:text-orange-300">{result.trainingPaces.interval.toFixed(2)}</p>
                    <p className="text-sm text-orange-700/80 dark:text-orange-400/80">min/km (400m in {formatSeconds(result.trainingPaces.interval400m)})</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-500/20 rounded-lg">
                  <div>
                    <p className="font-semibold text-rose-900 dark:text-rose-300 font-medium">Repetition (R)</p>
                    <p className="text-sm text-rose-700/80 dark:text-rose-400/80">105-120% VO₂max • Speed development</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono text-rose-900 dark:text-rose-300">{result.trainingPaces.repetition.toFixed(2)}</p>
                    <p className="text-sm text-rose-700/80 dark:text-rose-400/80">min/km (200m in {formatSeconds(result.trainingPaces.repetition200m)})</p>
                  </div>
                </div>
              </div>
            </div>
          </RolePanel>

          {/* Equivalent Race Times */}
          <RolePanel className="p-5 sm:p-6">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Equivalent Race Times</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Predicted race times at other distances based on your VDOT
              </p>
            </div>
            <div>
              <div className="space-y-2">
                {result.equivalentTimes && (
                  <>
                    <div className="flex justify-between items-center p-3 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded">
                      <span className="font-semibold text-slate-800 dark:text-slate-250">5K</span>
                      <span className="font-mono text-slate-900 dark:text-white font-semibold">{formatTime(result.equivalentTimes['5K'])}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded">
                      <span className="font-semibold text-slate-800 dark:text-slate-250">10K</span>
                      <span className="font-mono text-slate-900 dark:text-white font-semibold">{formatTime(result.equivalentTimes['10K'])}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded">
                      <span className="font-semibold text-slate-800 dark:text-slate-250">Halvmaraton</span>
                      <span className="font-mono text-slate-900 dark:text-white font-semibold">{formatTime(result.equivalentTimes.halfMarathon)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded">
                      <span className="font-semibold text-slate-800 dark:text-slate-250">Maraton</span>
                      <span className="font-mono text-slate-900 dark:text-white font-semibold">{formatTime(result.equivalentTimes.marathon)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </RolePanel>

          {/* Training Recommendations */}
          <RolePanel className="p-5 sm:p-6">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Training Recommendations</h3>
            </div>
            <div>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">E</Badge>
                  <span>Easy runs: 65-79% of weekly mileage. Build aerobic base.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">M</Badge>
                  <span>Marathon pace: Long runs and race-specific work (10-20% of weekly mileage).</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">T</Badge>
                  <span>Threshold: 20-40 min continuous or 5-15 min intervals. Max 10% of weekly mileage.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Badge className="bg-orange-600 hover:bg-orange-700 text-white font-semibold">I</Badge>
                  <span>Intervals: 3-5 min reps, total 8% of weekly mileage. Recovery = workout time.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-semibold">R</Badge>
                  <span>Repetitions: 30s-2min reps, total 5% of weekly mileage. Full recovery between reps.</span>
                </li>
              </ul>
            </div>
          </RolePanel>
        </div>
      )}
    </div>
  );
}

function getDistanceName(meters: number): string {
  const distances: Record<number, string> = {
    1500: '1500m',
    3000: '3000m',
    5000: '5K',
    10000: '10K',
    21097: 'Half Marathon',
    42195: 'Marathon'
  };
  return distances[meters] || `${meters}m`;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
}
