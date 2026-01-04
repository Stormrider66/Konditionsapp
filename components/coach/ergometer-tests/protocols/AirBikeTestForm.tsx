'use client';

/**
 * Air Bike Test Form
 *
 * Supports: Assault Bike, Echo Bike, Schwinn Airdyne
 * Note: Brand-agnostic storage - no automatic conversion between brands
 *
 * Protocols:
 * - 10-Minute Max Calories (HYROX / CrossFit standard)
 * - 30-Second Sprint (anaerobic capacity)
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ErgometerTestProtocol } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Info, Flame, Zap } from 'lucide-react';

interface Athlete {
  id: string;
  name: string;
  weight?: number;
}

interface AirBikeTestFormProps {
  athletes: Athlete[];
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}

// ==================== ZOD SCHEMAS ====================

const tt10MinSchema = z.object({
  testProtocol: z.literal(ErgometerTestProtocol.TT_10MIN),
  clientId: z.string().min(1, 'Valj en atlet'),
  testDate: z.string().min(1, 'Ange testdatum'),
  bikeBrand: z.enum(['ASSAULT', 'ECHO', 'SCHWINN']),
  rawData: z.object({
    totalCalories: z.number().min(50).max(500),
    totalDistance: z.number().min(1000).max(15000).optional(),
    avgRPM: z.number().min(30).max(150).optional(),
    avgPower: z.number().min(50).max(800).optional(),
    caloriesPerMinute: z.array(z.number()).optional(),
    peakRPM: z.number().min(50).max(200).optional(),
  }),
  avgHR: z.number().min(100).max(220).optional(),
  maxHR: z.number().min(100).max(230).optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

const peakPower30sSchema = z.object({
  testProtocol: z.literal(ErgometerTestProtocol.PEAK_POWER_30S),
  clientId: z.string().min(1, 'Valj en atlet'),
  testDate: z.string().min(1, 'Ange testdatum'),
  bikeBrand: z.enum(['ASSAULT', 'ECHO', 'SCHWINN']),
  rawData: z.object({
    duration: z.number().min(1).max(60),
    peakPower: z.number().min(100).max(2000).optional(),
    avgPower: z.number().min(50).max(1500).optional(),
    minPower: z.number().min(20).max(1000).optional(),
    totalCalories: z.number().min(5).max(50),
    peakRPM: z.number().min(50).max(200).optional(),
    bodyWeight: z.number().min(40).max(150).optional(),
  }),
  avgHR: z.number().min(100).max(220).optional(),
  maxHR: z.number().min(100).max(230).optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

type TT10MinData = z.infer<typeof tt10MinSchema>;
type PeakPower30sData = z.infer<typeof peakPower30sSchema>;

export function AirBikeTestForm({ athletes, onSubmit, submitting }: AirBikeTestFormProps) {
  const [protocol, setProtocol] = useState<'10MIN' | '30S'>('10MIN');

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Air Bike testar helkroppsuthallighet. Varden lagras per marke utan automatisk konvertering.
          <br />
          <strong>OBS:</strong> Assault ≠ Echo ≠ Schwinn - jamfor endast inom samma marke.
        </AlertDescription>
      </Alert>

      <Tabs value={protocol} onValueChange={(v) => setProtocol(v as typeof protocol)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="10MIN" className="flex items-center gap-1">
            <Flame className="h-3 w-3" />
            10min Kalorier
          </TabsTrigger>
          <TabsTrigger value="30S" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            30s Sprint
          </TabsTrigger>
        </TabsList>

        <TabsContent value="10MIN">
          <TT10MinForm athletes={athletes} onSubmit={onSubmit} submitting={submitting} />
        </TabsContent>

        <TabsContent value="30S">
          <Sprint30sForm athletes={athletes} onSubmit={onSubmit} submitting={submitting} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== 10-MINUTE MAX CALORIES FORM ====================

function TT10MinForm({
  athletes,
  onSubmit,
  submitting,
}: {
  athletes: Athlete[];
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const form = useForm<TT10MinData>({
    resolver: zodResolver(tt10MinSchema),
    defaultValues: {
      testProtocol: ErgometerTestProtocol.TT_10MIN,
      testDate: new Date().toISOString().split('T')[0],
      bikeBrand: 'ASSAULT',
      rawData: {
        totalCalories: 150,
      },
    },
  });

  const totalCalories = form.watch('rawData.totalCalories');
  const calsPerMinute = totalCalories ? (totalCalories / 10).toFixed(1) : '0';

  return (
    <Card>
      <CardHeader>
        <CardTitle>10-Minute Max Calories Test</CardTitle>
        <CardDescription>
          Standard Air Bike-test for HYROX och CrossFit. Cykla sa manga kalorier som mojligt pa 10 minuter.
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
                    <FormLabel>Atlet</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Valj atlet" />
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
                name="bikeBrand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cykelmarke</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ASSAULT">Assault Bike</SelectItem>
                        <SelectItem value="ECHO">Rogue Echo Bike</SelectItem>
                        <SelectItem value="SCHWINN">Schwinn Airdyne</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Viktigt for benchmark</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <FormField
                control={form.control}
                name="rawData.totalCalories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total kalorier</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={50}
                        max={500}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>{calsPerMinute} cal/min</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rawData.totalDistance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distans (m)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1000}
                        max={15000}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>Valfritt</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rawData.avgRPM"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Snitt RPM</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={30}
                        max={150}
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
                name="rawData.avgPower"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Snitteffekt (W)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={50}
                        max={800}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>Om visas</FormDescription>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="avgHR"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Snittpuls</FormLabel>
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
                    <FormLabel>Maxpuls</FormLabel>
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anteckningar</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Valfria anteckningar..." />
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
                  Bearbetar...
                </>
              ) : (
                'Skicka in test'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ==================== 30-SECOND SPRINT FORM ====================

function Sprint30sForm({
  athletes,
  onSubmit,
  submitting,
}: {
  athletes: Athlete[];
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const form = useForm<PeakPower30sData>({
    resolver: zodResolver(peakPower30sSchema),
    defaultValues: {
      testProtocol: ErgometerTestProtocol.PEAK_POWER_30S,
      testDate: new Date().toISOString().split('T')[0],
      bikeBrand: 'ASSAULT',
      rawData: {
        duration: 30,
        totalCalories: 25,
      },
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>30-Second Sprint Test</CardTitle>
        <CardDescription>
          Maximal sprint for att mäta anaerob kapacitet pa Air Bike.
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
                    <FormLabel>Atlet</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Valj atlet" />
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
                name="bikeBrand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cykelmarke</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ASSAULT">Assault Bike</SelectItem>
                        <SelectItem value="ECHO">Rogue Echo Bike</SelectItem>
                        <SelectItem value="SCHWINN">Schwinn Airdyne</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <FormField
                control={form.control}
                name="rawData.totalCalories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kalorier (30s)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={5}
                        max={50}
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
                name="rawData.peakPower"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Toppeffekt (W)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={100}
                        max={2000}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>Om visas</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rawData.avgPower"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Snitteffekt (W)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={50}
                        max={1500}
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
                name="rawData.peakRPM"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topp RPM</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={50}
                        max={200}
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
                    <FormLabel>Kroppsvikt (kg)</FormLabel>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="avgHR"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Snittpuls</FormLabel>
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
                    <FormLabel>Maxpuls</FormLabel>
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
                  Bearbetar...
                </>
              ) : (
                'Skicka in test'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
