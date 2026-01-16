'use client'

/**
 * Log Workout Button
 *
 * A prominent button/FAB to open the input method selector for logging ad-hoc workouts.
 * Can be used as a card, floating action button, or inline button.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Dumbbell } from 'lucide-react'
import { InputMethodSelector } from './InputMethodSelector'
import { cn } from '@/lib/utils'

interface LogWorkoutButtonProps {
  variant?: 'card' | 'fab' | 'button' | 'inline'
  className?: string
}

export function LogWorkoutButton({ variant = 'card', className }: LogWorkoutButtonProps) {
  const [open, setOpen] = useState(false)

  if (variant === 'fab') {
    return (
      <>
        <Button
          size="lg"
          className={cn(
            'fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50',
            'hover:scale-105 transition-transform',
            className
          )}
          onClick={() => setOpen(true)}
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">Logga ett pass</span>
        </Button>
        <InputMethodSelector open={open} onOpenChange={setOpen} />
      </>
    )
  }

  if (variant === 'button') {
    return (
      <>
        <Button onClick={() => setOpen(true)} className={className}>
          <Plus className="h-4 w-4 mr-2" />
          Logga ett pass
        </Button>
        <InputMethodSelector open={open} onOpenChange={setOpen} />
      </>
    )
  }

  if (variant === 'inline') {
    return (
      <>
        <Button variant="ghost" onClick={() => setOpen(true)} className={className}>
          <Plus className="h-4 w-4 mr-2" />
          Logga pass
        </Button>
        <InputMethodSelector open={open} onOpenChange={setOpen} />
      </>
    )
  }

  // Card variant (default)
  return (
    <>
      <Card
        className={cn(
          'cursor-pointer hover:border-primary/50 transition-colors group',
          className
        )}
        onClick={() => setOpen(true)}
      >
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Logga ett pass</h3>
              <p className="text-sm text-muted-foreground">
                Registrera ett träningspass du gjort
              </p>
            </div>
            <Plus className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </CardContent>
      </Card>
      <InputMethodSelector open={open} onOpenChange={setOpen} />
    </>
  )
}
