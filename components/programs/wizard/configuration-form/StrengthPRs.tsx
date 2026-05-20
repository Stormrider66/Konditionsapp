'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import type { UseFormReturn } from 'react-hook-form'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import type { ConfigFormData } from './schema'

interface StrengthPRsProps {
  form: UseFormReturn<ConfigFormData>
  isHyrox: boolean
}

type AppLocale = 'en' | 'sv'
const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')
const t = (locale: AppLocale, sv: string, en: string) => (locale === 'sv' ? sv : en)

export function StrengthPRs({ form, isHyrox }: StrengthPRsProps) {
  const locale = getAppLocale(useLocale())
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-lg p-4 mt-6">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
          <div className="text-left">
            <h3 className="font-medium">{t(locale, 'Styrke-PRs', 'Strength PRs')}</h3>
            <p className="text-sm text-muted-foreground">
              {t(locale, 'Ange dina 1RM för att beräkna träningsvikter', 'Enter your 1RMs to calculate training weights')}
            </p>
          </div>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="strengthPRs.deadlift"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t(locale, 'Marklyft (kg)', 'Deadlift (kg)')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={t(locale, 't.ex. 150', 'e.g. 150')}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      field.onChange(val === '' ? undefined : parseFloat(val))
                    }}
                  />
                </FormControl>
                <FormDescription className="text-xs">1RM</FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="strengthPRs.backSquat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t(locale, 'Knäböj (kg)', 'Back squat (kg)')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={t(locale, 't.ex. 120', 'e.g. 120')}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      field.onChange(val === '' ? undefined : parseFloat(val))
                    }}
                  />
                </FormControl>
                <FormDescription className="text-xs">1RM</FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="strengthPRs.benchPress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t(locale, 'Bänkpress (kg)', 'Bench press (kg)')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={t(locale, 't.ex. 100', 'e.g. 100')}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      field.onChange(val === '' ? undefined : parseFloat(val))
                    }}
                  />
                </FormControl>
                <FormDescription className="text-xs">1RM</FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="strengthPRs.overheadPress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t(locale, 'Axelpress (kg)', 'Overhead press (kg)')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={t(locale, 't.ex. 60', 'e.g. 60')}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      field.onChange(val === '' ? undefined : parseFloat(val))
                    }}
                  />
                </FormControl>
                <FormDescription className="text-xs">1RM</FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="strengthPRs.barbellRow"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t(locale, 'Rodd (kg)', 'Row (kg)')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={t(locale, 't.ex. 80', 'e.g. 80')}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      field.onChange(val === '' ? undefined : parseFloat(val))
                    }}
                  />
                </FormControl>
                <FormDescription className="text-xs">1RM</FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="strengthPRs.pullUps"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chins (reps)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={t(locale, 't.ex. 10', 'e.g. 10')}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      field.onChange(val === '' ? undefined : parseInt(val))
                    }}
                  />
                </FormControl>
                <FormDescription className="text-xs">{t(locale, 'Max strikta', 'Max strict')}</FormDescription>
              </FormItem>
            )}
          />
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t(locale, 'Styrke-PRs används för att beräkna träningsvikter (% av 1RM).', 'Strength PRs are used to calculate training weights (% of 1RM).')}
            {isHyrox && t(
              locale,
              ' För HYROX Pro Division rekommenderas minst 1.5x kroppsvikt i marklyft.',
              ' For HYROX Pro Division, at least 1.5x bodyweight in the deadlift is recommended.'
            )}
          </AlertDescription>
        </Alert>
      </CollapsibleContent>
    </Collapsible>
  )
}
