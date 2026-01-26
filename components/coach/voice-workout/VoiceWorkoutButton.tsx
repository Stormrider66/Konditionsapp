'use client'

/**
 * Voice Workout Button
 *
 * A button that opens the VoiceWorkoutCreator in a sheet/modal.
 * Used in the coach dashboard for quick access.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Mic } from 'lucide-react'
import { VoiceWorkoutCreator } from './VoiceWorkoutCreator'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface VoiceWorkoutButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'card'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  /** Base path for navigation (e.g., '/starbythomson' for business context) */
  basePath?: string
}

export function VoiceWorkoutButton({
  variant = 'default',
  size = 'default',
  className,
  basePath = '',
}: VoiceWorkoutButtonProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // Build coach path with optional business prefix
  const coachPath = basePath ? `${basePath}/coach` : '/coach'

  const handleComplete = (result: { workoutId: string; workoutType: string }) => {
    setOpen(false)
    // Navigate to the created workout
    switch (result.workoutType) {
      case 'STRENGTH':
        router.push(`${coachPath}/strength?created=${result.workoutId}`)
        break
      case 'CARDIO':
        router.push(`${coachPath}/cardio?created=${result.workoutId}`)
        break
      case 'HYBRID':
        router.push(`${coachPath}/hybrid-studio?created=${result.workoutId}`)
        break
      default:
        router.refresh()
    }
  }

  // Card variant for dashboard quick links
  if (variant === 'card') {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className={cn(
              'flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition text-center w-full',
              className
            )}
          >
            <Mic className="h-5 w-5 text-pink-500" />
            <span className="text-xs dark:text-slate-300">Röstpass</span>
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Skapa träningspass med röst</SheetTitle>
            <SheetDescription>Spela in ett röstkommando för att skapa ett träningspass</SheetDescription>
          </SheetHeader>
          <VoiceWorkoutCreator
            onComplete={handleComplete}
            onCancel={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={variant} size={size} className={cn('gap-2', className)}>
          <Mic className="h-4 w-4" />
          Skapa med röst
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Skapa träningspass med röst</SheetTitle>
          <SheetDescription>Spela in ett röstkommando för att skapa ett träningspass</SheetDescription>
        </SheetHeader>
        <VoiceWorkoutCreator
          onComplete={handleComplete}
          onCancel={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
