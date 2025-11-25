'use client'

import { useRouter } from 'next/navigation'
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
  label: string
  description: string
  icon: React.ReactNode
  color: string
}

const SESSION_OPTIONS: SessionOption[] = [
  {
    type: 'RUNNING',
    label: 'Running/Cardio',
    description: 'Løppass med intervaller, distans och zon-träning',
    icon: <Activity className="h-8 w-8" />,
    color: 'text-blue-600 hover:bg-blue-50 border-blue-200',
  },
  {
    type: 'STRENGTH',
    label: 'Strength Training',
    description: 'Styrketräning med övningar, set och repetitioner',
    icon: <Dumbbell className="h-8 w-8" />,
    color: 'text-purple-600 hover:bg-purple-50 border-purple-200',
  },
  {
    type: 'CORE',
    label: 'Core Training',
    description: 'Core-stabilitet och balans-övningar',
    icon: <Target className="h-8 w-8" />,
    color: 'text-orange-600 hover:bg-orange-50 border-orange-200',
  },
  {
    type: 'ALTERNATIVE',
    label: 'Alternative Training',
    description: 'Cykling, simning, DWR eller elliptical',
    icon: <Bike className="h-8 w-8" />,
    color: 'text-green-600 hover:bg-green-50 border-green-200',
  },
  {
    type: 'REST',
    label: 'Rest Day',
    description: 'Vilodag - ingen träning',
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
  const router = useRouter()
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
        title: 'Fel',
        description: 'Kunde inte bearbeta träningspasset.',
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
        title: 'Pass borttaget',
        description: 'Träningspasset har tagits bort.',
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

    const data = await res.json()

    toast({
      title: 'Passtyp ändrad',
      description: `Träningspasset har ändrats till ${SESSION_OPTIONS.find(o => o.type === type)?.label}.`,
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
        title: 'Vilodag',
        description: 'Ingen träning har lagts till.',
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
      title: 'Pass skapat',
      description: 'Nytt träningspass har skapats. Fyll i detaljerna.',
    })

    onOpenChange(false)
    setIsProcessing(false)

    // Navigate to appropriate studio
    navigateToStudio(type, data.workoutId)
  }

  const navigateToStudio = (type: SessionType, workoutId: string) => {
    switch (type) {
      case 'RUNNING':
        router.push(`/coach/cardio?workoutId=${workoutId}&programId=${programId}`)
        break
      case 'STRENGTH':
        router.push(`/coach/strength?workoutId=${workoutId}&programId=${programId}`)
        break
      case 'CORE':
        // For now, use strength studio with core filter
        router.push(`/coach/strength?workoutId=${workoutId}&programId=${programId}&type=core`)
        break
      case 'ALTERNATIVE':
        // For now, use cardio studio
        router.push(`/coach/cardio?workoutId=${workoutId}&programId=${programId}&type=alternative`)
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
            {mode === 'add' ? 'Lägg till träningspass' : 'Ändra passtyp'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? 'Välj typ av träningspass du vill lägga till.'
              : 'Välj ny typ för träningspasset. Befintliga segment kommer att tas bort.'}
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
                  <h4 className="font-semibold text-lg">{option.label}</h4>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
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
            Avbryt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
