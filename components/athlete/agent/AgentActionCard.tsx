'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronDown,
  ChevronUp,
  Check,
  X,
  AlertTriangle,
  TrendingDown,
  Calendar,
  Heart,
  MessageSquare,
  ArrowUp,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionData {
  type: string
  reductionPercent?: number
  originalIntensity?: string
  newIntensity?: string
  reason?: string
  message?: string
  targetDate?: string
}

interface AgentAction {
  id: string
  actionType: string
  actionData: ActionData
  reasoning: string
  confidence: string
  confidenceScore: number
  priority: string
  status: string
  targetDate: string | null
  proposedAt: string
  expiresAt: string | null
}

interface AgentActionCardProps {
  action: AgentAction
  onAccept: (id: string, feedback?: string) => Promise<void>
  onReject: (id: string, reason?: string) => Promise<void>
  basePath?: string
}

export function AgentActionCard({
  action,
  onAccept,
  onReject,
}: AgentActionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState<'accept' | 'reject' | null>(null)

  const handleAccept = async () => {
    setIsLoading('accept')
    try {
      await onAccept(action.id)
    } finally {
      setIsLoading(null)
    }
  }

  const handleReject = async () => {
    setIsLoading('reject')
    try {
      await onReject(action.id)
    } finally {
      setIsLoading(null)
    }
  }

  const getActionIcon = () => {
    switch (action.actionType) {
      case 'WORKOUT_INTENSITY_REDUCTION':
        return <TrendingDown className="h-4 w-4" />
      case 'WORKOUT_DURATION_REDUCTION':
        return <TrendingDown className="h-4 w-4" />
      case 'REST_DAY_INJECTION':
        return <Calendar className="h-4 w-4" />
      case 'RECOVERY_ACTIVITY_SUGGESTION':
        return <Heart className="h-4 w-4" />
      case 'MOTIVATIONAL_NUDGE':
        return <Sparkles className="h-4 w-4" />
      case 'ESCALATE_TO_COACH':
        return <ArrowUp className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getActionTitle = () => {
    const data = action.actionData
    switch (action.actionType) {
      case 'WORKOUT_INTENSITY_REDUCTION':
        return `Reduce intensity by ${data.reductionPercent || 20}%`
      case 'WORKOUT_DURATION_REDUCTION':
        return `Shorten workout by ${data.reductionPercent || 25}%`
      case 'REST_DAY_INJECTION':
        return 'Take a rest day'
      case 'RECOVERY_ACTIVITY_SUGGESTION':
        return 'Recovery activity suggested'
      case 'MOTIVATIONAL_NUDGE':
        return 'Keep going!'
      case 'ESCALATE_TO_COACH':
        return 'Connect with your coach'
      case 'WORKOUT_SKIP_RECOMMENDATION':
        return 'Skip today\'s workout'
      default:
        return 'Agent recommendation'
    }
  }

  const getPriorityColor = () => {
    switch (action.priority) {
      case 'URGENT':
        return 'border-red-300 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 dark:border-red-800'
      case 'HIGH':
        return 'border-orange-300 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30 dark:border-orange-800'
      case 'NORMAL':
        return 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 dark:border-blue-800'
      case 'LOW':
        return 'border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30 dark:border-gray-700'
      default:
        return 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 dark:border-blue-800'
    }
  }

  const getConfidenceColor = () => {
    switch (action.confidence) {
      case 'VERY_HIGH':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
      case 'HIGH':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
      case 'LOW':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
    }
  }

  // Don't show actions that are already processed
  if (action.status !== 'PROPOSED') {
    return null
  }

  return (
    <Card className={cn('overflow-hidden transition-all', getPriorityColor())}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2 rounded-lg',
                action.priority === 'URGENT'
                  ? 'bg-red-100 dark:bg-red-900/50'
                  : action.priority === 'HIGH'
                    ? 'bg-orange-100 dark:bg-orange-900/50'
                    : 'bg-blue-100 dark:bg-blue-900/50'
              )}
            >
              {getActionIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-sm">{getActionTitle()}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={cn('text-xs', getConfidenceColor())}>
                  {Math.round(action.confidenceScore * 100)}% confident
                </Badge>
                {action.priority === 'URGENT' && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Urgent
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Expandable content */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-current/10">
            <p className="text-sm text-muted-foreground">{action.reasoning}</p>

            {action.targetDate && (
              <p className="text-xs text-muted-foreground mt-2">
                For: {new Date(action.targetDate).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-current/10">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={handleAccept}
            disabled={isLoading !== null}
          >
            {isLoading === 'accept' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Accept
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleReject}
            disabled={isLoading !== null}
          >
            {isLoading === 'reject' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <X className="h-4 w-4 mr-1" />
                Dismiss
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
