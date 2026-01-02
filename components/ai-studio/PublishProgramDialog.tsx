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
import { sv } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

export type ProgramType = 'MAIN' | 'COMPLEMENTARY'
export type ExistingProgramAction = 'KEEP' | 'DEACTIVATE' | 'REPLACE'

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
  const [publishing, setPublishing] = useState(false)
  const [programType, setProgramType] = useState<ProgramType>('MAIN')
  const [existingAction, setExistingAction] = useState<ExistingProgramAction>(
    hasExistingProgram ? 'KEEP' : 'KEEP'
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
        throw new Error(data.error || 'Failed to publish program')
      }

      toast({
        title: 'Program publicerat!',
        description: `${programName} har publicerats till ${athleteName}${
          notifyAthlete ? ' och ett meddelande har skickats.' : '.'
        }`,
      })

      onOpenChange(false)

      if (onSuccess) {
        onSuccess(data.program.id)
      }
    } catch (error) {
      toast({
        title: 'Kunde inte publicera program',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Publicera program</DialogTitle>
          <DialogDescription>
            Publicera &quot;{programName}&quot; till {athleteName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Program Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Programtyp</Label>
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
                  <span className="font-medium">Huvudprogram</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">
                    Atletens primära träningsplan
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
                  <span className="font-medium">Kompletterande</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">
                    Rehab, styrka eller tillägg
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Existing Program Handling */}
          {hasExistingProgram && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Befintligt program</Label>
                <Badge variant="outline" className="text-xs">
                  {existingProgramName || 'Aktivt program finns'}
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
                    <span>Behåll aktivt</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      Båda programmen blir tillgängliga
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="DEACTIVATE" id="action-deactivate" />
                  <Label htmlFor="action-deactivate" className="cursor-pointer">
                    <span>Inaktivera befintligt</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      Dölj det gamla programmet
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="REPLACE" id="action-replace" />
                  <Label htmlFor="action-replace" className="cursor-pointer">
                    <span className="text-red-600">Ersätt helt</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      Ta bort det gamla programmet
                    </span>
                  </Label>
                </div>
              </RadioGroup>
              {existingAction === 'REPLACE' && (
                <div className="flex items-start gap-2 p-2 bg-red-50 rounded-md border border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  <p className="text-xs text-red-700">
                    Detta kommer permanent ta bort det befintliga programmet och all dess historik.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Start Date */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Startdatum</Label>
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
                    format(startDate, "EEEE d MMMM yyyy", { locale: sv })
                  ) : (
                    "Välj datum"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  locale={sv}
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
                Idag
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setStartDate(nextMonday(new Date()))}
              >
                Nästa måndag
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setStartDate(addDays(nextMonday(new Date()), 7))}
              >
                Om 2 veckor
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
              <span>Meddela {athleteName}</span>
              <span className="text-xs text-muted-foreground ml-2">
                Skicka notifikation om det nya programmet
              </span>
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button
            onClick={handlePublish}
            disabled={publishing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {publishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publicerar...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Publicera till {athleteName}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
