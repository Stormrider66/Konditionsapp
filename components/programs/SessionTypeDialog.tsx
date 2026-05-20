'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Activity, Dumbbell, Target, Bike, Moon, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'

interface SessionTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  programId: string
  dayId?: string
  date?: Date
  existingWorkoutId?: string // If provided, we're changing type of existing workout
  mode: 'add' | 'change' // Add new session or change existing
}

type SessionType = 'RUNNING' | 'STRENGTH' | 'CORE' | 'ALTERNATIVE' | 'REST'

interface SessionOption {
  type: SessionType
  label: Record<AppLocale, string>
  description: Record<AppLocale, string>
  icon: React.ReactNode
  color: string
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const t = (locale: AppLocale, sv: string, en: string) => (locale === 'sv' ? sv : en)

const SESSION_OPTIONS: SessionOption[] = [
  {
    type: 'RUNNING',
    label: { en: 'Running/Cardio', sv: 'Löppass/Cardio' },
    description: {
      en: 'Running sessions with intervals, distance, and zone training',
      sv: 'Löppass med intervaller, distans och zonträning',
    },
    icon: <Activity className="h-8 w-8" />,
    color: 'text-blue-600 hover:bg-blue-50 border-blue-200',
  },
  {
    type: 'STRENGTH',
    label: { en: 'Strength Training', sv: 'Styrketräning' },
    description: {
      en: 'Strength training with exercises, sets, and repetitions',
      sv: 'Styrketräning med övningar, set och repetitioner',
    },
    icon: <Dumbbell className="h-8 w-8" />,
    color: 'text-purple-600 hover:bg-purple-50 border-purple-200',
  },
  {
    type: 'CORE',
    label: { en: 'Core Training', sv: 'Coreträning' },
    description: {
      en: 'Core stability and balance exercises',
      sv: 'Corestabilitet och balansövningar',
    },
    icon: <Target className="h-8 w-8" />,
    color: 'text-orange-600 hover:bg-orange-50 border-orange-200',
  },
  {
    type: 'ALTERNATIVE',
    label: { en: 'Alternative Training', sv: 'Alternativ träning' },
    description: {
      en: 'Cycling, swimming, deep-water running, or elliptical',
      sv: 'Cykling, simning, DWR eller crosstrainer',
    },
    icon: <Bike className="h-8 w-8" />,
    color: 'text-green-600 hover:bg-green-50 border-green-200',
  },
  {
    type: 'REST',
    label: { en: 'Rest Day', sv: 'Vilodag' },
    description: {
      en: 'Rest day - no training',
      sv: 'Vilodag - ingen träning',
    },
    icon: <Moon className="h-8 w-8" />,
    color: 'text-gray-600 hover:bg-gray-50 border-gray-200',
  },
]

export function SessionTypeDialog({
  open,
  onOpenChange,
  programId,
  dayId,
  date,
  existingWorkoutId,
  mode,
}: SessionTypeDialogProps) {
  const locale = getAppLocale(useLocale())
  const router = useRouter()
  const pathname = usePathname()
  const pathBusinessSlug = getBusinessSlugFromPathname(pathname)
  const basePath = pathBusinessSlug ? `/${pathBusinessSlug}` : ''
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSelectType = async (type: SessionType) => {
    setIsProcessing(true)

    try {
      if (mode === 'change' && existingWorkoutId) {
        // Change existing workout type
        await handleChangeWorkoutType(type, existingWorkoutId)
      } else if (mode === 'add' && dayId) {
        // Add new workout to day
        await handleAddWorkout(type, dayId)
      }
    } catch (error) {
      console.error('Error processing session type:', error)
      toast({
        title: t(locale, 'Fel', 'Error'),
        description: t(locale, 'Kunde inte bearbeta träningspasset.', 'Could not process the training session.'),
        variant: 'destructive',
      })
      setIsProcessing(false)
    }
  }

  const handleChangeWorkoutType = async (type: SessionType, workoutId: string) => {
    if (type === 'REST') {
      // Delete the workout entirely
      const res = await fetch(`/api/workouts/${workoutId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete workout')
      }

      toast({
        title: t(locale, 'Pass borttaget', 'Session removed'),
        description: t(locale, 'Träningspasset har tagits bort.', 'The training session has been removed.'),
      })

      onOpenChange(false)
      setIsProcessing(false)
      router.refresh()
      return
    }

    // Change workout type
    const res = await fetch(`/api/workouts/${workoutId}/change-type`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newType: type }),
    })

    if (!res.ok) {
      throw new Error('Failed to change workout type')
    }

    toast({
      title: t(locale, 'Passtyp ändrad', 'Session type changed'),
      description: t(
        locale,
        `Träningspasset har ändrats till ${SESSION_OPTIONS.find(o => o.type === type)?.label.sv}.`,
        `The training session was changed to ${SESSION_OPTIONS.find(o => o.type === type)?.label.en}.`
      ),
    })

    onOpenChange(false)
    setIsProcessing(false)

    // Navigate to appropriate studio for editing
    navigateToStudio(type, workoutId)
  }

  const handleAddWorkout = async (type: SessionType, dayId: string) => {
    if (type === 'REST') {
      // Just close dialog - rest day means no workout
      toast({
        title: t(locale, 'Vilodag', 'Rest day'),
        description: t(locale, 'Ingen träning har lagts till.', 'No training was added.'),
      })
      onOpenChange(false)
      setIsProcessing(false)
      return
    }

    // Create new workout on this day
    const res = await fetch(`/api/programs/${programId}/days/${dayId}/add-workout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        date: date?.toISOString(),
      }),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
      console.error('API Error:', errorData)
      throw new Error(errorData.error || 'Failed to add workout')
    }

    const data = await res.json()

    toast({
      title: t(locale, 'Pass skapat', 'Session created'),
      description: t(locale, 'Nytt träningspass har skapats. Fyll i detaljerna.', 'A new training session was created. Fill in the details.'),
    })

    onOpenChange(false)
    setIsProcessing(false)

    // Navigate to appropriate studio
    navigateToStudio(type, data.workoutId)
  }

  const navigateToStudio = (type: SessionType, workoutId: string) => {
    switch (type) {
      case 'RUNNING':
        router.push(`${basePath}/coach/cardio?workoutId=${workoutId}&programId=${programId}`)
        break
      case 'STRENGTH':
        router.push(`${basePath}/coach/strength?workoutId=${workoutId}&programId=${programId}`)
        break
      case 'CORE':
        // For now, use strength studio with core filter
        router.push(`${basePath}/coach/strength?workoutId=${workoutId}&programId=${programId}&type=core`)
        break
      case 'ALTERNATIVE':
        // For now, use cardio studio
        router.push(`${basePath}/coach/cardio?workoutId=${workoutId}&programId=${programId}&type=alternative`)
        break
      default:
        router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add'
              ? t(locale, 'Lägg till träningspass', 'Add training session')
              : t(locale, 'Ändra passtyp', 'Change session type')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? t(locale, 'Välj typ av träningspass du vill lägga till.', 'Choose the type of training session to add.')
              : t(locale, 'Välj ny typ för träningspasset. Befintliga segment kommer att tas bort.', 'Choose a new type for the training session. Existing segments will be removed.')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-4">
          {SESSION_OPTIONS.map((option) => (
            <Card
              key={option.type}
              className={`cursor-pointer transition-all hover:shadow-md border-2 ${option.color} ${
                isProcessing ? 'opacity-50 pointer-events-none' : ''
              }`}
              onClick={() => handleSelectType(option.type)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className={option.color}>
                  {option.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{option.label[locale]}</h4>
                  <p className="text-sm text-muted-foreground">
                    {option.description[locale]}
                  </p>
                </div>
                {isProcessing && (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            {t(locale, 'Avbryt', 'Cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
