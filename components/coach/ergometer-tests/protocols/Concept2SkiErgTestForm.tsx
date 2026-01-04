'use client';

/**
 * Concept2 SkiErg Test Form
 *
 * Protocols:
 * - 1K Time Trial (standard SkiErg test)
 * - 2K Time Trial (endurance)
 * - 7-Stroke Max Power (peak power)
 * - 4x4min Interval Test
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
import { Loader2, Info, Zap, Timer } from 'lucide-react';

interface Athlete {
  id: string;
  name: string;
  weight?: number;
}

interface Concept2SkiErgTestFormProps {
  athletes: Athlete[];
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}

// ==================== ZOD SCHEMAS ====================

const tt1kSchema = z.object({
  testProtocol: z.literal(ErgometerTestProtocol.TT_1K),
  clientId: z.string().min(1, 'Valj en atlet'),
  testDate: z.string().min(1, 'Ange testdatum'),
  dragFactor: z.number().min(80).max(200).optional(),
  rawData: z.object({
    distance: z.literal(1000),
    time: z.number().min(150).max(400), // 2:30-6:40
    splits: z.array(z.number()).optional(),
    avgPace: z.number().min(70).max(200), // /500m
    avgPower: z.number().min(50).max(600),
    avgStrokeRate: z.number().min(20).max(60),
    avgHR: z.number().min(100).max(220).optional(),
    maxHR: z.number().min(100).max(230).optional(),
  }),
  avgHR: z.number().min(100).max(220).optional(),
  maxHR: z.number().min(100).max(230).optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

const tt2kSchema = z.object({
  testProtocol: z.literal(ErgometerTestProtocol.TT_2K),
  clientId: z.string().min(1, 'Valj en atlet'),
  testDate: z.string().min(1, 'Ange testdatum'),
  dragFactor: z.number().min(80).max(200).optional(),
  rawData: z.object({
    distance: z.literal(2000),
    time: z.number().min(300).max(800),
    splits: z.array(z.number()).optional(),
    avgPace: z.number().min(70).max(200),
    avgPower: z.number().min(50).max(500),
    avgStrokeRate: z.number().min(20).max(60),
    avgHR: z.number().min(100).max(220).optional(),
    maxHR: z.number().min(100).max(230).optional(),
  }),
  avgHR: z.number().min(100).max(220).optional(),
  maxHR: z.number().min(100).max(230).optional(),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

type TT1KData = z.infer<typeof tt1kSchema>;
type TT2KData = z.infer<typeof tt2kSchema>;

export function Concept2SkiErgTestForm({ athletes, onSubmit, submitting }: Concept2SkiErgTestFormProps) {
  const [protocol, setProtocol] = useState<'TT_1K' | 'TT_2K'>('TT_1K');

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          SkiErg testar overkroppsuthallighet och styrka. 1K ar standard HYROX-distans.
        </AlertDescription>
      </Alert>

      <Tabs value={protocol} onValueChange={(v) => setProtocol(v as typeof protocol)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="TT_1K" className="flex items-center gap-1">
            <Timer className="h-3 w-3" />
            1K TT
          </TabsTrigger>
          <TabsTrigger value="TT_2K" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            2K TT
          </TabsTrigger>
        </TabsList>

        <TabsContent value="TT_1K">
          <TT1KForm athletes={athletes} onSubmit={onSubmit} submitting={submitting} />
        </TabsContent>

        <TabsContent value="TT_2K">
          <TT2KForm athletes={athletes} onSubmit={onSubmit} submitting={submitting} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== 1K TIME TRIAL FORM ====================

function TT1KForm({
  athletes,
  onSubmit,
  submitting,
}: {
  athletes: Athlete[];
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const form = useForm<TT1KData>({
    resolver: zodResolver(tt1kSchema),
    defaultValues: {
      testProtocol: ErgometerTestProtocol.TT_1K,
      testDate: new Date().toISOString().split('T')[0],
      dragFactor: 90,
      rawData: {
        distance: 1000,
        time: 210,
        avgPace: 105,
        avgPower: 180,
        avgStrokeRate: 35,
      },
    },
  });

  function secondsToPace(seconds: number): string {
    const min = Math.floor(seconds / 60);
    const sec = (seconds % 60).toFixed(1);
    return `${min}:${sec.padStart(4, '0')}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>1000m Time Trial (SkiErg)</CardTitle>
        <CardDescription>
          Standard SkiErg-test och HYROX-distans. Skia 1000m sa snabbt som mojligt.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <FormDescription>Typiskt 80-100 for SkiErg</FormDescription>
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
                        min={150}
                        max={400}
                        step={0.1}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>{field.value ? secondsToPace(field.value / 2) + '/500m' : ''}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rawData.avgPace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo (sek/500m)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={70}
                        max={200}
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
                    <FormLabel>Tag/min</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={20}
                        max={60}
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
      dragFactor: 90,
      rawData: {
        distance: 2000,
        time: 450,
        avgPace: 112,
        avgPower: 160,
        avgStrokeRate: 32,
      },
    },
  });

  function secondsToPace(seconds: number): string {
    const min = Math.floor(seconds / 60);
    const sec = (seconds % 60).toFixed(1);
    return `${min}:${sec.padStart(4, '0')}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2000m Time Trial (SkiErg)</CardTitle>
        <CardDescription>
          Langre uthallighetstest for att uppskatta troskelvarden.
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
                        max={800}
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
                    <FormLabel>Tempo (sek/500m)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={70}
                        max={200}
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
                name="rawData.avgStrokeRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tag/min</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={20}
                        max={60}
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
