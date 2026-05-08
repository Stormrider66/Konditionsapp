'use client'

import { usePathname } from 'next/navigation'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ButtonProps } from '@/components/ui/button'
import type { PrintableWorkoutKind } from '@/lib/workout-print/normalize'

interface PrintWorkoutButtonProps extends Omit<ButtonProps, 'onClick'> {
  kind: PrintableWorkoutKind
  workoutId?: string | null
  date?: Date | string | null
  athleteName?: string | null
  label?: string
}

export function getCoachBasePath(pathname: string | null): string {
  const match = pathname?.match(/^\/([^/]+)\/coach(?:\/|$)/)
  return match?.[1] ? `/${match[1]}/coach` : '/coach'
}

export function buildWorkoutPrintUrl({
  coachBasePath,
  kind,
  workoutId,
  date,
  athleteName,
}: {
  coachBasePath: string
  kind: PrintableWorkoutKind
  workoutId: string
  date?: Date | string | null
  athleteName?: string | null
}) {
  const params = new URLSearchParams({ kind, id: workoutId })
  if (date) {
    params.set('date', date instanceof Date ? date.toISOString() : String(date))
  }
  if (athleteName) params.set('athlete', athleteName)
  return `${coachBasePath}/workouts/print?${params.toString()}`
}

export function PrintWorkoutButton({
  kind,
  workoutId,
  date,
  athleteName,
  label = 'Skriv ut',
  variant = 'outline',
  size = 'sm',
  disabled,
  children,
  ...props
}: PrintWorkoutButtonProps) {
  const pathname = usePathname()
  const isDisabled = disabled || !workoutId

  const handleClick = () => {
    if (!workoutId) return
    const url = buildWorkoutPrintUrl({
      coachBasePath: getCoachBasePath(pathname),
      kind,
      workoutId,
      date,
      athleteName,
    })
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Button
      {...props}
      type="button"
      variant={variant}
      size={size}
      disabled={isDisabled}
      onClick={handleClick}
    >
      {children ?? (
        <>
          <Printer className="h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  )
}
