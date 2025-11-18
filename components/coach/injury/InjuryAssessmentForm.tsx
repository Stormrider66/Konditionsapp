'use client';

/**
 * Injury Assessment Form
 *
 * Uses University of Delaware pain rules to assess injuries and generate
 * return-to-running protocols
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const assessmentSchema = z.object({
  athleteId: z.string().min(1, 'Select an athlete'),
  injuryType: z.enum([
    'PLANTAR_FASCIITIS',
    'ACHILLES_TENDINOPATHY',
    'IT_BAND_SYNDROME',
    'PATELLOFEMORAL_PAIN',
    'SHIN_SPLINTS',
    'HAMSTRING_STRAIN',
    'HIP_FLEXOR_STRAIN',
    'STRESS_FRACTURE',
    'GENERAL'
  ]),
  painLevel: z.number().min(0).max(10),
  painTiming: z.enum(['BEFORE', 'DURING', 'AFTER', 'CONSTANT']),
  symptomDuration: z.number().min(1).max(365),
  functionalLimitations: z.array(z.string()).optional(),
  previousTreatment: z.array(z.string()).optional(),
  currentACWR: z.number().optional()
});

type AssessmentFormData = z.infer<typeof assessmentSchema>;

interface InjuryAssessmentFormProps {
  athletes: Array<{ id: string; name: string }>;
  onAssessmentComplete?: (result: any) => void;
}

export function InjuryAssessmentForm({ athletes, onAssessmentComplete }: InjuryAssessmentFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const form = useForm<AssessmentFormData>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      painLevel: 5,
      painTiming: 'DURING',
      symptomDuration: 7
    }
  });

  async function onSubmit(data: AssessmentFormData) {
    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/injury/assess', {
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

      if (onAssessmentComplete) {
        onAssessmentComplete(resultData.data);
      }
    } catch (error) {
      console.error('Injury assessment failed:', error);
      alert(error instanceof Error ? error.message : 'Assessment failed');
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
              <CardTitle>Injury Assessment</CardTitle>
              <CardDescription>
                University of Delaware pain rules - assessment for return-to-running clearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                name="injuryType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Injury Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select injury type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PLANTAR_FASCIITIS">Plantar Fasciitis</SelectItem>
                        <SelectItem value="ACHILLES_TENDINOPATHY">Achilles Tendinopathy</SelectItem>
                        <SelectItem value="IT_BAND_SYNDROME">IT Band Syndrome</SelectItem>
                        <SelectItem value="PATELLOFEMORAL_PAIN">Patellofemoral Pain (Runner&apos;s Knee)</SelectItem>
                        <SelectItem value="SHIN_SPLINTS">Shin Splints</SelectItem>
                        <SelectItem value="HAMSTRING_STRAIN">Hamstring Strain</SelectItem>
                        <SelectItem value="HIP_FLEXOR_STRAIN">Hip Flexor Strain</SelectItem>
                        <SelectItem value="STRESS_FRACTURE">Stress Fracture</SelectItem>
                        <SelectItem value="GENERAL">General/Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="painLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Pain Level (0-10)</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <Slider
                          min={0}
                          max={10}
                          step={1}
                          value={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>0 - No pain</span>
                          <span className="font-bold text-lg">{field.value}</span>
                          <span>10 - Worst pain</span>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>Rate pain on 0-10 scale</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="painTiming"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>When does pain occur?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BEFORE">Before activity (morning stiffness)</SelectItem>
                        <SelectItem value="DURING">During activity</SelectItem>
                        <SelectItem value="AFTER">After activity</SelectItem>
                        <SelectItem value="CONSTANT">Constant (all the time)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="symptomDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symptom Duration (days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>How many days has the pain persisted?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentACWR"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current ACWR (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g., 1.2"
                        {...field}
                        value={field.value || ''}
                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Acute:Chronic Workload Ratio (if available)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? 'Assessing...' : 'Assess Injury'}
          </Button>
        </form>
      </Form>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.decision === 'STOP' && <AlertTriangle className="h-5 w-5 text-destructive" />}
              {result.decision === 'MODIFY' && <AlertTriangle className="h-5 w-5 text-orange-500" />}
              {result.decision === 'PROCEED' && <CheckCircle className="h-5 w-5 text-green-600" />}
              Assessment Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Decision */}
            <Alert variant={result.decision === 'STOP' ? 'destructive' : 'default'}>
              <AlertDescription>
                <p className="font-bold text-lg mb-2">
                  Decision: {result.decision}
                </p>
                <p className="text-sm">{result.painAssessment.reasoning}</p>
              </AlertDescription>
            </Alert>

            {/* Severity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Severity</p>
                <p className="text-2xl font-bold">{result.severity}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pain Level</p>
                <p className="text-2xl font-bold">{result.painAssessment.currentPain}/10</p>
              </div>
            </div>

            {/* ACWR Risk */}
            {result.acwrRisk && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Workload Risk</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Zone</p>
                    <p className="font-bold">{result.acwrRisk.zone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Injury Risk</p>
                    <p className="font-bold">{result.acwrRisk.injuryRisk}</p>
                  </div>
                </div>
                <p className="text-sm mt-2">{result.acwrRisk.recommendation}</p>
              </div>
            )}

            {/* Return to Running Timeline */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-3">Return-to-Running Protocol</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Estimated timeline: <span className="font-bold">{result.returnToRunning.estimatedWeeks} weeks</span>
              </p>
              <div className="space-y-2">
                {result.returnToRunning.phases.map((phase: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-background rounded">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{phase.name}</p>
                      <p className="text-xs text-muted-foreground">{phase.description}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{phase.duration}w</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rehab Protocol */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-3">Rehab Protocol: {result.rehabProtocol.name}</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Total duration: <span className="font-bold">{result.rehabProtocol.totalDuration} weeks</span>
              </p>
              <div className="space-y-3">
                {result.rehabProtocol.phases.map((phase: any, i: number) => (
                  <div key={i} className="p-3 bg-background rounded">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-medium">{phase.name}</p>
                      <span className="text-sm text-muted-foreground">{phase.duration} weeks</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {phase.exercises.map((ex: string, j: number) => (
                        <span key={j} className="text-xs bg-muted px-2 py-1 rounded">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
