/**
 * Nutrition Tip Card Component
 *
 * Displays a quick nutrition tip after daily check-in.
 * Shows workout context and actionable recommendations in Swedish.
 *
 * Used in:
 * - DailyCheckInForm result section
 * - Athlete dashboard
 */

'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Utensils,
  Droplets,
  Battery,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'
import type { NutritionTip, NutritionTipType, TipPriority } from '@/lib/nutrition-timing'

interface NutritionTipCardProps {
  tip: NutritionTip
  onDismiss?: () => void
  showDismiss?: boolean
  compact?: boolean
}

/**
 * Get icon for tip type
 */
function getTipIcon(type: NutritionTipType) {
  switch (type) {
    case 'PRE_WORKOUT':
    case 'POST_WORKOUT':
      return Utensils
    case 'HYDRATION':
      return Droplets
    case 'RECOVERY_DAY':
      return Battery
    case 'RACE_PREP':
      return Dumbbell
    default:
      return Utensils
  }
}

/**
 * Get priority badge color
 */
function getPriorityStyles(priority: TipPriority): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  className: string
} {
  switch (priority) {
    case 'HIGH':
      return { variant: 'destructive', className: 'bg-red-100 text-red-800 border-red-200' }
    case 'MEDIUM':
      return { variant: 'default', className: 'bg-amber-100 text-amber-800 border-amber-200' }
    case 'LOW':
      return { variant: 'secondary', className: 'bg-slate-100 text-slate-600 border-slate-200' }
    default:
      return { variant: 'outline', className: '' }
  }
}

/**
 * Get Swedish label for priority
 */
function getPriorityLabel(priority: TipPriority): string {
  switch (priority) {
    case 'HIGH':
      return 'Viktigt'
    case 'MEDIUM':
      return 'Tips'
    case 'LOW':
      return 'Info'
    default:
      return 'Tips'
  }
}

/**
 * Get card border color based on priority
 */
function getCardBorderClass(priority: TipPriority): string {
  switch (priority) {
    case 'HIGH':
      return 'border-l-4 border-l-red-500'
    case 'MEDIUM':
      return 'border-l-4 border-l-amber-500'
    case 'LOW':
      return 'border-l-4 border-l-slate-300'
    default:
      return ''
  }
}

export function NutritionTipCard({
  tip,
  onDismiss,
  showDismiss = true,
  compact = false,
}: NutritionTipCardProps) {
  const [isExpanded, setIsExpanded] = useState(!compact)
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  const Icon = getTipIcon(tip.type)
  const priorityStyles = getPriorityStyles(tip.priority)
  const borderClass = getCardBorderClass(tip.priority)

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  return (
    <Card className={`relative overflow-hidden ${borderClass} bg-white shadow-sm`}>
      <CardContent className={compact ? 'p-3' : 'p-4'}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-shrink-0 p-1.5 rounded-full bg-slate-100">
              <Icon className="h-4 w-4 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm text-slate-900 truncate">
                  {tip.title}
                </h4>
                <Badge
                  variant="outline"
                  className={`text-xs px-1.5 py-0 ${priorityStyles.className}`}
                >
                  {getPriorityLabel(tip.priority)}
                </Badge>
              </div>
              {/* Workout context if available */}
              {tip.workoutContext && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {tip.workoutContext.name}
                  {tip.workoutContext.time && ` kl ${tip.workoutContext.time}`}
                  {tip.workoutContext.intensity && ` (${tip.workoutContext.intensity})`}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {compact && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? 'Minimera' : 'Expandera'}
              >
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
            {showDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-400 hover:text-slate-600"
                onClick={handleDismiss}
                aria-label="Stäng"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Message */}
        {isExpanded && (
          <div className="mt-2">
            <p className="text-sm text-slate-700 leading-relaxed">
              {tip.message}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for NutritionTipCard
 */
export function NutritionTipCardSkeleton() {
  return (
    <Card className="border-l-4 border-l-slate-200 bg-white shadow-sm animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 p-1.5 rounded-full bg-slate-100">
            <div className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="h-4 w-12 bg-slate-200 rounded" />
            </div>
            <div className="h-3 w-32 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-4/5 bg-slate-100 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}
