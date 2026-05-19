'use client'

/**
 * Schedule Test Dialog
 *
 * Allows coach to schedule a field test for the athlete.
 * Creates a FieldTestSchedule entry.
 */

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/i18n/client'

const FIELD_TEST_TYPES = [
  {
    value: '30MIN_TT',
    label: { en: '30-min time trial', sv: '30-min tidstrial' },
    description: { en: 'Average pace/power over 30 min', sv: 'Genomsnittlig fart/effekt över 30 min' },
  },
  {
    value: '20MIN_TT',
    label: { en: '20-min time trial', sv: '20-min tidstrial' },
    description: { en: 'Average pace/power over 20 min', sv: 'Genomsnittlig fart/effekt över 20 min' },
  },
  {
    value: 'HR_DRIFT',
    label: { en: 'HR drift test', sv: 'HR-drift test' },
    description: { en: 'Measure heart-rate drift at a steady pace', sv: 'Mät pulsdrift vid konstant tempo' },
  },
  {
    value: 'CRITICAL_VELOCITY',
    label: { en: 'Critical Velocity', sv: 'Critical Velocity' },
    description: { en: '3-min + 9-min test for CV', sv: '3-min + 9-min test för CV' },
  },
  {
    value: 'TALK_TEST',
    label: { en: 'Talk Test', sv: 'Talk Test' },
    description: { en: 'Ventilatory threshold via speech', sv: 'Ventilatorisk tröskel via prat' },
  },
  {
    value: 'RACE_BASED',
    label: { en: 'Race-based', sv: 'Tävlingsbaserat' },
    description: { en: 'Calculate zones from race results', sv: 'Beräkna zoner från tävlingsresultat' },
  },
] as const

type FieldTestType = typeof FIELD_TEST_TYPES[number]['value']

interface ScheduleTestDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Called when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Client ID */
  clientId: string
  /** Date for the test */
  date: Date
  /** Called when test is successfully scheduled */
  onScheduled: () => void
}

export function ScheduleTestDialog({
  open,
  onOpenChange,
  clientId,
  date,
  onScheduled,
}: ScheduleTestDialogProps) {
  const { toast } = useToast()
  const locale = useLocale()
  const appLocale = locale === 'sv' ? 'sv' : 'en'
  const dateLocale = locale === 'sv' ? sv : enUS
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [testType, setTestType] = useState<FieldTestType>('30MIN_TT')
  const [isRequired, setIsRequired] = useState(false)
  const [notes, setNotes] = useState('')

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTestType('30MIN_TT')
      setIsRequired(false)
      setNotes('')
    }
  }, [open])

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/field-tests/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          testType,
          scheduledDate: date.toISOString(),
          required: isRequired,
          notes: notes || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || (appLocale === 'sv' ? 'Kunde inte schemalägga testet' : 'Could not schedule the test'))
      }

      const selectedTest = FIELD_TEST_TYPES.find(t => t.value === testType)
      toast({
        title: appLocale === 'sv' ? 'Test schemalagt' : 'Test scheduled',
        description: appLocale === 'sv'
          ? `${selectedTest?.label.sv} schemalagt för ${format(date, 'd MMMM', { locale: dateLocale })}`
          : `${selectedTest?.label.en} scheduled for ${format(date, 'd MMMM', { locale: dateLocale })}`,
      })

      onScheduled()
      onOpenChange(false)
    } catch (error) {
      console.error('Error scheduling test:', error)
      toast({
        title: appLocale === 'sv' ? 'Fel' : 'Error',
        description: error instanceof Error ? error.message : appLocale === 'sv' ? 'Kunde inte schemalägga testet' : 'Could not schedule the test',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formattedDate = format(date, 'EEEE d MMMM yyyy', { locale: dateLocale })
  const selectedTest = FIELD_TEST_TYPES.find(t => t.value === testType)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{appLocale === 'sv' ? 'Schemalägg fälttest' : 'Schedule field test'}</DialogTitle>
          <DialogDescription className="capitalize">
            {formattedDate}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Test Type */}
          <div className="space-y-2">
            <Label htmlFor="testType">{appLocale === 'sv' ? 'Testtyp' : 'Test type'}</Label>
            <Select value={testType} onValueChange={(v) => setTestType(v as FieldTestType)}>
              <SelectTrigger id="testType">
                <SelectValue placeholder={appLocale === 'sv' ? 'Välj testtyp' : 'Choose test type'} />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TEST_TYPES.map((test) => (
                  <SelectItem key={test.value} value={test.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{test.label[appLocale]}</span>
                      <span className="text-xs text-muted-foreground">{test.description[appLocale]}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTest && (
              <p className="text-xs text-muted-foreground">
                {selectedTest.description[appLocale]}
              </p>
            )}
          </div>

          {/* Required Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="required" className="text-base">
                {appLocale === 'sv' ? 'Obligatoriskt' : 'Required'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {appLocale === 'sv' ? 'Markera om testet måste genomföras' : 'Mark if the test must be completed'}
              </p>
            </div>
            <Switch
              id="required"
              checked={isRequired}
              onCheckedChange={setIsRequired}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{appLocale === 'sv' ? 'Anteckningar (valfritt)' : 'Notes (optional)'}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={appLocale === 'sv' ? 'Instruktioner eller förberedelser...' : 'Instructions or preparation...'}
              rows={3}
            />
          </div>

          {/* Info box */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700">
              {appLocale === 'sv'
                ? 'Atleten får en påminnelse inför testet och kan logga resultaten efteråt.'
                : 'The athlete gets a reminder before the test and can log the results afterward.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {appLocale === 'sv' ? 'Avbryt' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {appLocale === 'sv' ? 'Schemalägger...' : 'Scheduling...'}
              </>
            ) : (
              appLocale === 'sv' ? 'Schemalägg test' : 'Schedule test'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
