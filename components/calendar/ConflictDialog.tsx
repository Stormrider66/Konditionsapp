'use client'

/**
 * Conflict Dialog Component
 *
 * Shows detected conflicts when rescheduling workouts and provides
 * resolution options for the user to choose from.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertTriangle,
  Calendar,
  Clock,
  XCircle,
  CheckCircle,
  ArrowRight,
  Zap,
  Minus,
  SkipForward,
} from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { Conflict, ConflictResolution, ConflictSeverity } from '@/lib/calendar/conflict-detection'
import { useState } from 'react'

interface ConflictDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conflicts: Conflict[]
  workoutName: string
  originalDate: Date
  targetDate: Date
  onResolve: (resolution: ConflictResolution | null) => void
  onCancel: () => void
  isLoading?: boolean
}

const severityConfig: Record<
  ConflictSeverity,
  { color: string; bgColor: string; icon: typeof AlertTriangle; label: string }
> = {
  CRITICAL: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
    icon: XCircle,
    label: 'Kritisk',
  },
  HIGH: {
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900',
    icon: AlertTriangle,
    label: 'Hög',
  },
  MEDIUM: {
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900',
    icon: AlertTriangle,
    label: 'Medium',
  },
  LOW: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900',
    icon: CheckCircle,
    label: 'Låg',
  },
}

const resolutionIcons: Record<string, typeof ArrowRight> = {
  RESCHEDULE: Calendar,
  MODIFY_INTENSITY: Zap,
  MODIFY_DURATION: Clock,
  CANCEL: XCircle,
  SWAP: ArrowRight,
  IGNORE: SkipForward,
}

export function ConflictDialog({
  open,
  onOpenChange,
  conflicts,
  workoutName,
  originalDate,
  targetDate,
  onResolve,
  onCancel,
  isLoading = false,
}: ConflictDialogProps) {
  const [selectedResolution, setSelectedResolution] = useState<ConflictResolution | null>(null)

  // Get all unique resolutions across all conflicts
  const allResolutions = conflicts.flatMap((c) => c.suggestedResolutions)

  // Deduplicate by type
  const uniqueResolutions = allResolutions.reduce<ConflictResolution[]>((acc, res) => {
    const exists = acc.some((r) => r.type === res.type && r.description === res.description)
    if (!exists) {
      acc.push(res)
    }
    return acc
  }, [])

  // Sort by confidence (highest first)
  const sortedResolutions = uniqueResolutions.sort((a, b) => b.confidence - a.confidence)

  const hasCritical = conflicts.some((c) => c.severity === 'CRITICAL')
  const hasHigh = conflicts.some((c) => c.severity === 'HIGH')

  const handleConfirm = () => {
    onResolve(selectedResolution)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Konflikter upptäckta
          </DialogTitle>
          <DialogDescription>
            Det finns {conflicts.length} konflikt{conflicts.length > 1 ? 'er' : ''} när du flyttar{' '}
            <strong>{workoutName}</strong> till{' '}
            {format(targetDate, 'EEEE d MMMM', { locale: sv })}.
          </DialogDescription>
        </DialogHeader>

        {/* Move summary */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 px-3 bg-muted rounded-md">
          <Calendar className="h-4 w-4" />
          <span>{format(originalDate, 'd MMM', { locale: sv })}</span>
          <ArrowRight className="h-4 w-4" />
          <span className="font-medium text-foreground">
            {format(targetDate, 'd MMM', { locale: sv })}
          </span>
        </div>

        {/* Conflicts list */}
        <div className="space-y-3">
          {conflicts.map((conflict) => {
            const config = severityConfig[conflict.severity]
            const Icon = config.icon

            return (
              <Alert
                key={conflict.id}
                className={cn('border', config.bgColor)}
              >
                <Icon className={cn('h-4 w-4', config.color)} />
                <AlertTitle className="flex items-center gap-2">
                  <span>{conflict.explanation}</span>
                  <Badge
                    variant="outline"
                    className={cn('text-xs', config.color)}
                  >
                    {config.label}
                  </Badge>
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground mt-1">
                  Påverkar:{' '}
                  {conflict.affectedItems.map((item) => item.name).join(', ')}
                </AlertDescription>
              </Alert>
            )
          })}
        </div>

        {/* Resolution options */}
        {sortedResolutions.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="font-medium text-sm">Välj hur du vill hantera detta:</h4>

            <RadioGroup
              value={selectedResolution?.type || ''}
              onValueChange={(value) => {
                const resolution = sortedResolutions.find((r) => r.type === value)
                setSelectedResolution(resolution || null)
              }}
            >
              {sortedResolutions.map((resolution) => {
                const Icon = resolutionIcons[resolution.type] || ArrowRight
                const isRecommended = resolution.confidence >= 80

                return (
                  <div
                    key={`${resolution.type}-${resolution.description}`}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                      selectedResolution?.type === resolution.type
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50'
                    )}
                    onClick={() => setSelectedResolution(resolution)}
                  >
                    <RadioGroupItem
                      value={resolution.type}
                      id={`resolution-${resolution.type}`}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor={`resolution-${resolution.type}`}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{resolution.description}</span>
                        {isRecommended && (
                          <Badge variant="secondary" className="text-xs">
                            Rekommenderas
                          </Badge>
                        )}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {resolution.impact}
                      </p>
                      {resolution.newDate && (
                        <p className="text-xs text-primary">
                          Nytt datum: {format(new Date(resolution.newDate), 'EEEE d MMMM', { locale: sv })}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {resolution.confidence}%
                    </div>
                  </div>
                )
              })}
            </RadioGroup>
          </div>
        )}

        {/* Warning for critical conflicts */}
        {hasCritical && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Kritiska konflikter</AlertTitle>
            <AlertDescription>
              Det finns kritiska konflikter som starkt avråder från denna flytt.
              Välj en alternativ lösning ovan.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Avbryt
          </Button>

          {!hasCritical && (
            <Button
              variant={hasHigh ? 'outline' : 'default'}
              onClick={() => onResolve(null)}
              disabled={isLoading}
            >
              {hasHigh ? 'Fortsätt ändå' : 'Flytta utan ändringar'}
            </Button>
          )}

          {selectedResolution && (
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Flyttar...' : 'Tillämpa lösning'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
