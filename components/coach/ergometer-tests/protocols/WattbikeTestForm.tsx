'use client';

/**
 * Wattbike Test Form
 *
 * Protocols:
 * - 6-Second Peak Power (neuromuscular)
 * - 30-Second Sprint (anaerobic capacity)
 * - 20-Minute FTP Test
 * - MAP Ramp Test
 */

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ErgometerTestProtocol } from '@prisma/client';
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
import { Loader2, Info, Zap, Timer, TrendingUp } from 'lucide-react';

interface Athlete {
  id: string;
  name: string;
  weight?: number;
}

interface WattbikeTestFormProps {
  athletes: Athlete[];
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}

// ==================== ZOD SCHEMAS ====================

const athleteRequired = (locale: string) => locale === 'sv' ? 'Välj en atlet' : 'Select an athlete';
const testDateRequired = (locale: string) => locale === 'sv' ? 'Ange testdatum' : 'Enter a test date';

const createPeakPower6sSchema = (locale: string) => z.object({
  testProtocol: z.literal(ErgometerTestProtocol.PEAK_POWER_6S),
  clientId: z.string().min(1, athleteRequired(locale)),
  testDate: z.string().min(1, testDateRequired(locale)),
  airResistance: z.number().min(1).max(10).optional(),
  magnetResistance: z.number().min(1).max(4).optional(),
  rawData: z.object({
    duration: z.number().min(1).max(30),
    peakPower: z.number().min(200).max(3000),
    avgPower: z.number().min(150).max(2500),
    powerSamples: z.array(z.number()).optional(),
    peakRPM: z.number().min(80).max(250).optional(),
    avgRPM: z.number().min(80).max(220).optional(),
    bodyWeight: z.number().min(40).max(150).optional(),
  }),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

const createPeakPower30sSchema = (locale: string) => z.object({
  testProtocol: z.literal(ErgometerTestProtocol.PEAK_POWER_30S),
  clientId: z.string().min(1, athleteRequired(locale)),
  testDate: z.string().min(1, testDateRequired(locale)),
  airResistance: z.number().min(1).max(10).optional(),
  magnetResistance: z.number().min(1).max(4).optional(),
  rawData: z.object({
    duration: z.number().min(1).max(60),
    peakPower: z.number().min(200).max(2500),
    avgPower: z.number().min(100).max(1500),
    minPower: z.number().min(50).max(1000).optional(),
    powerSamples: z.array(z.number()).optional(),
    bodyWeight: z.number().min(40).max(150).optional(),
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
  airResistance: z.number().min(1).max(10).optional(),
  magnetResistance: z.number().min(1).max(4).optional(),
  rawData: z.object({
    avgPower: z.number().min(50).max(500),
    normalizedPower: z.number().min(50).max(500).optional(),
    variabilityIndex: z.number().min(0.9).max(1.2).optional(),
    avgCadence: z.number().min(50).max(130).optional(),
    correctionFactor: z.number().min(0.85).max(1.0),
  }),
  avgHR: z.number().min(100).max(220).optional(),
  maxHR: z.number().min(100).max(230).optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

const createMapRampSchema = (locale: string) => z.object({
  testProtocol: z.literal(ErgometerTestProtocol.MAP_RAMP),
  clientId: z.string().min(1, athleteRequired(locale)),
  testDate: z.string().min(1, testDateRequired(locale)),
  airResistance: z.number().min(1).max(10).optional(),
  rawData: z.object({
    startPower: z.number().min(50).max(200),
    increment: z.number().min(10).max(30),
    stages: z.array(z.object({
      minute: z.number(),
      targetPower: z.number(),
      actualPower: z.number(),
      hr: z.number().optional(),
      completed: z.boolean(),
    })).min(5).max(25),
    mapWatts: z.number().min(100).max(500),
    peakPower: z.number().min(100).max(600).optional(),
    maxHR: z.number().min(100).max(230).optional(),
    timeToExhaustion: z.number().min(300).max(1500),
  }),
  avgHR: z.number().min(100).max(220).optional(),
  maxHR: z.number().min(100).max(230).optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

type PeakPower6sData = z.infer<ReturnType<typeof createPeakPower6sSchema>>;
type PeakPower30sData = z.infer<ReturnType<typeof createPeakPower30sSchema>>;
type TT20MinData = z.infer<ReturnType<typeof createTt20MinSchema>>;
type MAPRampData = z.infer<ReturnType<typeof createMapRampSchema>>;

export function WattbikeTestForm({ athletes, onSubmit, submitting }: WattbikeTestFormProps) {
  const locale = useLocale();
  const t = (sv: string, en: string) => locale === 'sv' ? sv : en;
  const [protocol, setProtocol] = useState<'6S' | '30S' | 'FTP' | 'MAP'>('FTP');

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t('Wattbike är perfekt för cykelspecifika tester. Peak power för kraft, FTP för uthållighet.', 'Wattbike is ideal for cycling-specific tests. Peak power for force, FTP for endurance.')}
        </AlertDescription>
      </Alert>

      <Tabs value={protocol} onValueChange={(v) => setProtocol(v as typeof protocol)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="6S" className="text-xs sm:text-sm">
            <Zap className="h-3 w-3 mr-1" />
            6s Peak
          </TabsTrigger>
          <TabsTrigger value="30S" className="text-xs sm:text-sm">
            <Zap className="h-3 w-3 mr-1" />
            30s Sprint
          </TabsTrigger>
          <TabsTrigger value="FTP" className="text-xs sm:text-sm">
            <Timer className="h-3 w-3 mr-1" />
            20min FTP
          </TabsTrigger>
          <TabsTrigger value="MAP" className="text-xs sm:text-sm">
            <TrendingUp className="h-3 w-3 mr-1" />
            MAP Ramp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="6S">
          <PeakPower6sForm athletes={athletes} onSubmit={onSubmit} submitting={submitting} locale={locale} />
        </TabsContent>

        <TabsContent value="30S">
          <PeakPower30sForm athletes={athletes} onSubmit={onSubmit} submitting={submitting} locale={locale} />
        </TabsContent>

        <TabsContent value="FTP">
          <FTP20MinForm athletes={athletes} onSubmit={onSubmit} submitting={submitting} locale={locale} />
        </TabsContent>

        <TabsContent value="MAP">
          <MAPRampForm athletes={athletes} onSubmit={onSubmit} submitting={submitting} locale={locale} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== 6-SECOND PEAK POWER FORM ====================

function PeakPower6sForm({
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
  const t = (sv: string, en: string) => locale === 'sv' ? sv : en;
  const form = useForm<PeakPower6sData>({
    resolver: zodResolver(createPeakPower6sSchema(locale)),
    defaultValues: {
      testProtocol: ErgometerTestProtocol.PEAK_POWER_6S,
      testDate: new Date().toISOString().split('T')[0],
      airResistance: 8,
      rawData: {
        duration: 6,
        peakPower: 800,
        avgPower: 700,
      },
    },
  });

  const bodyWeight = form.watch('rawData.bodyWeight');
  const peakPower = form.watch('rawData.peakPower');
  const wattsPerKg = bodyWeight ? (peakPower / bodyWeight).toFixed(1) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>6-Second Peak Power Test</CardTitle>
        <CardDescription>
          {t('Maximalt neuromuskulärt krafttest. Mäter explosiv kraft och snabbhet.', 'Maximal neuromuscular power test. Measures explosive power and speed.')}
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
                name="airResistance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Luftmotstånd (1-10)', 'Air resistance (1-10)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>{t('Högt för peak power (8-10)', 'High for peak power (8-10)')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <FormField
                control={form.control}
                name="rawData.peakPower"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Toppeffekt (W)', 'Peak power (W)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={200}
                        max={3000}
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
                name="rawData.avgPower"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Snitteffekt (W)', 'Average power (W)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={150}
                        max={2500}
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
                name="rawData.peakRPM"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topp-RPM</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={80}
                        max={250}
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
                name="rawData.bodyWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Kroppsvikt (kg)', 'Body weight (kg)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={40}
                        max={150}
                        step={0.1}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>{wattsPerKg ? `${wattsPerKg} W/kg` : ''}</FormDescription>
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

// ==================== 30-SECOND SPRINT FORM ====================

function PeakPower30sForm({
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
  const t = (sv: string, en: string) => locale === 'sv' ? sv : en;
  const form = useForm<PeakPower30sData>({
    resolver: zodResolver(createPeakPower30sSchema(locale)),
    defaultValues: {
      testProtocol: ErgometerTestProtocol.PEAK_POWER_30S,
      testDate: new Date().toISOString().split('T')[0],
      airResistance: 7,
      rawData: {
        duration: 30,
        peakPower: 700,
        avgPower: 500,
      },
    },
  });

  const peakPower = form.watch('rawData.peakPower');
  const minPower = form.watch('rawData.minPower');
  const fatigueIndex = peakPower && minPower ? (((peakPower - minPower) / peakPower) * 100).toFixed(1) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>30-Second Sprint Test (Wingate)</CardTitle>
        <CardDescription>
          {t('Anaerobt kapacitetstest. Mäter peak power, snitteffekt och fatigue index.', 'Anaerobic capacity test. Measures peak power, average power, and fatigue index.')}
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
                name="airResistance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Luftmotstånd (1-10)', 'Air resistance (1-10)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <FormField
                control={form.control}
                name="rawData.peakPower"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Toppeffekt (W)', 'Peak power (W)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={200}
                        max={2500}
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
                name="rawData.avgPower"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Snitteffekt (W)', 'Average power (W)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={100}
                        max={1500}
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
                name="rawData.minPower"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Lägsta effekt (W)', 'Lowest power (W)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={50}
                        max={1000}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>{fatigueIndex ? `FI: ${fatigueIndex}%` : ''}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rawData.bodyWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Kroppsvikt (kg)', 'Body weight (kg)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={40}
                        max={150}
                        step={0.1}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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

function FTP20MinForm({
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
  const t = (sv: string, en: string) => locale === 'sv' ? sv : en;
  const form = useForm<TT20MinData>({
    resolver: zodResolver(createTt20MinSchema(locale)),
    defaultValues: {
      testProtocol: ErgometerTestProtocol.TT_20MIN,
      testDate: new Date().toISOString().split('T')[0],
      airResistance: 5,
      rawData: {
        avgPower: 220,
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
        <CardTitle>20-Minute FTP Test</CardTitle>
        <CardDescription>
          {t('Standard FTP-test. Cykla i jämn hög intensitet i 20 minuter. FTP = 95% av snitteffekt.', 'Standard FTP test. Ride at steady high intensity for 20 minutes. FTP = 95% of average power.')}
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
                name="airResistance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Luftmotstånd (1-10)', 'Air resistance (1-10)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
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
                    <FormLabel>NP (Normalized)</FormLabel>
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
                    <FormLabel>{t('Snittkadens', 'Average cadence')}</FormLabel>
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
                        <SelectItem value="0.95">0.95 (Standard)</SelectItem>
                        <SelectItem value="0.90">{t('0.90 (Ej cyklister)', '0.90 (non-cyclists)')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>{t('Uppskattad FTP', 'Estimated FTP')}: {estimatedFTP}W</strong>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="avgHR"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Snittpuls', 'Average heart rate')}</FormLabel>
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
                    <FormLabel>{t('Maxpuls', 'Max heart rate')}</FormLabel>
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

// ==================== MAP RAMP FORM ====================

function MAPRampForm({
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
  const t = (sv: string, en: string) => locale === 'sv' ? sv : en;
  const form = useForm<MAPRampData>({
    resolver: zodResolver(createMapRampSchema(locale)),
    defaultValues: {
      testProtocol: ErgometerTestProtocol.MAP_RAMP,
      testDate: new Date().toISOString().split('T')[0],
      airResistance: 5,
      rawData: {
        startPower: 100,
        increment: 20,
        stages: [],
        mapWatts: 0,
        timeToExhaustion: 0,
      },
    },
  });

  const [mapWatts, setMapWatts] = useState<number>(0);
  const [completedMinutes, setCompletedMinutes] = useState<number>(0);

  function generateStages() {
    const startPower = form.getValues('rawData.startPower');
    const increment = form.getValues('rawData.increment');
    const stages = [];

    for (let i = 0; i < completedMinutes; i++) {
      stages.push({
        minute: i + 1,
        targetPower: startPower + i * increment,
        actualPower: startPower + i * increment,
        completed: true,
      });
    }

    form.setValue('rawData.stages', stages);
    form.setValue('rawData.mapWatts', stages.length > 0 ? stages[stages.length - 1].targetPower : 0);
    form.setValue('rawData.timeToExhaustion', completedMinutes * 60);
    setMapWatts(stages.length > 0 ? stages[stages.length - 1].targetPower : 0);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>MAP Ramp Test</CardTitle>
        <CardDescription>
          {t('Progressivt ramptest till utmattning. Öka effekten varje minut tills du inte kan hålla tempot.', 'Progressive ramp test to exhaustion. Increase power every minute until you cannot hold the pace.')}
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
                name="airResistance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Luftmotstånd (1-10)', 'Air resistance (1-10)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="rawData.startPower"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Starteffekt (W)', 'Start power (W)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={50}
                        max={200}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>{t('Börja lättare än tröskeln', 'Start easier than threshold')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rawData.increment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Ökning/minut (W)', 'Increase/minute (W)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={10}
                        max={30}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>{t('20W är standard', '20 W is standard')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('Antal fullbordade minuter', 'Number of completed minutes')}</label>
                <Input
                  type="number"
                  min={5}
                  max={25}
                  value={completedMinutes}
                  onChange={(e) => setCompletedMinutes(parseInt(e.target.value) || 0)}
                />
                <Button type="button" variant="outline" size="sm" onClick={generateStages}>
                  {t('Beräkna MAP', 'Calculate MAP')}
                </Button>
              </div>
            </div>

            {mapWatts > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>MAP: {mapWatts}W</strong> {t('(senast slutförda minut)', '(last completed minute)')}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="maxHR"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Maxpuls', 'Max heart rate')}</FormLabel>
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

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Anteckningar', 'Notes')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('Anledning till stopp...', 'Reason for stopping...')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={submitting || mapWatts === 0} className="w-full sm:w-auto">
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
