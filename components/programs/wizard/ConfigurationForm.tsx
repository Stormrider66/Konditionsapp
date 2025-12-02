'use client'

import { useState, useEffect } from 'react'
import { SportType } from '@prisma/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DataSourceType } from './DataSourceSelector'

const configSchema = z.object({
  clientId: z.string().min(1, 'Välj en atlet'),
  testId: z.string().optional(),
  durationWeeks: z.coerce.number().min(4).max(52),
  targetRaceDate: z.date().optional(),
  sessionsPerWeek: z.coerce.number().min(2).max(14),

  // Methodology (for running)
  methodology: z.enum(['AUTO', 'POLARIZED', 'NORWEGIAN', 'CANOVA', 'PYRAMIDAL']).optional(),

  // Manual values
  manualFtp: z.coerce.number().optional(),
  manualCss: z.string().optional(),
  manualVdot: z.coerce.number().optional(),

  // Cycling specific
  weeklyHours: z.coerce.number().optional(),
  bikeType: z.enum(['road', 'mtb', 'gravel', 'indoor']).optional(),

  // Skiing specific
  technique: z.enum(['classic', 'skating', 'both']).optional(),

  // Swimming specific
  poolLength: z.enum(['25', '50']).optional(),

  // Strength integration
  includeStrength: z.boolean(),
  strengthSessionsPerWeek: z.coerce.number().min(0).max(3),

  notes: z.string().optional(),
})

type ConfigFormData = z.infer<typeof configSchema>

interface Client {
  id: string
  name: string
  tests: { id: string; testDate: Date; testType: string }[]
}

interface ConfigurationFormProps {
  sport: SportType
  goal: string
  dataSource: DataSourceType
  clients: Client[]
  selectedClientId?: string
  onSubmit: (data: ConfigFormData) => Promise<void>
  isSubmitting: boolean
}

export function ConfigurationForm({
  sport,
  goal,
  dataSource,
  clients,
  selectedClientId,
  onSubmit,
  isSubmitting,
}: ConfigurationFormProps) {
  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      clientId: selectedClientId || '',
      durationWeeks: getDefaultDuration(sport, goal),
      sessionsPerWeek: 4,
      methodology: 'AUTO',
      includeStrength: false,
      strengthSessionsPerWeek: 2,
      technique: 'both',
      poolLength: '25',
      bikeType: 'road',
      notes: '',
    },
  })

  const watchClientId = form.watch('clientId')
  const selectedClient = clients.find((c) => c.id === watchClientId)
  const watchTargetDate = form.watch('targetRaceDate')
  const watchIncludeStrength = form.watch('includeStrength')

  // Auto-calculate duration from target date
  useEffect(() => {
    if (watchTargetDate) {
      const today = new Date()
      const diffTime = watchTargetDate.getTime() - today.getTime()
      const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
      const clampedWeeks = Math.max(4, Math.min(52, diffWeeks))
      form.setValue('durationWeeks', clampedWeeks)
    }
  }, [watchTargetDate, form])

  const handleSubmit = form.handleSubmit(onSubmit)

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Konfigurera program</h2>
          <p className="text-muted-foreground">
            Finjustera inställningarna för ditt {getSportLabel(sport).toLowerCase()}program
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Selection */}
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Atlet *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj atlet" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Test Selection (if dataSource is TEST) */}
          {dataSource === 'TEST' && selectedClient && (
            <FormField
              control={form.control}
              name="testId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Konditionstest *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj test" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {selectedClient.tests.map((test) => (
                        <SelectItem key={test.id} value={test.id}>
                          {format(new Date(test.testDate), 'PPP', { locale: sv })} -{' '}
                          {test.testType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Manual Values (if dataSource is MANUAL) */}
          {dataSource === 'MANUAL' && sport === 'CYCLING' && (
            <FormField
              control={form.control}
              name="manualFtp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>FTP (Functional Threshold Power) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="t.ex. 280"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                    />
                  </FormControl>
                  <FormDescription>Watt vid tröskel (1 timmes max)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {dataSource === 'MANUAL' && sport === 'SWIMMING' && (
            <FormField
              control={form.control}
              name="manualCss"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CSS (Critical Swim Speed) *</FormLabel>
                  <FormControl>
                    <Input placeholder="t.ex. 1:45" {...field} />
                  </FormControl>
                  <FormDescription>Tid per 100m (MM:SS)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {dataSource === 'MANUAL' && sport === 'RUNNING' && (
            <FormField
              control={form.control}
              name="manualVdot"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VDOT</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="t.ex. 45"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                    />
                  </FormControl>
                  <FormDescription>Daniels VDOT (valfritt)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Target Date */}
          <FormField
            control={form.control}
            name="targetRaceDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Måldatum (valfritt)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP', { locale: sv })
                        ) : (
                          <span>Välj datum</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Programlängden beräknas automatiskt
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Duration */}
          <FormField
            control={form.control}
            name="durationWeeks"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Antal veckor *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={4}
                    max={52}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Sessions per week */}
          <FormField
            control={form.control}
            name="sessionsPerWeek"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pass per vecka *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={2}
                    max={14}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  {sport === 'RUNNING' ? 'Löppass' : sport === 'CYCLING' ? 'Cykelpass' : 'Träningspass'} per vecka
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Methodology (Running only) */}
          {sport === 'RUNNING' && (
            <FormField
              control={form.control}
              name="methodology"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Träningsmetodik</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="AUTO">Automatiskt val</SelectItem>
                      <SelectItem value="POLARIZED">Polarized (80/20)</SelectItem>
                      <SelectItem value="NORWEGIAN">Norwegian (Dubbel tröskel)</SelectItem>
                      <SelectItem value="CANOVA">Canova (Marathon-specialist)</SelectItem>
                      <SelectItem value="PYRAMIDAL">Pyramidal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Cycling specific: Weekly hours */}
          {sport === 'CYCLING' && (
            <FormField
              control={form.control}
              name="weeklyHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Veckotimmar</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj timmar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="6">6 timmar</SelectItem>
                      <SelectItem value="8">8 timmar</SelectItem>
                      <SelectItem value="10">10 timmar</SelectItem>
                      <SelectItem value="12">12 timmar</SelectItem>
                      <SelectItem value="15">15 timmar</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Skiing specific: Technique */}
          {sport === 'SKIING' && (
            <FormField
              control={form.control}
              name="technique"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teknik</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="classic">Klassisk</SelectItem>
                      <SelectItem value="skating">Skating</SelectItem>
                      <SelectItem value="both">Båda</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Swimming specific: Pool length */}
          {sport === 'SWIMMING' && (
            <FormField
              control={form.control}
              name="poolLength"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bassänglängd</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="25">25 meter</SelectItem>
                      <SelectItem value="50">50 meter</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Strength Integration (not for pure strength programs) */}
        {sport !== 'STRENGTH' && (
          <div className="border-t pt-6 mt-6">
            <FormField
              control={form.control}
              name="includeStrength"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Inkludera styrketräning</FormLabel>
                    <FormDescription>
                      Lägg till periodiserad styrketräning i programmet
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {watchIncludeStrength && (
              <FormField
                control={form.control}
                name="strengthSessionsPerWeek"
                render={({ field }) => (
                  <FormItem className="mt-4 ml-7">
                    <FormLabel>Styrkepass per vecka</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(parseInt(v))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1x</SelectItem>
                        <SelectItem value="2">2x</SelectItem>
                        <SelectItem value="3">3x</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anteckningar</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Eventuella anteckningar om programmet..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generera program
          </Button>
        </div>
      </form>
    </Form>
  )
}

function getDefaultDuration(sport: SportType, goal: string): number {
  const durations: Record<string, Record<string, number>> = {
    RUNNING: {
      marathon: 20,
      'half-marathon': 16,
      '10k': 10,
      '5k': 8,
      custom: 12,
    },
    CYCLING: {
      'ftp-builder': 8,
      'base-builder': 12,
      'gran-fondo': 8,
      custom: 12,
    },
    SKIING: {
      'threshold-builder': 8,
      'prep-phase': 12,
      vasaloppet: 16,
      custom: 12,
    },
    SWIMMING: {
      sprint: 8,
      distance: 12,
      'open-water': 12,
      custom: 12,
    },
    TRIATHLON: {
      sprint: 8,
      olympic: 12,
      'half-ironman': 16,
      ironman: 24,
      custom: 16,
    },
    HYROX: {
      pro: 12,
      'age-group': 12,
      doubles: 8,
      custom: 12,
    },
    STRENGTH: {
      'injury-prevention': 10,
      power: 14,
      'running-economy': 12,
      general: 12,
    },
    GENERAL_FITNESS: {
      weight_loss: 12,
      strength: 12,
      endurance: 12,
      flexibility: 8,
      stress_relief: 8,
      general_health: 8,
    },
  }

  return durations[sport]?.[goal] || 12
}

function getSportLabel(sport: SportType): string {
  const labels: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    STRENGTH: 'Styrka',
    SKIING: 'Skidåkning',
    SWIMMING: 'Simning',
    TRIATHLON: 'Triathlon',
    HYROX: 'HYROX',
    GENERAL_FITNESS: 'Allmän Fitness',
  }
  return labels[sport] || sport
}
