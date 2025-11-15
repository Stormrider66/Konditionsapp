'use client';

/**
 * Field Test Form
 *
 * Submit and analyze field tests:
 * - 30-Minute Time Trial (gold standard for LT2)
 * - HR Drift Test (validates easy pace)
 * - Critical Velocity Test (2-4 trials)
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

const thirtyMinTTSchema = z.object({
  testType: z.literal('THIRTY_MIN_TT'),
  athleteId: z.string().min(1, 'Select an athlete'),
  distance: z.number().min(4000).max(12000),
  duration: z.number().min(1700).max(1900),
  averageHR: z.number().min(120).max(200),
  maxHR: z.number().min(130).max(220),
  conditions: z.object({
    temperature: z.number().optional(),
    wind: z.string().optional(),
    surface: z.string().optional()
  }).optional()
});

const hrDriftSchema = z.object({
  testType: z.literal('HR_DRIFT'),
  athleteId: z.string().min(1, 'Select an athlete'),
  duration: z.number().min(40).max(80),
  firstHalfAvgHR: z.number().min(100).max(180),
  secondHalfAvgHR: z.number().min(100).max(190),
  pace: z.number(),
  powerConstant: z.boolean().optional()
});

const cvSchema = z.object({
  testType: z.literal('CRITICAL_VELOCITY'),
  athleteId: z.string().min(1, 'Select an athlete'),
  trials: z.array(z.object({
    distance: z.number().min(400).max(5000),
    timeSeconds: z.number().min(60).max(2000)
  })).min(2).max(4)
});

type ThirtyMinTTData = z.infer<typeof thirtyMinTTSchema>;
type HRDriftData = z.infer<typeof hrDriftSchema>;
type CVData = z.infer<typeof cvSchema>;

interface FieldTestFormProps {
  athletes: Array<{ id: string; name: string }>;
}

export function FieldTestForm({ athletes }: FieldTestFormProps) {
  const router = useRouter();
  const [testType, setTestType] = useState<'THIRTY_MIN_TT' | 'HR_DRIFT' | 'CRITICAL_VELOCITY'>('THIRTY_MIN_TT');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleSubmit(data: any) {
    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/field-tests', {
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
      console.error('Field test submission failed:', error);
      alert(error instanceof Error ? error.message : 'Test submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={testType} onValueChange={(v) => setTestType(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="THIRTY_MIN_TT">30-Min TT</TabsTrigger>
          <TabsTrigger value="HR_DRIFT">HR Drift</TabsTrigger>
          <TabsTrigger value="CRITICAL_VELOCITY">Critical Velocity</TabsTrigger>
        </TabsList>

        <TabsContent value="THIRTY_MIN_TT">
          <ThirtyMinTTForm
            athletes={athletes}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </TabsContent>

        <TabsContent value="HR_DRIFT">
          <HRDriftForm
            athletes={athletes}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </TabsContent>

        <TabsContent value="CRITICAL_VELOCITY">
          <CriticalVelocityForm
            athletes={athletes}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </TabsContent>
      </Tabs>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="text-2xl font-bold">{result.confidence}</p>
              </div>

              {result.validation && !result.validation.isValid && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {result.validation.errors.join(', ')}
                  </AlertDescription>
                </Alert>
              )}

              {result.recommendations && (
                <div>
                  <p className="font-medium mb-2">Recommendations:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {result.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="text-sm">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button onClick={() => router.push(`/coach/tests/${result.fieldTest.id}`)}>
                View Full Results
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ThirtyMinTTForm({ athletes, onSubmit, submitting }: {
  athletes: Array<{ id: string; name: string }>;
  onSubmit: (data: ThirtyMinTTData) => void;
  submitting: boolean;
}) {
  const form = useForm<ThirtyMinTTData>({
    resolver: zodResolver(thirtyMinTTSchema),
    defaultValues: {
      testType: 'THIRTY_MIN_TT',
      duration: 1800
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>30-Minute Time Trial</CardTitle>
            <CardDescription>
              Gold standard for LT2 determination (r=0.96 with MLSS)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="athleteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Athlete</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select athlete" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {athletes.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="distance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Distance (meters)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={4000}
                      max={12000}
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Distance covered in 30 minutes</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="averageHR"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Average HR (bpm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={120}
                      max={200}
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
              name="maxHR"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max HR (bpm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={130}
                      max={220}
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Analyzing...' : 'Submit Test'}
        </Button>
      </form>
    </Form>
  );
}

function HRDriftForm({ athletes, onSubmit, submitting }: {
  athletes: Array<{ id: string; name: string }>;
  onSubmit: (data: HRDriftData) => void;
  submitting: boolean;
}) {
  const form = useForm<HRDriftData>({
    resolver: zodResolver(hrDriftSchema),
    defaultValues: {
      testType: 'HR_DRIFT',
      duration: 60
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>HR Drift Test</CardTitle>
            <CardDescription>
              Validates easy pace - drift &lt;5% indicates pace is below LT1
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="athleteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Athlete</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select athlete" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {athletes.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={40}
                      max={80}
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Test duration (40-80 minutes)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="firstHalfAvgHR"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Half Avg HR (bpm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={100}
                      max={180}
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
              name="secondHalfAvgHR"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Second Half Avg HR (bpm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={100}
                      max={190}
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
              name="pace"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pace (min/km)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Analyzing...' : 'Submit Test'}
        </Button>
      </form>
    </Form>
  );
}

function CriticalVelocityForm({ athletes, onSubmit, submitting }: {
  athletes: Array<{ id: string; name: string }>;
  onSubmit: (data: CVData) => void;
  submitting: boolean;
}) {
  const form = useForm<CVData>({
    resolver: zodResolver(cvSchema),
    defaultValues: {
      testType: 'CRITICAL_VELOCITY',
      trials: [
        { distance: 1200, timeSeconds: 240 },
        { distance: 3000, timeSeconds: 720 }
      ]
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Critical Velocity Test</CardTitle>
            <CardDescription>
              2-4 time trials at different distances (R² &gt; 0.95 needed for reliability)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="athleteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Athlete</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select athlete" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {athletes.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {[0, 1, 2, 3].map(index => (
              <div key={index} className="border p-4 rounded-lg space-y-4">
                <h4 className="font-medium">Trial {index + 1}</h4>

                <FormField
                  control={form.control}
                  name={`trials.${index}.distance`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distance (meters)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={400}
                          max={5000}
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
                  name={`trials.${index}.timeSeconds`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time (seconds)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={60}
                          max={2000}
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Analyzing...' : 'Submit Test'}
        </Button>
      </form>
    </Form>
  );
}
