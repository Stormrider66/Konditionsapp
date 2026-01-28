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
import { Plus, Trash2, Upload, AlertTriangle, Camera } from 'lucide-react';
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
  stages: z.array(stageSchema).min(4, 'Minst 4 steg krävs för D-max analys'),
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

export function SelfReportedLactateForm({ clientId, basePath = '' }: SelfReportedLactateFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

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
        throw new Error(error.message || 'Misslyckades med att spara laktatdata');
      }

      const result = await response.json();
      setValidationResult(result.data.validation);

      toast({
        title: 'Laktatdata sparad!',
        description: 'Din laktatdata har skickats för granskning.',
      });

      if (result.data.validation.isValid) {
        router.push(`${basePath}/athlete/dashboard`);
        router.refresh();
      }
    } catch (error: any) {
      console.error('Error submitting lactate data:', error);
      toast({
        title: 'Något gick fel',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function addStage() {
    const lastStage = fields[fields.length - 1];
    append({
      sequence: fields.length + 1,
      heartRate: lastStage ? lastStage.heartRate + 10 : 120,
      lactate: lastStage ? lastStage.lactate + 1 : 1.0,
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
              <CardTitle>Testinformation</CardTitle>
              <CardDescription>
                Grundläggande information om ditt laktattest
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="testType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Testtyp</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RUNNING">Löpning</SelectItem>
                        <SelectItem value="CYCLING">Cykling</SelectItem>
                        <SelectItem value="SKIING">Skidåkning</SelectItem>
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
                    <FormLabel>Testdatum</FormLabel>
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
                    <FormLabel>Laktatmätare modell (valfritt)</FormLabel>
                    <FormControl>
                      <Input placeholder="t.ex. Lactate Plus" {...field} />
                    </FormControl>
                    <FormDescription>Vilken laktatmätare använde du?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meterCalibrationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senaste kalibrering (valfritt)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>När kalibrerades mätaren senast?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Test Stages */}
          <Card>
            <CardHeader>
              <CardTitle>Teststeg ({fields.length})</CardTitle>
              <CardDescription>
                Lägg till minst 4 steg för D-max analys. Varje steg ska vara 3 minuter långt.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge>Steg {index + 1}</Badge>
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
                            <FormLabel>Hastighet (km/h)</FormLabel>
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
                            <FormLabel>Effekt (watt)</FormLabel>
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
                            <FormLabel>Tempo (min/km)</FormLabel>
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
                          <FormLabel>Puls (slag/min)</FormLabel>
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
                          <FormLabel>Laktat (mmol/L)</FormLabel>
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
                              testStageContext={`Steg ${index + 1}`}
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
                Lägg till steg
              </Button>
            </CardContent>
          </Card>

          {/* Photo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Fotoverifiering (valfritt)
              </CardTitle>
              <CardDescription>
                Ladda upp ett foto på dina laktatvärden för verifiering
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="photoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foto-URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="Länk till foto (Google Drive, Dropbox, etc.)"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Ett foto hjälper din tränare att verifiera värdena
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
              <CardTitle>Anteckningar (valfritt)</CardTitle>
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
                        placeholder="Eventuella anteckningar om testet..."
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
            {isSubmitting ? 'Sparar...' : 'Skicka laktatdata'}
          </Button>
        </form>
      </Form>

      {/* Validation Result */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle>Validering</CardTitle>
          </CardHeader>
          <CardContent>
            {validationResult.isValid ? (
              <Alert>
                <AlertDescription>
                  <p className="font-medium text-green-700">✅ Dina laktatdata ser bra ut!</p>
                  <p className="text-sm mt-1">Data har sparats och skickats till din tränare för granskning.</p>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Valideringsvarningar:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validationResult.errors?.map((error: string, i: number) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                  <p className="text-sm mt-2">
                    Data har sparats men kräver granskning av din tränare.
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
