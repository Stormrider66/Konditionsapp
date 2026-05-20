'use client';

/**
 * Self-Reported Lactate Entry Form
 *
 * Allows athletes to submit lactate test results with:
 * - Multi-stage data entry
 * - Speed/power/pace input
 * - Heart rate input
 * - Lactate values
 * - Photo verification (optional)
 * - Automatic validation
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Upload, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LactateScanButton } from '@/components/shared/LactateScanButton';

const stageSchema = z.object({
  sequence: z.number().min(1),
  speed: z.number().min(0).max(30).optional(),
  power: z.number().min(0).max(600).optional(),
  pace: z.number().min(2).max(10).optional(),
  heartRate: z.number().min(80).max(220),
  lactate: z.number().min(0).max(25),
  duration: z.number().min(1).max(30)
});

const lactateFormSchema = z.object({
  testType: z.enum(['RUNNING', 'CYCLING', 'SKIING']),
  testDate: z.string(),
  stages: z.array(stageSchema).min(4, 'At least 4 stages are required for D-max analysis'),
  meterModel: z.string().optional(),
  meterCalibrationDate: z.string().optional(),
  photoUrl: z.string().optional(),
  notes: z.string().optional()
});

type LactateFormData = z.infer<typeof lactateFormSchema>;

interface SelfReportedLactateFormProps {
  clientId: string;
  basePath?: string;
}

interface LactateValidationResult {
  isValid: boolean;
  errors?: string[];
}

type AppLocale = 'en' | 'sv';

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en');

const t = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
);

export function SelfReportedLactateForm({ clientId, basePath = '' }: SelfReportedLactateFormProps) {
  const locale = getAppLocale(useLocale());
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState<LactateValidationResult | null>(null);

  const form = useForm<LactateFormData>({
    resolver: zodResolver(lactateFormSchema),
    defaultValues: {
      testType: 'RUNNING',
      testDate: new Date().toISOString().split('T')[0],
      stages: [
        { sequence: 1, heartRate: 120, lactate: 1.0, duration: 3 },
        { sequence: 2, heartRate: 135, lactate: 1.5, duration: 3 },
        { sequence: 3, heartRate: 150, lactate: 2.2, duration: 3 },
        { sequence: 4, heartRate: 165, lactate: 3.5, duration: 3 }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'stages'
  });

  const watchTestType = form.watch('testType');

  async function onSubmit(data: LactateFormData) {
    setIsSubmitting(true);
    setValidationResult(null);

    try {
      const response = await fetch('/api/lactate/self-reported', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          clientId,
          submittedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save lactate data');
      }

      const result = await response.json();
      setValidationResult(result.data.validation);

      toast({
        title: t(locale, 'Laktatdata sparad!', 'Lactate data saved!'),
        description: t(locale, 'Din laktatdata har skickats för granskning.', 'Your lactate data has been sent for review.'),
      });

      if (result.data.validation.isValid) {
        router.push(`${basePath}/athlete/dashboard`);
        router.refresh();
      }
    } catch (error) {
      console.error('Error submitting lactate data:', error);
      const message = error instanceof Error
        ? error.message
        : t(locale, 'Försök igen senare', 'Try again later');
      toast({
        title: t(locale, 'Något gick fel', 'Something went wrong'),
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Detect the increment pattern from existing stage values
  function detectIncrement(values: (number | undefined | null)[]): number | null {
    const nums = values.filter((v): v is number => v != null && !isNaN(v));
    if (nums.length < 2) return null;
    const diffs: number[] = [];
    for (let i = 1; i < nums.length; i++) {
      diffs.push(nums[i] - nums[i - 1]);
    }
    diffs.sort((a, b) => a - b);
    const median = diffs[Math.floor(diffs.length / 2)];
    return Math.round(median * 10) / 10;
  }

  function addStage() {
    const stages = form.getValues('stages');
    const lastStage = stages[stages.length - 1];

    const speedIncrement = detectIncrement(stages.map(s => s.speed)) ?? 1;
    const powerIncrement = detectIncrement(stages.map(s => s.power)) ?? 25;
    const paceIncrement = detectIncrement(stages.map(s => s.pace)) ?? -0.5;
    const hrIncrement = detectIncrement(stages.map(s => s.heartRate)) ?? 10;

    const newSpeed = watchTestType === 'RUNNING' && lastStage?.speed ? Math.round((lastStage.speed + speedIncrement) * 10) / 10 : undefined;
    const newPower = watchTestType === 'CYCLING' && lastStage?.power ? lastStage.power + powerIncrement : undefined;
    const newPace = watchTestType === 'SKIING' && lastStage?.pace ? Math.max(Math.round((lastStage.pace + paceIncrement) * 10) / 10, 2.5) : undefined;

    append({
      sequence: fields.length + 1,
      speed: newSpeed,
      power: newPower,
      pace: newPace,
      heartRate: lastStage ? lastStage.heartRate + hrIncrement : 120,
      lactate: lastStage ? Math.round((lastStage.lactate * 1.4) * 10) / 10 : 1.0,
      duration: 3
    });
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Test Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t(locale, 'Testinformation', 'Test information')}</CardTitle>
              <CardDescription>
                {t(locale, 'Grundläggande information om ditt laktattest', 'Basic information about your lactate test')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="testType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t(locale, 'Testtyp', 'Test type')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RUNNING">{t(locale, 'Löpning', 'Running')}</SelectItem>
                        <SelectItem value="CYCLING">{t(locale, 'Cykling', 'Cycling')}</SelectItem>
                        <SelectItem value="SKIING">{t(locale, 'Skidåkning', 'Skiing')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="testDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t(locale, 'Testdatum', 'Test date')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meterModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t(locale, 'Laktatmätare modell (valfritt)', 'Lactate meter model (optional)')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t(locale, 't.ex. Lactate Plus', 'e.g. Lactate Plus')} {...field} />
                    </FormControl>
                    <FormDescription>{t(locale, 'Vilken laktatmätare använde du?', 'Which lactate meter did you use?')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meterCalibrationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t(locale, 'Senaste kalibrering (valfritt)', 'Latest calibration (optional)')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>{t(locale, 'När kalibrerades mätaren senast?', 'When was the meter last calibrated?')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Test Stages */}
          <Card>
            <CardHeader>
              <CardTitle>{t(locale, 'Teststeg', 'Test stages')} ({fields.length})</CardTitle>
              <CardDescription>
                {t(locale, 'Lägg till minst 4 steg för D-max analys. Varje steg ska vara 3 minuter långt.', 'Add at least 4 stages for D-max analysis. Each stage should be 3 minutes long.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge>{t(locale, 'Steg', 'Stage')} {index + 1}</Badge>
                    {fields.length > 4 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {watchTestType === 'RUNNING' && (
                      <FormField
                        control={form.control}
                        name={`stages.${index}.speed`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t(locale, 'Hastighet (km/h)', 'Speed (km/h)')}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                {...field}
                                onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {watchTestType === 'CYCLING' && (
                      <FormField
                        control={form.control}
                        name={`stages.${index}.power`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t(locale, 'Effekt (watt)', 'Power (watts)')}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {watchTestType === 'SKIING' && (
                      <FormField
                        control={form.control}
                        name={`stages.${index}.pace`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t(locale, 'Tempo (min/km)', 'Pace (min/km)')}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                {...field}
                                onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name={`stages.${index}.heartRate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t(locale, 'Puls (slag/min)', 'Heart rate (bpm)')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`stages.${index}.lactate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t(locale, 'Laktat (mmol/L)', 'Lactate (mmol/L)')}</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <LactateScanButton
                              onValueDetected={(value) => {
                                form.setValue(`stages.${index}.lactate`, value);
                              }}
                              clientId={clientId}
                              testStageContext={`${t(locale, 'Steg', 'Stage')} ${index + 1}`}
                              size="icon"
                              iconOnly
                              variant="outline"
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addStage}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t(locale, 'Lägg till steg', 'Add stage')}
              </Button>
            </CardContent>
          </Card>

          {/* Photo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                {t(locale, 'Fotoverifiering (valfritt)', 'Photo verification (optional)')}
              </CardTitle>
              <CardDescription>
                {t(locale, 'Ladda upp ett foto på dina laktatvärden för verifiering', 'Upload a photo of your lactate values for verification')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="photoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t(locale, 'Foto-URL', 'Photo URL')}</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder={t(locale, 'Länk till foto (Google Drive, Dropbox, etc.)', 'Link to photo (Google Drive, Dropbox, etc.)')}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(locale, 'Ett foto hjälper din tränare att verifiera värdena', 'A photo helps your coach verify the values')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>{t(locale, 'Anteckningar (valfritt)', 'Notes (optional)')}</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <textarea
                        className="w-full p-2 border rounded"
                        rows={4}
                        placeholder={t(locale, 'Eventuella anteckningar om testet...', 'Any notes about the test...')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
            {isSubmitting ? t(locale, 'Sparar...', 'Saving...') : t(locale, 'Skicka laktatdata', 'Submit lactate data')}
          </Button>
        </form>
      </Form>

      {/* Validation Result */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle>{t(locale, 'Validering', 'Validation')}</CardTitle>
          </CardHeader>
          <CardContent>
            {validationResult.isValid ? (
              <Alert>
                <AlertDescription>
                  <p className="font-medium text-green-700">✅ {t(locale, 'Dina laktatdata ser bra ut!', 'Your lactate data looks good!')}</p>
                  <p className="text-sm mt-1">{t(locale, 'Data har sparats och skickats till din tränare för granskning.', 'Data has been saved and sent to your coach for review.')}</p>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">{t(locale, 'Valideringsvarningar:', 'Validation warnings:')}</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validationResult.errors?.map((error: string, i: number) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                  <p className="text-sm mt-2">
                    {t(locale, 'Data har sparats men kräver granskning av din tränare.', 'Data has been saved but requires review by your coach.')}
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
