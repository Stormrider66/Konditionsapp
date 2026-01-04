'use client';

/**
 * Concept2 Rower Test Form
 *
 * Protocols:
 * - 2K Time Trial (threshold estimation)
 * - 7-Stroke Max Power (peak power)
 * - 4x4min Interval Test (custom threshold test)
 * - 3-Minute All-Out (CP model)
 */

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Plus, Trash2, Loader2, Info, Zap, Timer, Activity } from 'lucide-react';

interface Athlete {
  id: string;
  name: string;
  weight?: number;
}

interface Concept2RowTestFormProps {
  athletes: Athlete[];
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}

// ==================== ZOD SCHEMAS ====================

const tt2kSchema = z.object({
  testProtocol: z.literal(ErgometerTestProtocol.TT_2K),
  clientId: z.string().min(1, 'Valj en atlet'),
  testDate: z.string().min(1, 'Ange testdatum'),
  dragFactor: z.number().min(80).max(200).optional(),
  rawData: z.object({
    distance: z.literal(2000),
    time: z.number().min(300).max(600), // 5-10 minutes
    splits: z.array(z.number()).optional(),
    avgPace: z.number().min(80).max(180), // 1:20-3:00 /500m
    avgPower: z.number().min(50).max(600),
    avgStrokeRate: z.number().min(16).max(40),
    avgHR: z.number().min(100).max(220).optional(),
    maxHR: z.number().min(100).max(230).optional(),
  }),
  avgHR: z.number().min(100).max(220).optional(),
  maxHR: z.number().min(100).max(230).optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

const sevenStrokeSchema = z.object({
  testProtocol: z.literal(ErgometerTestProtocol.PEAK_POWER_7_STROKE),
  clientId: z.string().min(1, 'Valj en atlet'),
  testDate: z.string().min(1, 'Ange testdatum'),
  dragFactor: z.number().min(80).max(200).optional(),
  rawData: z.object({
    strokes: z.array(z.object({
      strokeNumber: z.number().min(1).max(7),
      power: z.number().min(100).max(2000),
      pace: z.number().min(50).max(180),
    })).length(7),
    peakPower: z.number().min(100).max(2000),
    avgPower: z.number().min(100).max(1500),
    bodyWeight: z.number().min(40).max(150).optional(),
  }),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

const interval4x4Schema = z.object({
  testProtocol: z.literal(ErgometerTestProtocol.INTERVAL_4X4),
  clientId: z.string().min(1, 'Valj en atlet'),
  testDate: z.string().min(1, 'Ange testdatum'),
  dragFactor: z.number().min(80).max(200).optional(),
  rawData: z.object({
    intervals: z.array(z.object({
      intervalNumber: z.number().min(1).max(4),
      duration: z.number().min(60).max(600),
      avgPower: z.number().min(50).max(500),
      avgPace: z.number().min(80).max(180).optional(),
      avgHR: z.number().min(100).max(220),
      maxHR: z.number().min(100).max(230).optional(),
      avgStrokeRate: z.number().min(16).max(40).optional(),
    })).length(4),
    restDuration: z.number().min(60).max(600),
    totalDuration: z.number().optional(),
  }),
  avgHR: z.number().min(100).max(220).optional(),
  maxHR: z.number().min(100).max(230).optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

const cp3MinSchema = z.object({
  testProtocol: z.literal(ErgometerTestProtocol.CP_3MIN_ALL_OUT),
  clientId: z.string().min(1, 'Valj en atlet'),
  testDate: z.string().min(1, 'Ange testdatum'),
  dragFactor: z.number().min(80).max(200).optional(),
  rawData: z.object({
    powerSamples: z.array(z.number()).min(170).max(190),
    avgHR: z.number().min(100).max(220).optional(),
    maxHR: z.number().min(100).max(230).optional(),
  }),
  avgHR: z.number().min(100).max(220).optional(),
  maxHR: z.number().min(100).max(230).optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

type TT2KData = z.infer<typeof tt2kSchema>;
type SevenStrokeData = z.infer<typeof sevenStrokeSchema>;
type Interval4x4Data = z.infer<typeof interval4x4Schema>;
type CP3MinData = z.infer<typeof cp3MinSchema>;

export function Concept2RowTestForm({ athletes, onSubmit, submitting }: Concept2RowTestFormProps) {
  const [protocol, setProtocol] = useState<'TT_2K' | '7_STROKE' | 'INTERVAL_4X4' | 'CP_3MIN'>('TT_2K');

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Concept2 roddmaskin testar uthallighet och kraft. Valj protokoll baserat pa vad du vill mata.
        </AlertDescription>
      </Alert>

      <Tabs value={protocol} onValueChange={(v) => setProtocol(v as typeof protocol)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="TT_2K" className="text-xs sm:text-sm">
            <Timer className="h-3 w-3 mr-1 hidden sm:inline" />
            2K TT
          </TabsTrigger>
          <TabsTrigger value="7_STROKE" className="text-xs sm:text-sm">
            <Zap className="h-3 w-3 mr-1 hidden sm:inline" />
            7-Stroke
          </TabsTrigger>
          <TabsTrigger value="INTERVAL_4X4" className="text-xs sm:text-sm">
            <Activity className="h-3 w-3 mr-1 hidden sm:inline" />
            4x4min
          </TabsTrigger>
          <TabsTrigger value="CP_3MIN" className="text-xs sm:text-sm">
            <Zap className="h-3 w-3 mr-1 hidden sm:inline" />
            3min CP
          </TabsTrigger>
        </TabsList>

        <TabsContent value="TT_2K">
          <TT2KForm athletes={athletes} onSubmit={onSubmit} submitting={submitting} />
        </TabsContent>

        <TabsContent value="7_STROKE">
          <SevenStrokeForm athletes={athletes} onSubmit={onSubmit} submitting={submitting} />
        </TabsContent>

        <TabsContent value="INTERVAL_4X4">
          <Interval4x4Form athletes={athletes} onSubmit={onSubmit} submitting={submitting} />
        </TabsContent>

        <TabsContent value="CP_3MIN">
          <CP3MinForm athletes={athletes} onSubmit={onSubmit} submitting={submitting} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== 2K TIME TRIAL FORM ====================

function TT2KForm({
  athletes,
  onSubmit,
  submitting,
}: {
  athletes: Athlete[];
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const form = useForm<TT2KData>({
    resolver: zodResolver(tt2kSchema),
    defaultValues: {
      testProtocol: ErgometerTestProtocol.TT_2K,
      testDate: new Date().toISOString().split('T')[0],
      dragFactor: 120,
      rawData: {
        distance: 2000,
        time: 420,
        avgPace: 105,
        avgPower: 250,
        avgStrokeRate: 28,
      },
    },
  });

  function handleFormSubmit(data: TT2KData) {
    onSubmit(data);
  }

  // Helper to convert MM:SS.s to seconds
  function paceToSeconds(paceStr: string): number {
    const [min, sec] = paceStr.split(':').map(parseFloat);
    return min * 60 + (sec || 0);
  }

  // Helper to convert seconds to MM:SS.s
  function secondsToPace(seconds: number): string {
    const min = Math.floor(seconds / 60);
    const sec = (seconds % 60).toFixed(1);
    return `${min}:${sec.padStart(4, '0')}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2000m Time Trial</CardTitle>
        <CardDescription>
          Standard roddtest for att berakna troskelvarden. Rodd 2000m sa snabbt som mojligt.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Athlete & Date Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <FormDescription>Typiskt 110-130 for rodd</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Test Results */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <FormField
                control={form.control}
                name="rawData.time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total tid (sek)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={300}
                        max={600}
                        step={0.1}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>{field.value ? secondsToPace(field.value / 4) + '/500m' : ''}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rawData.avgPace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Snitttempo (sek/500m)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={80}
                        max={180}
                        step={0.1}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>{field.value ? secondsToPace(field.value) : ''}</FormDescription>
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
                        max={600}
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
                    <FormLabel>Takttag/min</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={16}
                        max={40}
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
                name="rawData.maxHR"
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
            </div>

            {/* RPE & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <FormDescription>Upplevd anstrangning</FormDescription>
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

// ==================== 7-STROKE MAX FORM ====================

function SevenStrokeForm({
  athletes,
  onSubmit,
  submitting,
}: {
  athletes: Athlete[];
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const form = useForm<SevenStrokeData>({
    resolver: zodResolver(sevenStrokeSchema),
    defaultValues: {
      testProtocol: ErgometerTestProtocol.PEAK_POWER_7_STROKE,
      testDate: new Date().toISOString().split('T')[0],
      dragFactor: 130,
      rawData: {
        strokes: Array.from({ length: 7 }, (_, i) => ({
          strokeNumber: i + 1,
          power: 400,
          pace: 90,
        })),
        peakPower: 500,
        avgPower: 400,
      },
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'rawData.strokes',
  });

  function handleFormSubmit(data: SevenStrokeData) {
    // Calculate peak and avg from strokes
    const powers = data.rawData.strokes.map((s) => s.power);
    data.rawData.peakPower = Math.max(...powers);
    data.rawData.avgPower = Math.round(powers.reduce((a, b) => a + b, 0) / powers.length);
    onSubmit(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>7-Stroke Max Power Test</CardTitle>
        <CardDescription>
          Maximal krafttest: 7 tag med full kraft fran stillastående. Mater maximal neuromuskulär effekt.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Athlete & Date Selection */}
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
                    <FormDescription>Hogt for krafttest (130+)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Stroke Data */}
            <div className="space-y-4">
              <h4 className="font-medium">Tagdata (7 tag)</h4>
              <div className="grid grid-cols-7 gap-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-2">
                    <div className="text-center text-sm font-medium text-muted-foreground">
                      Tag {index + 1}
                    </div>
                    <FormField
                      control={form.control}
                      name={`rawData.strokes.${index}.power`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              min={100}
                              max={2000}
                              className="text-center text-sm"
                              placeholder="W"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Body Weight for W/kg */}
            <FormField
              control={form.control}
              name="rawData.bodyWeight"
              render={({ field }) => (
                <FormItem className="max-w-xs">
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
                  <FormDescription>For W/kg berakning</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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

// ==================== 4x4 INTERVAL FORM ====================

function Interval4x4Form({
  athletes,
  onSubmit,
  submitting,
}: {
  athletes: Athlete[];
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const form = useForm<Interval4x4Data>({
    resolver: zodResolver(interval4x4Schema),
    defaultValues: {
      testProtocol: ErgometerTestProtocol.INTERVAL_4X4,
      testDate: new Date().toISOString().split('T')[0],
      dragFactor: 120,
      rawData: {
        intervals: Array.from({ length: 4 }, (_, i) => ({
          intervalNumber: i + 1,
          duration: 240,
          avgPower: 200,
          avgHR: 165,
        })),
        restDuration: 180,
      },
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'rawData.intervals',
  });

  function handleFormSubmit(data: Interval4x4Data) {
    // Calculate total duration
    data.rawData.totalDuration = 4 * 240 + 3 * 180; // 4 intervals + 3 rests
    onSubmit(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>4x4min Intervalltest</CardTitle>
        <CardDescription>
          Fyra 4-minuters intervall med 3 minuters aktiv vila. Uppskattar tröskeleffekt (~95% av snitteffekt).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Athlete & Date Selection */}
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

            {/* Interval Data */}
            <div className="space-y-4">
              <h4 className="font-medium">Intervalldata</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Intervall</th>
                      <th className="text-left py-2 px-2">Effekt (W)</th>
                      <th className="text-left py-2 px-2">Snittpuls</th>
                      <th className="text-left py-2 px-2">Tempo (sek/500m)</th>
                      <th className="text-left py-2 px-2">Takttag/min</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => (
                      <tr key={field.id} className="border-b">
                        <td className="py-2 px-2 font-medium">{index + 1}</td>
                        <td className="py-2 px-2">
                          <FormField
                            control={form.control}
                            name={`rawData.intervals.${index}.avgPower`}
                            render={({ field }) => (
                              <Input
                                type="number"
                                min={50}
                                max={500}
                                className="w-20"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            )}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <FormField
                            control={form.control}
                            name={`rawData.intervals.${index}.avgHR`}
                            render={({ field }) => (
                              <Input
                                type="number"
                                min={100}
                                max={220}
                                className="w-20"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            )}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <FormField
                            control={form.control}
                            name={`rawData.intervals.${index}.avgPace`}
                            render={({ field }) => (
                              <Input
                                type="number"
                                min={80}
                                max={180}
                                step={0.1}
                                className="w-20"
                                placeholder="Opt"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                                }
                              />
                            )}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <FormField
                            control={form.control}
                            name={`rawData.intervals.${index}.avgStrokeRate`}
                            render={({ field }) => (
                              <Input
                                type="number"
                                min={16}
                                max={40}
                                className="w-20"
                                placeholder="Opt"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                                }
                              />
                            )}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RPE & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

// ==================== 3-MIN ALL-OUT CP FORM ====================

function CP3MinForm({
  athletes,
  onSubmit,
  submitting,
}: {
  athletes: Athlete[];
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const form = useForm<CP3MinData>({
    resolver: zodResolver(cp3MinSchema),
    defaultValues: {
      testProtocol: ErgometerTestProtocol.CP_3MIN_ALL_OUT,
      testDate: new Date().toISOString().split('T')[0],
      dragFactor: 120,
      rawData: {
        powerSamples: [],
      },
    },
  });

  const [manualEntry, setManualEntry] = useState(true);
  const [endPower, setEndPower] = useState<number>(200);
  const [peakPower, setPeakPower] = useState<number>(400);

  function handleFormSubmit(data: CP3MinData) {
    // If using manual entry, generate approximate power samples
    if (manualEntry && endPower && peakPower) {
      // Create 180 samples that decay from peak to end power
      const samples: number[] = [];
      for (let i = 0; i < 180; i++) {
        // Exponential decay from peak to CP
        const decay = Math.exp(-i / 30); // 30-second time constant
        const power = endPower + (peakPower - endPower) * decay;
        samples.push(Math.round(power));
      }
      data.rawData.powerSamples = samples;
    }
    onSubmit(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>3-Minute All-Out Test</CardTitle>
        <CardDescription>
          Allt-ut test for att bestamma Critical Power (CP) och W&apos;. CP = sista 30s snitt, W&apos; = arbete over CP.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Athlete & Date Selection */}
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

            {/* Manual Entry Mode */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Ange toppeffekt (forsta sekunderna) och sluteffekt (sista 30s snitt) for att uppskatta CP-modellen.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Toppeffekt (W)</label>
                <Input
                  type="number"
                  min={200}
                  max={2000}
                  value={peakPower}
                  onChange={(e) => setPeakPower(parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Hogsta effekt i testets borjan</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sluteffekt / CP (W)</label>
                <Input
                  type="number"
                  min={50}
                  max={500}
                  value={endPower}
                  onChange={(e) => setEndPower(parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Snitteffekt sista 30 sekunderna = CP</p>
              </div>
            </div>

            {/* HR Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rawData.avgHR"
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
                name="rawData.maxHR"
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
            </div>

            {/* RPE & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
