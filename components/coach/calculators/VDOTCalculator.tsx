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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

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
      alert(error instanceof Error ? error.message : 'Calculation failed');
    } finally {
      setSubmitting(false);
    }
  }

  const watchDistance = form.watch('raceDistance');

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Race Result</CardTitle>
              <CardDescription>
                Enter a recent race result to calculate your VDOT
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="raceDistance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Race Distance</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
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
                <FormLabel>Race Time</FormLabel>
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
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>Hours</FormDescription>
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
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>Minutes</FormDescription>
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
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>Seconds</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? 'Calculating...' : 'Calculate VDOT'}
          </Button>
        </form>
      </Form>

      {result && (
        <div className="space-y-6">
          {/* VDOT Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Your VDOT Score <InfoTooltip conceptKey="vdot" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center p-8 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">VDOT</p>
                <p className="text-6xl font-bold">{result.vdot.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground mt-4">
                  Based on {getDistanceName(result.distance)} in {formatTime(result.timeSeconds)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">VO₂max Estimate</p>
                  <p className="text-2xl font-bold">{result.vo2maxEstimate.toFixed(1)} ml/kg/min</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Race Pace</p>
                  <p className="text-2xl font-bold">{result.racePace.toFixed(2)} min/km</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Training Paces */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Training Paces (Jack Daniels)
              </CardTitle>
              <CardDescription>
                Recommended training paces based on your VDOT
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <p className="font-medium">Easy (E)</p>
                    <p className="text-sm text-muted-foreground">59-74% VO₂max • Conversational pace</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono">{result.trainingPaces.easy.min.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">to {result.trainingPaces.easy.max.toFixed(2)} min/km</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div>
                    <p className="font-medium">Marathon (M)</p>
                    <p className="text-sm text-muted-foreground">75-84% VO₂max • Sustainable pace</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono">{result.trainingPaces.marathon.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">min/km</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div>
                    <p className="font-medium">Threshold (T)</p>
                    <p className="text-sm text-muted-foreground">83-88% VO₂max • Comfortably hard</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono">{result.trainingPaces.threshold.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">min/km</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div>
                    <p className="font-medium">Interval (I)</p>
                    <p className="text-sm text-muted-foreground">95-100% VO₂max • Hard but controlled</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono">{result.trainingPaces.interval.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">min/km (400m in {formatSeconds(result.trainingPaces.interval400m)})</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div>
                    <p className="font-medium">Repetition (R)</p>
                    <p className="text-sm text-muted-foreground">105-120% VO₂max • Speed development</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono">{result.trainingPaces.repetition.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">min/km (200m in {formatSeconds(result.trainingPaces.repetition200m)})</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equivalent Race Times */}
          <Card>
            <CardHeader>
              <CardTitle>Equivalent Race Times</CardTitle>
              <CardDescription>
                Predicted race times at other distances based on your VDOT
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.equivalentTimes && (
                  <>
                    <div className="flex justify-between items-center p-3 bg-muted rounded">
                      <span className="font-medium">5K</span>
                      <span className="font-mono">{formatTime(result.equivalentTimes['5K'])}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded">
                      <span className="font-medium">10K</span>
                      <span className="font-mono">{formatTime(result.equivalentTimes['10K'])}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded">
                      <span className="font-medium">Half Marathon</span>
                      <span className="font-mono">{formatTime(result.equivalentTimes.halfMarathon)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded">
                      <span className="font-medium">Marathon</span>
                      <span className="font-mono">{formatTime(result.equivalentTimes.marathon)}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Training Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Training Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm">
                  <Badge>E</Badge>
                  <span>Easy runs: 65-79% of weekly mileage. Build aerobic base.</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Badge>M</Badge>
                  <span>Marathon pace: Long runs and race-specific work (10-20% of weekly mileage).</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Badge>T</Badge>
                  <span>Threshold: 20-40 min continuous or 5-15 min intervals. Max 10% of weekly mileage.</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Badge>I</Badge>
                  <span>Intervals: 3-5 min reps, total 8% of weekly mileage. Recovery = workout time.</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Badge>R</Badge>
                  <span>Repetitions: 30s-2min reps, total 5% of weekly mileage. Full recovery between reps.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
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
