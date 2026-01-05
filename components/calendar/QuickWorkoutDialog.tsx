'use client'

/**
 * Quick Workout Dialog
 *
 * A lightweight dialog for creating simple workouts quickly.
 * Used when coach clicks "Snabbpass" in the day action menu.
 */

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ProgramSelector } from './ProgramSelector'

// Workout types with Swedish labels
const WORKOUT_TYPES = [
  { value: 'RUNNING', label: 'Löpning' },
  { value: 'STRENGTH', label: 'Styrka' },
  { value: 'CYCLING', label: 'Cykling' },
  { value: 'SWIMMING', label: 'Simning' },
  { value: 'SKIING', label: 'Skidåkning' },
  { value: 'CORE', label: 'Core' },
  { value: 'PLYOMETRIC', label: 'Plyometri' },
  { value: 'RECOVERY', label: 'Återhämtning' },
  { value: 'OTHER', label: 'Övrigt' },
] as const

// Intensity levels with Swedish labels
const INTENSITY_LEVELS = [
  { value: 'RECOVERY', label: 'Återhämtning', color: 'bg-green-100 text-green-800' },
  { value: 'EASY', label: 'Lätt', color: 'bg-green-200 text-green-800' },
  { value: 'MODERATE', label: 'Måttlig', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'THRESHOLD', label: 'Tröskel', color: 'bg-orange-100 text-orange-800' },
  { value: 'INTERVAL', label: 'Intervall', color: 'bg-red-100 text-red-800' },
  { value: 'MAX', label: 'Maximal', color: 'bg-red-200 text-red-800' },
] as const

type WorkoutType = typeof WORKOUT_TYPES[number]['value']
type IntensityLevel = typeof INTENSITY_LEVELS[number]['value']

interface QuickWorkoutDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Called when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Client ID for the workout */
  clientId: string
  /** Date for the workout */
  date: Date
  /** Called when workout is successfully created */
  onCreated: () => void
}

export function QuickWorkoutDialog({
  open,
  onOpenChange,
  clientId,
  date,
  onCreated,
}: QuickWorkoutDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [workoutType, setWorkoutType] = useState<WorkoutType>('RUNNING')
  const [name, setName] = useState('')
  const [duration, setDuration] = useState(60)
  const [intensity, setIntensity] = useState<IntensityLevel>('MODERATE')
  const [programId, setProgramId] = useState<string>('')
  const [notes, setNotes] = useState('')

  // Generate default name based on type
  const generateDefaultName = useCallback((type: WorkoutType) => {
    const typeLabel = WORKOUT_TYPES.find(t => t.value === type)?.label || type
    return `${typeLabel} - ${format(date, 'd MMM', { locale: sv })}`
  }, [date])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setWorkoutType('RUNNING')
      setName('')
      setDuration(60)
      setIntensity('MODERATE')
      setProgramId('')
      setNotes('')
    }
  }, [open])

  // Update name when type changes (if name is empty or was auto-generated)
  useEffect(() => {
    if (!name || WORKOUT_TYPES.some(t => name.startsWith(t.label))) {
      setName(generateDefaultName(workoutType))
    }
  }, [workoutType, name, generateDefaultName])

  const handleSubmit = async () => {
    if (!programId) {
      toast({
        title: 'Välj program',
        description: 'Du måste välja ett program för att skapa passet',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/workouts/quick-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          programId,
          date: date.toISOString(),
          type: workoutType,
          name: name || generateDefaultName(workoutType),
          duration,
          intensity,
          notes: notes || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Kunde inte skapa passet')
      }

      toast({
        title: 'Pass skapat',
        description: `${name} har lagts till i kalendern`,
      })

      onCreated()
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating workout:', error)
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Kunde inte skapa passet',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formattedDate = format(date, 'EEEE d MMMM yyyy', { locale: sv })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Skapa snabbpass</DialogTitle>
          <DialogDescription className="capitalize">
            {formattedDate}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Program Selector */}
          <div className="space-y-2">
            <Label htmlFor="program">Program *</Label>
            <ProgramSelector
              clientId={clientId}
              value={programId}
              onValueChange={setProgramId}
            />
          </div>

          {/* Workout Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Passtyp</Label>
            <Select value={workoutType} onValueChange={(v) => setWorkoutType(v as WorkoutType)}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Välj typ" />
              </SelectTrigger>
              <SelectContent>
                {WORKOUT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Namn</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={generateDefaultName(workoutType)}
            />
          </div>

          {/* Duration and Intensity in a row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Varaktighet (min)</Label>
              <Input
                id="duration"
                type="number"
                min={5}
                max={300}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="intensity">Intensitet</Label>
              <Select value={intensity} onValueChange={(v) => setIntensity(v as IntensityLevel)}>
                <SelectTrigger id="intensity">
                  <SelectValue placeholder="Välj intensitet" />
                </SelectTrigger>
                <SelectContent>
                  {INTENSITY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <span className={`px-2 py-0.5 rounded text-xs ${level.color}`}>
                        {level.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Anteckningar (valfritt)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Lägg till instruktioner eller anteckningar..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Avbryt
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Skapar...
              </>
            ) : (
              'Skapa pass'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
