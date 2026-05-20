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
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
} from '@/components/ui/GlassCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

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
      toast.error(error instanceof Error ? error.message : 'Assessment failed');
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
              <GlassCardTitle className="text-slate-900 dark:text-white font-semibold">Injury Assessment</GlassCardTitle>
              <GlassCardDescription className="text-slate-650 dark:text-slate-400">
                University of Delaware pain rules - assessment for return-to-running clearance
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="space-y-6">
              <FormField
                control={form.control}
                name="athleteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-350">Athlete</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
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
                    <FormLabel className="text-slate-700 dark:text-slate-350">Injury Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
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
                    <FormLabel className="text-slate-700 dark:text-slate-350">Current Pain Level (0-10)</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <Slider
                          min={0}
                          max={10}
                          step={1}
                          value={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          className="py-2"
                        />
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-450 font-medium">
                          <span>0 - No pain</span>
                          <span className="font-bold text-lg text-slate-900 dark:text-white">{field.value}</span>
                          <span>10 - Worst pain</span>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription className="text-slate-500 dark:text-slate-450">Rate pain on 0-10 scale</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="painTiming"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-350">When does pain occur?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
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
                    <FormLabel className="text-slate-700 dark:text-slate-350">Symptom Duration (days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription className="text-slate-500 dark:text-slate-450">How many days has the pain persisted?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentACWR"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-350">Current ACWR (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g., 1.2"
                        className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                        {...field}
                        value={field.value || ''}
                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription className="text-slate-500 dark:text-slate-450">
                      Acute:Chronic Workload Ratio (if available)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </GlassCardContent>
          </GlassCard>

          <Button type="submit" size="lg" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md">
            {submitting ? 'Assessing...' : 'Assess Injury'}
          </Button>
        </form>
      </Form>

      {result && (
        <GlassCard glow={result.decision === 'STOP' ? 'red' : result.decision === 'MODIFY' ? 'amber' : 'emerald'} className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
              {result.decision === 'STOP' && <AlertTriangle className="h-5 w-5 text-rose-500" />}
              {result.decision === 'MODIFY' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
              {result.decision === 'PROCEED' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
              Assessment Results
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-6">
            {/* Decision */}
            <Alert className={`${
              result.decision === 'STOP' 
                ? 'bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-500/20 text-rose-950 dark:text-rose-300' 
                : result.decision === 'MODIFY' 
                ? 'bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-500/20 text-amber-950 dark:text-amber-300' 
                : 'bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-500/20 text-emerald-950 dark:text-emerald-300'
            }`}>
              <AlertDescription>
                <p className="font-bold text-lg mb-2">
                  Decision: {result.decision}
                </p>
                <p className="text-sm font-medium">{result.painAssessment.reasoning}</p>
              </AlertDescription>
            </Alert>

            {/* Severity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded-lg">
                <p className="text-sm text-slate-500 dark:text-slate-450 font-medium">Severity</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{result.severity}</p>
              </div>
              <div className="p-4 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded-lg">
                <p className="text-sm text-slate-500 dark:text-slate-450 font-medium">Pain Level</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{result.painAssessment.currentPain}/10</p>
              </div>
            </div>

            {/* ACWR Risk */}
            {result.acwrRisk && (
              <div className="p-4 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded-lg">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Workload Risk</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-550 dark:text-slate-400 font-medium font-semibold">Zone</p>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">{result.acwrRisk.zone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-550 dark:text-slate-400 font-medium font-semibold">Injury Risk</p>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">{result.acwrRisk.injuryRisk}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 font-medium">{result.acwrRisk.recommendation}</p>
              </div>
            )}

            {/* Return to Running Timeline */}
            <div className="p-4 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded-lg">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Return-to-Running Protocol</h4>
              <p className="text-sm text-slate-650 dark:text-slate-400 mb-4 font-medium">
                Estimated timeline: <span className="font-bold text-slate-900 dark:text-white">{result.returnToRunning.estimatedWeeks} weeks</span>
              </p>
              <div className="space-y-2">
                {result.returnToRunning.phases.map((phase: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white">{phase.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-450">{phase.description}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{phase.duration}w</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rehab Protocol */}
            <div className="p-4 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded-lg">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Rehab Protocol: {result.rehabProtocol.name}</h4>
              <p className="text-sm text-slate-650 dark:text-slate-400 mb-4 font-medium">
                Total duration: <span className="font-bold text-slate-900 dark:text-white">{result.rehabProtocol.totalDuration} weeks</span>
              </p>
              <div className="space-y-3">
                {result.rehabProtocol.phases.map((phase: any, i: number) => (
                  <div key={i} className="p-3 bg-white/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/5 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-semibold text-slate-900 dark:text-white">{phase.name}</p>
                      <span className="text-sm text-slate-550 dark:text-slate-400 font-semibold">{phase.duration} weeks</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {phase.exercises.map((ex: string, j: number) => (
                        <span key={j} className="text-xs bg-slate-200/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-300 border border-slate-300/30 dark:border-white/5 px-2.5 py-1 rounded font-medium">
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
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Recommendations</h4>
              <ul className="space-y-2">
                {result.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <span className="text-slate-450 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </GlassCardContent>
        </GlassCard>
      )}
    </div>
  );
}
