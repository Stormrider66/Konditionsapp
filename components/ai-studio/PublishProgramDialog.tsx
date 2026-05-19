'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, Loader2, Send, AlertCircle } from 'lucide-react'
import { format, addDays, nextMonday } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/i18n/client'

export type ProgramType = 'MAIN' | 'COMPLEMENTARY'
export type ExistingProgramAction = 'KEEP' | 'DEACTIVATE' | 'REPLACE'

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const copy = {
  en: {
    publishedTitle: 'Program published',
    publishedWithNotification: (programName: string, athleteName: string) =>
      `${programName} has been published to ${athleteName} and a message has been sent.`,
    publishedWithoutNotification: (programName: string, athleteName: string) =>
      `${programName} has been published to ${athleteName}.`,
    unknownError: 'Unknown error',
    validationError:
      'The program is missing required fields (weeks, phases). The AI did not generate the correct JSON format.',
    publishErrorTitle: 'Could not publish program',
    title: 'Publish program',
    description: (programName: string, athleteName: string) =>
      `Publish "${programName}" to ${athleteName}`,
    programType: 'Program type',
    mainProgram: 'Main program',
    mainProgramDescription: 'The athlete’s primary training plan',
    complementary: 'Complementary',
    complementaryDescription: 'Rehab, strength, or add-on work',
    existingProgram: 'Existing program',
    activeProgramExists: 'Active program exists',
    keepActive: 'Keep active',
    keepActiveDescription: 'Both programs remain available',
    deactivateExisting: 'Deactivate existing',
    deactivateExistingDescription: 'Hide the old program',
    replaceCompletely: 'Replace completely',
    replaceDescription: 'Delete the old program',
    replaceWarning:
      'This will permanently delete the existing program and all of its history.',
    startDate: 'Start date',
    selectDate: 'Select date',
    today: 'Today',
    nextMonday: 'Next Monday',
    inTwoWeeks: 'In 2 weeks',
    notify: (athleteName: string) => `Notify ${athleteName}`,
    notifyDescription: 'Send a notification about the new program',
    cancel: 'Cancel',
    publishing: 'Publishing...',
    publishTo: (athleteName: string) => `Publish to ${athleteName}`,
  },
  sv: {
    publishedTitle: 'Program publicerat!',
    publishedWithNotification: (programName: string, athleteName: string) =>
      `${programName} har publicerats till ${athleteName} och ett meddelande har skickats.`,
    publishedWithoutNotification: (programName: string, athleteName: string) =>
      `${programName} har publicerats till ${athleteName}.`,
    unknownError: 'Okänt fel',
    validationError:
      'Programmet saknar obligatoriska fält (veckor, faser). AI:n genererade inte korrekt JSON-format.',
    publishErrorTitle: 'Kunde inte publicera program',
    title: 'Publicera program',
    description: (programName: string, athleteName: string) =>
      `Publicera "${programName}" till ${athleteName}`,
    programType: 'Programtyp',
    mainProgram: 'Huvudprogram',
    mainProgramDescription: 'Atletens primära träningsplan',
    complementary: 'Kompletterande',
    complementaryDescription: 'Rehab, styrka eller tillägg',
    existingProgram: 'Befintligt program',
    activeProgramExists: 'Aktivt program finns',
    keepActive: 'Behåll aktivt',
    keepActiveDescription: 'Båda programmen blir tillgängliga',
    deactivateExisting: 'Inaktivera befintligt',
    deactivateExistingDescription: 'Dölj det gamla programmet',
    replaceCompletely: 'Ersätt helt',
    replaceDescription: 'Ta bort det gamla programmet',
    replaceWarning:
      'Detta kommer permanent ta bort det befintliga programmet och all dess historik.',
    startDate: 'Startdatum',
    selectDate: 'Välj datum',
    today: 'Idag',
    nextMonday: 'Nästa måndag',
    inTwoWeeks: 'Om 2 veckor',
    notify: (athleteName: string) => `Meddela ${athleteName}`,
    notifyDescription: 'Skicka notifikation om det nya programmet',
    cancel: 'Avbryt',
    publishing: 'Publicerar...',
    publishTo: (athleteName: string) => `Publicera till ${athleteName}`,
  },
}

interface PublishProgramDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  programName: string
  athleteId: string
  athleteName: string
  aiOutput: string
  conversationId?: string | null
  hasExistingProgram?: boolean
  existingProgramName?: string
  onSuccess?: (programId: string) => void
}

export function PublishProgramDialog({
  open,
  onOpenChange,
  programName,
  athleteId,
  athleteName,
  aiOutput,
  conversationId,
  hasExistingProgram = false,
  existingProgramName,
  onSuccess,
}: PublishProgramDialogProps) {
  const { toast } = useToast()
  const appLocale = getAppLocale(useLocale())
  const ui = copy[appLocale]
  const dateLocale = appLocale === 'sv' ? sv : enUS
  const [publishing, setPublishing] = useState(false)
  const [programType, setProgramType] = useState<ProgramType>('MAIN')
  const [existingAction, setExistingAction] = useState<ExistingProgramAction>(
    hasExistingProgram ? 'DEACTIVATE' : 'KEEP'
  )
  const [startDate, setStartDate] = useState<Date>(() => {
    // Default to next Monday
    const today = new Date()
    return nextMonday(today)
  })
  const [notifyAthlete, setNotifyAthlete] = useState(true)

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const response = await fetch('/api/ai/save-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiOutput,
          clientId: athleteId,
          conversationId,
          // New fields
          programType,
          existingProgramAction: hasExistingProgram ? existingAction : undefined,
          startDate: startDate.toISOString(),
          notifyAthlete,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const parts = [data.error || 'Failed to publish program']
        if (data.errors?.length) parts.push(data.errors.join(', '))
        if (data.message && data.message !== data.error) parts.push(data.message)
        throw new Error(parts.join(': '))
      }

      toast({
        title: ui.publishedTitle,
        description: notifyAthlete
          ? ui.publishedWithNotification(programName, athleteName)
          : ui.publishedWithoutNotification(programName, athleteName),
      })

      onOpenChange(false)

      if (onSuccess) {
        onSuccess(data.program.id)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ui.unknownError
      // Try to parse detailed errors from the response
      let detailedMessage = errorMessage
      if (errorMessage.includes('validation failed')) {
        detailedMessage = ui.validationError
      }
      toast({
        title: ui.publishErrorTitle,
        description: detailedMessage,
        variant: 'destructive',
      })
      console.error('Publish error:', error)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{ui.title}</DialogTitle>
          <DialogDescription>
            {ui.description(programName, athleteName)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Program Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{ui.programType}</Label>
            <RadioGroup
              value={programType}
              onValueChange={(v) => setProgramType(v as ProgramType)}
              className="grid grid-cols-2 gap-3"
            >
              <div>
                <RadioGroupItem
                  value="MAIN"
                  id="type-main"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="type-main"
                  className={cn(
                    "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                    "peer-data-[state=checked]:border-blue-500 [&:has([data-state=checked])]:border-blue-500"
                  )}
                >
                  <span className="font-medium">{ui.mainProgram}</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">
                    {ui.mainProgramDescription}
                  </span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="COMPLEMENTARY"
                  id="type-complementary"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="type-complementary"
                  className={cn(
                    "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                    "peer-data-[state=checked]:border-blue-500 [&:has([data-state=checked])]:border-blue-500"
                  )}
                >
                  <span className="font-medium">{ui.complementary}</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">
                    {ui.complementaryDescription}
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Existing Program Handling */}
          {hasExistingProgram && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">{ui.existingProgram}</Label>
                <Badge variant="outline" className="text-xs">
                  {existingProgramName || ui.activeProgramExists}
                </Badge>
              </div>
              <RadioGroup
                value={existingAction}
                onValueChange={(v) => setExistingAction(v as ExistingProgramAction)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="KEEP" id="action-keep" />
                  <Label htmlFor="action-keep" className="cursor-pointer">
                    <span>{ui.keepActive}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {ui.keepActiveDescription}
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="DEACTIVATE" id="action-deactivate" />
                  <Label htmlFor="action-deactivate" className="cursor-pointer">
                    <span>{ui.deactivateExisting}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {ui.deactivateExistingDescription}
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="REPLACE" id="action-replace" />
                  <Label htmlFor="action-replace" className="cursor-pointer">
                    <span className="text-red-600">{ui.replaceCompletely}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {ui.replaceDescription}
                    </span>
                  </Label>
                </div>
              </RadioGroup>
              {existingAction === 'REPLACE' && (
                <div className="flex items-start gap-2 p-2 bg-red-50 rounded-md border border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  <p className="text-xs text-red-700">
                    {ui.replaceWarning}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Start Date */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{ui.startDate}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? (
                    format(startDate, "EEEE d MMMM yyyy", { locale: dateLocale })
                  ) : (
                    ui.selectDate
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  locale={dateLocale}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setStartDate(new Date())}
              >
                {ui.today}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setStartDate(nextMonday(new Date()))}
              >
                {ui.nextMonday}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setStartDate(addDays(nextMonday(new Date()), 7))}
              >
                {ui.inTwoWeeks}
              </Button>
            </div>
          </div>

          {/* Notify Athlete */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="notify"
              checked={notifyAthlete}
              onCheckedChange={(checked) => setNotifyAthlete(checked as boolean)}
            />
            <Label htmlFor="notify" className="cursor-pointer">
              <span>{ui.notify(athleteName)}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {ui.notifyDescription}
              </span>
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {ui.cancel}
          </Button>
          <Button
            onClick={handlePublish}
            disabled={publishing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {publishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {ui.publishing}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {ui.publishTo(athleteName)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
