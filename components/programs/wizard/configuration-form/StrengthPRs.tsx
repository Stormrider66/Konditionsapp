'use client'

import { useState } from 'react'
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

export function StrengthPRs({ form, isHyrox }: StrengthPRsProps) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-lg p-4 mt-6">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
          <div className="text-left">
            <h3 className="font-medium">Styrke-PRs</h3>
            <p className="text-sm text-muted-foreground">Ange dina 1RM för att beräkna träningsvikter</p>
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
                <FormLabel>Marklyft (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="t.ex. 150"
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
                <FormLabel>Knäböj (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="t.ex. 120"
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
                <FormLabel>Bänkpress (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="t.ex. 100"
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
                <FormLabel>Axelpress (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="t.ex. 60"
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
                <FormLabel>Rodd (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="t.ex. 80"
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
                    placeholder="t.ex. 10"
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      field.onChange(val === '' ? undefined : parseInt(val))
                    }}
                  />
                </FormControl>
                <FormDescription className="text-xs">Max strikta</FormDescription>
              </FormItem>
            )}
          />
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Styrke-PRs används för att beräkna träningsvikter (% av 1RM).
            {isHyrox && ' För HYROX Pro Division rekommenderas minst 1.5x kroppsvikt i marklyft.'}
          </AlertDescription>
        </Alert>
      </CollapsibleContent>
    </Collapsible>
  )
}
