'use client';

/**
 * Environmental Adjustment Calculator
 *
 * Calculate performance adjustments for:
 * - Temperature/humidity (WBGT)
 * - Altitude
 * - Wind resistance
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
} from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Thermometer, Mountain, Wind, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const environmentalSchema = z.object({
  temperature: z.number().min(-20).max(50).optional(),
  humidity: z.number().min(0).max(100).optional(),
  altitude: z.number().min(0).max(5000).optional(),
  windSpeed: z.number().min(0).max(100).optional(),
  windDirection: z.enum(['HEADWIND', 'TAILWIND', 'CROSSWIND']).optional(),
  baselinePace: z.number().min(3).max(10).optional()
});

type EnvironmentalFormData = z.infer<typeof environmentalSchema>;

export function EnvironmentalCalculator() {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const form = useForm<EnvironmentalFormData>({
    resolver: zodResolver(environmentalSchema),
    defaultValues: {
      temperature: 20,
      humidity: 50,
      altitude: 0,
      windSpeed: 0,
      windDirection: 'HEADWIND'
    }
  });

  async function onSubmit(data: EnvironmentalFormData) {
    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/calculations/environmental', {
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
      console.error('Environmental calculation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Calculation failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="temperature">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="temperature">
                <Thermometer className="h-4 w-4 mr-2" />
                Temperature
              </TabsTrigger>
              <TabsTrigger value="altitude">
                <Mountain className="h-4 w-4 mr-2" />
                Altitude
              </TabsTrigger>
              <TabsTrigger value="wind">
                <Wind className="h-4 w-4 mr-2" />
                Wind
              </TabsTrigger>
            </TabsList>

            <TabsContent value="temperature">
              <GlassCard glow="blue" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
                <GlassCardHeader>
                  <GlassCardTitle className="text-slate-900 dark:text-white font-semibold">Temperature & Humidity (WBGT)</GlassCardTitle>
                  <GlassCardDescription className="text-slate-650 dark:text-slate-400">
                    Wet Bulb Globe Temperature analysis for heat stress
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-slate-300">Temperature (°C)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={-20}
                            max={50}
                            className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription className="text-slate-500 dark:text-slate-450">Air temperature in Celsius</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="humidity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-slate-300">Humidity (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription className="text-slate-500 dark:text-slate-450">Relative humidity percentage</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </GlassCardContent>
              </GlassCard>
            </TabsContent>

            <TabsContent value="altitude">
              <GlassCard glow="blue" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
                <GlassCardHeader>
                  <GlassCardTitle className="text-slate-900 dark:text-white font-semibold">Altitude Adjustment</GlassCardTitle>
                  <GlassCardDescription className="text-slate-650 dark:text-slate-400">
                    Performance impact at elevation (VO₂max decline ~1% per 100m above 1500m)
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="altitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-slate-300">Altitude (meters)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={5000}
                            className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription className="text-slate-500 dark:text-slate-450">
                          Training/race altitude in meters above sea level
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </GlassCardContent>
              </GlassCard>
            </TabsContent>

            <TabsContent value="wind">
              <GlassCard glow="blue" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
                <GlassCardHeader>
                  <GlassCardTitle className="text-slate-900 dark:text-white font-semibold">Wind Resistance</GlassCardTitle>
                  <GlassCardDescription className="text-slate-650 dark:text-slate-400">
                    Wind impact on running performance
                  </GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="windSpeed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-slate-300">Wind Speed (km/h)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
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
                    name="windDirection"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 dark:text-slate-300">Wind Direction</FormLabel>
                        <FormControl>
                          <select
                            className="w-full p-2 bg-white/50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={field.value}
                            onChange={field.onChange}
                          >
                            <option value="HEADWIND" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Headwind</option>
                            <option value="TAILWIND" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Tailwind</option>
                            <option value="CROSSWIND" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Crosswind</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </GlassCardContent>
              </GlassCard>
            </TabsContent>
          </Tabs>

          <GlassCard className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
            <GlassCardHeader>
              <GlassCardTitle className="text-slate-900 dark:text-white font-semibold">Baseline Performance (Optional)</GlassCardTitle>
              <GlassCardDescription className="text-slate-650 dark:text-slate-400">Enter baseline pace to calculate adjusted targets</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <FormField
                control={form.control}
                name="baselinePace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300">Baseline Pace (min/km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g., 4.5"
                        className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                        {...field}
                        value={field.value || ''}
                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription className="text-slate-500 dark:text-slate-450">
                      Sea-level pace in ideal conditions
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </GlassCardContent>
          </GlassCard>

          <Button type="submit" size="lg" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md">
            {submitting ? 'Calculating...' : 'Calculate Adjustments'}
          </Button>
        </form>
      </Form>

      {result && (
        <div className="space-y-6">
          {/* WBGT Results */}
          {result.wbgt && (
            <GlassCard glow="amber" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
                  <Thermometer className="h-5 w-5 text-amber-500" />
                  Heat Stress Analysis (WBGT)
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="space-y-4">
                  <div className={`p-6 rounded-lg ${getWBGTColorClass(result.wbgt.category)}`}>
                    <p className="text-sm opacity-80 mb-2 font-medium">WBGT Index</p>
                    <p className="text-4xl font-bold">{result.wbgt.index.toFixed(1)}°C</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={getWBGTBadgeVariant(result.wbgt.category)} className="font-semibold">
                        {result.wbgt.category}
                      </Badge>
                      <span className="text-sm font-medium">{result.wbgt.risk}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded-lg">
                      <p className="text-sm text-slate-500 dark:text-slate-450 font-medium">Pace Adjustment</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                        {result.wbgt.paceAdjustment > 0 ? '+' : ''}{result.wbgt.paceAdjustment.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-4 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded-lg">
                      <p className="text-sm text-slate-500 dark:text-slate-455 font-medium">HR Adjustment</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                        +{result.wbgt.hrAdjustment.toFixed(0)} bpm
                      </p>
                    </div>
                  </div>

                  <Alert className="bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-white/5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-slate-800 dark:text-slate-250">
                      <p className="font-semibold mb-2">Recommendations:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {result.wbgt.recommendations.map((rec: string, i: number) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </GlassCardContent>
            </GlassCard>
          )}

          {/* Altitude Results */}
          {result.altitude && (
            <GlassCard glow="blue" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
                  <Mountain className="h-5 w-5 text-blue-500" />
                  Altitude Adjustment
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded-lg text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-450 font-semibold mb-1">VO₂max Impact</p>
                      <p className="text-xl font-bold text-slate-950 dark:text-white">
                        {result.altitude.vo2maxImpact.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded-lg text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-450 font-semibold mb-1">Pace Adjustment</p>
                      <p className="text-xl font-bold text-slate-950 dark:text-white">
                        {result.altitude.paceAdjustment > 0 ? '+' : ''}{result.altitude.paceAdjustment.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded-lg text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-455 font-semibold mb-1">Altitude</p>
                      <p className="text-xl font-bold text-slate-950 dark:text-white">{result.altitude.altitude}m</p>
                    </div>
                  </div>

                  {result.altitude.adjustedPace && (
                    <div className="p-4 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded-lg">
                      <p className="text-sm text-slate-500 dark:text-slate-450 mb-2 font-medium">Adjusted Target Pace</p>
                      <p className="text-3xl font-bold text-slate-955 dark:text-white">
                        {result.altitude.adjustedPace.toFixed(2)} min/km
                      </p>
                    </div>
                  )}

                  <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    {result.altitude.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-slate-400">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </GlassCardContent>
            </GlassCard>
          )}

          {/* Wind Results */}
          {result.wind && (
            <GlassCard glow="blue" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
                  <Wind className="h-5 w-5 text-sky-500" />
                  Wind Resistance
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded-lg text-center">
                      <p className="text-sm text-slate-500 dark:text-slate-450 font-medium mb-1">Power Impact</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {result.wind.powerImpact > 0 ? '+' : ''}{result.wind.powerImpact.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded-lg text-center">
                      <p className="text-sm text-slate-500 dark:text-slate-455 font-medium mb-1">Pace Impact</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {result.wind.paceImpact > 0 ? '+' : ''}{result.wind.paceImpact.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded-lg">
                    <p className="text-sm text-slate-550 dark:text-slate-400 mb-1 font-medium">Wind Conditions</p>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {result.wind.windSpeed} km/h {result.wind.direction.toLowerCase()}
                    </p>
                  </div>

                  {result.wind.recommendations && (
                    <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                      {result.wind.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-slate-400">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </GlassCardContent>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  );
}

function getWBGTColorClass(category: string): string {
  switch (category) {
    case 'LOW_RISK':
      return 'bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-500/20 text-emerald-900 dark:text-emerald-350';
    case 'MODERATE_RISK':
      return 'bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-500/20 text-amber-900 dark:text-amber-350';
    case 'HIGH_RISK':
      return 'bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-500/20 text-orange-900 dark:text-orange-350';
    case 'EXTREME_RISK':
      return 'bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-500/20 text-rose-900 dark:text-rose-350';
    default:
      return 'bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 text-slate-900 dark:text-white';
  }
}

function getWBGTBadgeVariant(category: string): 'default' | 'secondary' | 'destructive' {
  if (category === 'HIGH_RISK' || category === 'EXTREME_RISK') return 'destructive';
  if (category === 'MODERATE_RISK') return 'secondary';
  return 'default';
}
