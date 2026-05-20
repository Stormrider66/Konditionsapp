'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { SportType } from '@prisma/client'
import { useLocale } from 'next-intl'
import {
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
import { Checkbox } from '@/components/ui/checkbox'
import type { ConfigFormData } from './schema'

interface StrengthCoreIntegrationProps {
  form: UseFormReturn<ConfigFormData>
  sport: SportType
  watchIncludeStrength: boolean
}

type AppLocale = 'en' | 'sv'
const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')
const t = (locale: AppLocale, sv: string, en: string) => (locale === 'sv' ? sv : en)

export function StrengthCoreIntegration({
  form,
  sport,
  watchIncludeStrength,
}: StrengthCoreIntegrationProps) {
  const locale = getAppLocale(useLocale())
  if (sport === 'STRENGTH') return null

  return (
    <div className="border-t pt-6 mt-6">
      <h3 className="font-medium mb-4">{t(locale, 'Tillägg i programmet', 'Program add-ons')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <FormField
            control={form.control}
            name="includeStrength"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>{t(locale, 'Inkludera styrketräning', 'Include strength training')}</FormLabel>
                  <FormDescription>{t(locale, 'Periodiserad styrketräning', 'Periodized strength training')}</FormDescription>
                </div>
              </FormItem>
            )}
          />

          {watchIncludeStrength && (
            <>
              <FormField
                control={form.control}
                name="strengthSessionsPerWeek"
                render={({ field }) => (
                  <FormItem className="ml-7">
                    <FormLabel>{t(locale, 'Styrkepass per vecka', 'Strength sessions per week')}</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(parseInt(v))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="w-24">
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
              <FormField
                control={form.control}
                name="scheduleStrengthAfterRunning"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 ml-7">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm">{t(locale, 'Schemalägg efter löpning', 'Schedule after running')}</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </>
          )}
        </div>

        <div className="space-y-3">
          <FormField
            control={form.control}
            name="coreSessionsPerWeek"
            render={({ field }) => {
              const hasCoreTraining = (field.value ?? 0) > 0
              return (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={hasCoreTraining}
                      onCheckedChange={(checked) => {
                        field.onChange(checked ? 2 : 0)
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t(locale, 'Inkludera core-träning', 'Include core training')}</FormLabel>
                    <FormDescription>{t(locale, 'Core/bålstabilitet', 'Core/trunk stability')}</FormDescription>
                  </div>
                </FormItem>
              )
            }}
          />

          {(form.watch('coreSessionsPerWeek') ?? 0) > 0 && (
            <>
              <FormField
                control={form.control}
                name="coreSessionsPerWeek"
                render={({ field }) => (
                  <FormItem className="ml-7">
                    <FormLabel>{t(locale, 'Core-pass per vecka', 'Core sessions per week')}</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(parseInt(v))}
                      value={field.value?.toString() || '2'}
                    >
                      <FormControl>
                        <SelectTrigger className="w-24">
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
              <FormField
                control={form.control}
                name="scheduleCoreAfterRunning"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 ml-7">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm">{t(locale, 'Schemalägg efter löpning', 'Schedule after running')}</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
