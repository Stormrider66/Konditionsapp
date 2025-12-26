'use client'

/**
 * Reschedule Confirm Dialog Component
 *
 * Simple confirmation dialog for workout rescheduling when there are
 * no conflicts or conflicts have already been resolved.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Calendar, ArrowRight, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { useState } from 'react'

interface RescheduleConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workoutName: string
  workoutType?: string
  originalDate: Date
  targetDate: Date
  onConfirm: (reason?: string) => void
  onCancel: () => void
  isLoading?: boolean
  warnings?: string[]
}

export function RescheduleConfirmDialog({
  open,
  onOpenChange,
  workoutName,
  workoutType,
  originalDate,
  targetDate,
  onConfirm,
  onCancel,
  isLoading = false,
  warnings = [],
}: RescheduleConfirmDialogProps) {
  const [reason, setReason] = useState('')

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined)
    setReason('')
  }

  const handleCancel = () => {
    setReason('')
    onCancel()
  }

  // Calculate days difference
  const daysDiff = Math.round(
    (targetDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  const direction = daysDiff > 0 ? 'framåt' : 'bakåt'

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Flytta träningspass
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Vill du flytta <strong>{workoutName}</strong>
                {workoutType && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {workoutType}
                  </Badge>
                )}
              </p>

              {/* Date visualization */}
              <div className="flex items-center gap-3 py-3 px-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    Från
                  </div>
                  <div className="font-semibold">
                    {format(originalDate, 'd MMM', { locale: sv })}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {format(originalDate, 'EEEE', { locale: sv })}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <ArrowRight className="h-5 w-5 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    {Math.abs(daysDiff)} dag{Math.abs(daysDiff) !== 1 ? 'ar' : ''} {direction}
                  </span>
                </div>

                <div className="text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    Till
                  </div>
                  <div className="font-semibold text-primary">
                    {format(targetDate, 'd MMM', { locale: sv })}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {format(targetDate, 'EEEE', { locale: sv })}
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded">
                  {warnings.map((warning, idx) => (
                    <p key={idx}>⚠️ {warning}</p>
                  ))}
                </div>
              )}

              {/* Optional reason */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm">
                  Anledning (valfritt)
                </Label>
                <Input
                  id="reason"
                  placeholder="T.ex. 'Jobbrelaterad'"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
            Avbryt
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Flyttar...
              </>
            ) : (
              'Flytta pass'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
