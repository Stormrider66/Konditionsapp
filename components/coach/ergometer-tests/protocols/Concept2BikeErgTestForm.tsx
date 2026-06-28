'use client';

/**
 * Concept2 BikeErg Test Form
 *
 * Protocols:
 * - 2K Time Trial
 * - 20-Minute FTP Test
 * - 4x4min Interval Test
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ErgometerTestProtocol } from '@prisma/client';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelDescription as CardDescription,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Info, Timer, Activity } from 'lucide-react';

interface Athlete {
  id: string;
  name: string;
  weight?: number;
}

interface Concept2BikeErgTestFormProps {
  athletes: Athlete[];
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}

// ==================== ZOD SCHEMAS ====================

function localized(locale: string, sv: string, en: string) {
  return locale === 'sv' ? sv : en;
}

function athleteRequired(locale: string) {
  return localized(locale, 'Välj en atlet', 'Select an athlete');
}

function testDateRequired(locale: string) {
  return localized(locale, 'Ange testdatum', 'Enter a test date');
}

const createTt2kSchema = (locale: string) => z.object({
  testProtocol: z.literal(ErgometerTestProtocol.TT_2K),
  clientId: z.string().min(1, athleteRequired(locale)),
  testDate: z.string().min(1, testDateRequired(locale)),
  dragFactor: z.number().min(80).max(200).optional(),
  rawData: z.object({
    distance: z.literal(2000),
    time: z.number().min(180).max(480),
    splits: z.array(z.number()).optional(),
    avgPace: z.number().min(60).max(180),
    avgPower: z.number().min(50).max(800),
    avgStrokeRate: z.number().min(50).max(130), // cadence for bike
    avgHR: z.number().min(100).max(220).optional(),
    maxHR: z.number().min(100).max(230).optional(),
  }),
  avgHR: z.number().min(100).max(220).optional(),
  maxHR: z.number().min(100).max(230).optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

const createTt20MinSchema = (locale: string) => z.object({
  testProtocol: z.literal(ErgometerTestProtocol.TT_20MIN),
  clientId: z.string().min(1, athleteRequired(locale)),
  testDate: z.string().min(1, testDateRequired(locale)),
  dragFactor: z.number().min(80).max(200).optional(),
  rawData: z.object({
    avgPower: z.number().min(50).max(500),
    normalizedPower: z.number().min(50).max(500).optional(),
    avgCadence: z.number().min(50).max(130).optional(),
    correctionFactor: z.number().min(0.85).max(1.0),
  }),
  avgHR: z.number().min(100).max(220).optional(),
  maxHR: z.number().min(100).max(230).optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

type TT2KData = z.infer<ReturnType<typeof createTt2kSchema>>;
type TT20MinData = z.infer<ReturnType<typeof createTt20MinSchema>>;

export function Concept2BikeErgTestForm({ athletes, onSubmit, submitting }: Concept2BikeErgTestFormProps) {
  const [protocol, setProtocol] = useState<'TT_2K' | 'TT_20MIN'>('TT_2K');
  const locale = useLocale();
  const t = (sv: string, en: string) => localized(locale, sv, en);

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t(
            'BikeErg testar cykelkondition med luftmotstånd. Perfekt för crosstraining utan belastning på lederna.',
            'BikeErg tests cycling fitness with air resistance. Ideal for cross-training without joint impact.'
          )}
        </AlertDescription>
      </Alert>

      <Tabs value={protocol} onValueChange={(v) => setProtocol(v as typeof protocol)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="TT_2K" className="flex items-center gap-1">
            <Timer className="h-3 w-3" />
            2K TT
          </TabsTrigger>
          <TabsTrigger value="TT_20MIN" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            20min FTP
          </TabsTrigger>
        </TabsList>

        <TabsContent value="TT_2K">
          <BikeErg2KForm athletes={athletes} onSubmit={onSubmit} submitting={submitting} locale={locale} />
        </TabsContent>

        <TabsContent value="TT_20MIN">
          <BikeErg20MinForm athletes={athletes} onSubmit={onSubmit} submitting={submitting} locale={locale} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== 2K TIME TRIAL FORM ====================

function BikeErg2KForm({
  athletes,
  onSubmit,
  submitting,
  locale,
}: {
  athletes: Athlete[];
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
  locale: string;
}) {
  const t = (sv: string, en: string) => localized(locale, sv, en);
  const form = useForm<TT2KData>({
    resolver: zodResolver(createTt2kSchema(locale)),
    defaultValues: {
      testProtocol: ErgometerTestProtocol.TT_2K,
      testDate: new Date().toISOString().split('T')[0],
      dragFactor: 100,
      rawData: {
        distance: 2000,
        time: 240,
        avgPace: 120,
        avgPower: 200,
        avgStrokeRate: 85,
      },
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>2000m Time Trial (BikeErg)</CardTitle>
        <CardDescription>
          {t('Kort intensivt cykeltest på BikeErg.', 'Short, intensive cycling test on the BikeErg.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Atlet', 'Athlete')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('Välj atlet', 'Select athlete')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {athletes.map((athlete) => (
                          <SelectItem key={athlete.id} value={athlete.id}>
                            {athlete.name}
                          </SelectItem>
                        ))}
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
                    <FormLabel>{t('Testdatum', 'Test date')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dragFactor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drag Factor</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={80}
                        max={200}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>{t('Typiskt 80-130 för BikeErg', 'Typically 80-130 for BikeErg')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <FormField
                control={form.control}
                name="rawData.time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Total tid (sek)', 'Total time (sec)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={180}
                        max={480}
                        step={0.1}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rawData.avgPower"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Snitteffekt (W)', 'Average power (W)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={50}
                        max={800}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rawData.avgStrokeRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Kadens (RPM)', 'Cadence (RPM)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={50}
                        max={130}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rawData.avgHR"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Snittpuls', 'Average HR')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={100}
                        max={220}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rawData.maxHR"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Maxpuls', 'Max HR')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={100}
                        max={230}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rpe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RPE (1-10)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('Bearbetar...', 'Processing...')}
                </>
              ) : (
                t('Skicka in test', 'Submit test')
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ==================== 20-MIN FTP FORM ====================

function BikeErg20MinForm({
  athletes,
  onSubmit,
  submitting,
  locale,
}: {
  athletes: Athlete[];
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
  locale: string;
}) {
  const t = (sv: string, en: string) => localized(locale, sv, en);
  const form = useForm<TT20MinData>({
    resolver: zodResolver(createTt20MinSchema(locale)),
    defaultValues: {
      testProtocol: ErgometerTestProtocol.TT_20MIN,
      testDate: new Date().toISOString().split('T')[0],
      dragFactor: 100,
      rawData: {
        avgPower: 200,
        correctionFactor: 0.95,
      },
    },
  });

  const avgPower = form.watch('rawData.avgPower');
  const correctionFactor = form.watch('rawData.correctionFactor');
  const estimatedFTP = Math.round(avgPower * correctionFactor);

  return (
    <Card>
      <CardHeader>
        <CardTitle>20-Minute FTP Test (BikeErg)</CardTitle>
        <CardDescription>
          {t(
            'Standard FTP-test. Cykla i jämn hög intensitet i 20 minuter. FTP = 95% av snitteffekt.',
            'Standard FTP test. Ride at steady high intensity for 20 minutes. FTP = 95% of average power.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Atlet', 'Athlete')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('Välj atlet', 'Select athlete')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {athletes.map((athlete) => (
                          <SelectItem key={athlete.id} value={athlete.id}>
                            {athlete.name}
                          </SelectItem>
                        ))}
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
                    <FormLabel>{t('Testdatum', 'Test date')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dragFactor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drag Factor</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={80}
                        max={200}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="rawData.avgPower"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Snitteffekt (W)', 'Average power (W)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={50}
                        max={500}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rawData.normalizedPower"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NP (Normalized Power)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={50}
                        max={500}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>{t('Valfritt', 'Optional')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rawData.avgCadence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Snittkadens (RPM)', 'Average cadence (RPM)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={50}
                        max={130}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rawData.correctionFactor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Korrektionsfaktor', 'Correction factor')}</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(parseFloat(v))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0.95">0.95 ({t('Standard', 'Standard')})</SelectItem>
                        <SelectItem value="0.90">0.90 ({t('Ej cyklister', 'Non-cyclists')})</SelectItem>
                        <SelectItem value="0.92">0.92 ({t('Mellanting', 'Intermediate')})</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>{t('FTP = snitt × faktor', 'FTP = average × factor')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* FTP Preview */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>{t('Uppskattad FTP', 'Estimated FTP')}: {estimatedFTP}W</strong> ({avgPower}W × {correctionFactor})
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="avgHR"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Snittpuls', 'Average HR')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={100}
                        max={220}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
                    <FormLabel>{t('Maxpuls', 'Max HR')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={100}
                        max={230}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rpe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RPE (1-10)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('Bearbetar...', 'Processing...')}
                </>
              ) : (
                t('Skicka in test', 'Submit test')
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
