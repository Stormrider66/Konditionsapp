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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
      alert(error instanceof Error ? error.message : 'Calculation failed');
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
              <Card>
                <CardHeader>
                  <CardTitle>Temperature & Humidity (WBGT)</CardTitle>
                  <CardDescription>
                    Wet Bulb Globe Temperature analysis for heat stress
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temperature (°C)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={-20}
                            max={50}
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>Air temperature in Celsius</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="humidity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Humidity (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>Relative humidity percentage</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="altitude">
              <Card>
                <CardHeader>
                  <CardTitle>Altitude Adjustment</CardTitle>
                  <CardDescription>
                    Performance impact at elevation (VO₂max decline ~1% per 100m above 1500m)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="altitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Altitude (meters)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={5000}
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Training/race altitude in meters above sea level
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="wind">
              <Card>
                <CardHeader>
                  <CardTitle>Wind Resistance</CardTitle>
                  <CardDescription>
                    Wind impact on running performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="windSpeed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wind Speed (km/h)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
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
                        <FormLabel>Wind Direction</FormLabel>
                        <FormControl>
                          <select
                            className="w-full p-2 border rounded"
                            value={field.value}
                            onChange={field.onChange}
                          >
                            <option value="HEADWIND">Headwind</option>
                            <option value="TAILWIND">Tailwind</option>
                            <option value="CROSSWIND">Crosswind</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle>Baseline Performance (Optional)</CardTitle>
              <CardDescription>Enter baseline pace to calculate adjusted targets</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="baselinePace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Baseline Pace (min/km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g., 4.5"
                        {...field}
                        value={field.value || ''}
                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Sea-level pace in ideal conditions
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? 'Calculating...' : 'Calculate Adjustments'}
          </Button>
        </form>
      </Form>

      {result && (
        <div className="space-y-6">
          {/* WBGT Results */}
          {result.wbgt && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Thermometer className="h-5 w-5" />
                  Heat Stress Analysis (WBGT)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className={`p-6 rounded-lg ${getWBGTColorClass(result.wbgt.category)}`}>
                    <p className="text-sm text-muted-foreground mb-2">WBGT Index</p>
                    <p className="text-4xl font-bold">{result.wbgt.index.toFixed(1)}°C</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={getWBGTBadgeVariant(result.wbgt.category)}>
                        {result.wbgt.category}
                      </Badge>
                      <span className="text-sm">{result.wbgt.risk}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Pace Adjustment</p>
                      <p className="text-2xl font-bold">
                        {result.wbgt.paceAdjustment > 0 ? '+' : ''}{result.wbgt.paceAdjustment.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">HR Adjustment</p>
                      <p className="text-2xl font-bold">
                        +{result.wbgt.hrAdjustment.toFixed(0)} bpm
                      </p>
                    </div>
                  </div>

                  <Alert variant={result.wbgt.category === 'HIGH_RISK' ? 'destructive' : 'default'}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-medium mb-2">Recommendations:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {result.wbgt.recommendations.map((rec: string, i: number) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Altitude Results */}
          {result.altitude && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mountain className="h-5 w-5" />
                  Altitude Adjustment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">VO₂max Impact</p>
                      <p className="text-2xl font-bold">
                        {result.altitude.vo2maxImpact.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pace Adjustment</p>
                      <p className="text-2xl font-bold">
                        {result.altitude.paceAdjustment > 0 ? '+' : ''}{result.altitude.paceAdjustment.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Altitude</p>
                      <p className="text-2xl font-bold">{result.altitude.altitude}m</p>
                    </div>
                  </div>

                  {result.altitude.adjustedPace && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Adjusted Target Pace</p>
                      <p className="text-3xl font-bold">
                        {result.altitude.adjustedPace.toFixed(2)} min/km
                      </p>
                    </div>
                  )}

                  <ul className="space-y-2 text-sm">
                    {result.altitude.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wind Results */}
          {result.wind && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wind className="h-5 w-5" />
                  Wind Resistance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Power Impact</p>
                      <p className="text-2xl font-bold">
                        {result.wind.powerImpact > 0 ? '+' : ''}{result.wind.powerImpact.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pace Impact</p>
                      <p className="text-2xl font-bold">
                        {result.wind.paceImpact > 0 ? '+' : ''}{result.wind.paceImpact.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Wind Conditions</p>
                    <p className="font-medium">
                      {result.wind.windSpeed} km/h {result.wind.direction.toLowerCase()}
                    </p>
                  </div>

                  {result.wind.recommendations && (
                    <ul className="space-y-2 text-sm">
                      {result.wind.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-muted-foreground">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function getWBGTColorClass(category: string): string {
  switch (category) {
    case 'LOW_RISK':
      return 'bg-green-50 border border-green-200';
    case 'MODERATE_RISK':
      return 'bg-yellow-50 border border-yellow-200';
    case 'HIGH_RISK':
      return 'bg-orange-50 border border-orange-200';
    case 'EXTREME_RISK':
      return 'bg-red-50 border border-red-200';
    default:
      return 'bg-muted';
  }
}

function getWBGTBadgeVariant(category: string): 'default' | 'secondary' | 'destructive' {
  if (category === 'HIGH_RISK' || category === 'EXTREME_RISK') return 'destructive';
  if (category === 'MODERATE_RISK') return 'secondary';
  return 'default';
}
