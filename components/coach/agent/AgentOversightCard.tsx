'use client'

/**
 * Agent Oversight Card
 *
 * Individual card showing an agent action that needs coach review.
 * Displays action details, athlete context, and approve/reject buttons.
 */

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Bot,
  Check,
  X,
  Edit,
  ChevronDown,
  ChevronUp,
  Activity,
  TrendingDown,
  Moon,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface OversightAction {
  id: string
  actionType: string
  actionData: Record<string, unknown>
  reasoning: string
  confidence: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
  confidenceScore: number
  priority: string
  status: string
  proposedAt: string
  expiresAt?: string
  targetDate?: string
  client: {
    id: string
    name: string
    email?: string
  }
  perception?: {
    readinessScore?: number
    acwr?: number
    acwrZone?: string
  }
}

interface AgentOversightCardProps {
  action: OversightAction
  onApprove: (actionId: string) => void
  onReject: (actionId: string) => void
  onModify: (action: OversightAction) => void
  isProcessing?: boolean
}

const actionTypeConfig: Record<
  string,
  { icon: React.ReactNode; label: string; color: string }
> = {
  WORKOUT_INTENSITY_REDUCTION: {
    icon: <TrendingDown className="h-4 w-4" />,
    label: 'Reduce Intensity',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  WORKOUT_DURATION_REDUCTION: {
    icon: <Activity className="h-4 w-4" />,
    label: 'Reduce Duration',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  WORKOUT_SUBSTITUTION: {
    icon: <RefreshCw className="h-4 w-4" />,
    label: 'Substitute Workout',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  WORKOUT_SKIP_RECOMMENDATION: {
    icon: <X className="h-4 w-4" />,
    label: 'Skip Workout',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
  },
  REST_DAY_INJECTION: {
    icon: <Moon className="h-4 w-4" />,
    label: 'Add Rest Day',
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  },
  RECOVERY_ACTIVITY_SUGGESTION: {
    icon: <Zap className="h-4 w-4" />,
    label: 'Recovery Activity',
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
  },
  ESCALATE_TO_COACH: {
    icon: <AlertTriangle className="h-4 w-4" />,
    label: 'Escalation',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
  },
  MOTIVATIONAL_NUDGE: {
    icon: <MessageSquare className="h-4 w-4" />,
    label: 'Motivation',
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
  },
}

const confidenceColors: Record<string, string> = {
  LOW: 'bg-red-500/10 text-red-600 border-red-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  HIGH: 'bg-green-500/10 text-green-600 border-green-500/20',
  VERY_HIGH: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-slate-500/10 text-slate-600',
  NORMAL: 'bg-blue-500/10 text-blue-600',
  HIGH: 'bg-amber-500/10 text-amber-600',
  CRITICAL: 'bg-red-500/10 text-red-600',
}

export function AgentOversightCard({
  action,
  onApprove,
  onReject,
  onModify,
  isProcessing = false,
}: AgentOversightCardProps) {
  const [expanded, setExpanded] = useState(false)

  const typeConfig = actionTypeConfig[action.actionType] || {
    icon: <Bot className="h-4 w-4" />,
    label: action.actionType,
    color: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  }

  const initials = action.client.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const timeAgo = formatDistanceToNow(new Date(action.proposedAt), {
    addSuffix: true,
    locale: sv,
  })

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{action.client.name}</CardTitle>
              <CardDescription className="text-xs">{timeAgo}</CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('text-xs', priorityColors[action.priority])}>
              {action.priority}
            </Badge>
            <Badge variant="outline" className={cn('text-xs', typeConfig.color)}>
              <span className="mr-1">{typeConfig.icon}</span>
              {typeConfig.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Reasoning */}
        <div className="text-sm text-muted-foreground">
          <p className={cn(!expanded && 'line-clamp-2')}>{action.reasoning}</p>
          {action.reasoning.length > 150 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
            >
              {expanded ? (
                <>
                  Show less <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Show more <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Context */}
        <div className="flex flex-wrap gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn('text-xs', confidenceColors[action.confidence])}>
                  {Math.round(action.confidenceScore * 100)}% confidence
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Agent confidence level: {action.confidence}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {action.perception?.readinessScore && (
            <Badge variant="outline" className="text-xs">
              Readiness: {action.perception.readinessScore.toFixed(1)}/10
            </Badge>
          )}

          {action.perception?.acwr && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                action.perception.acwrZone === 'CRITICAL'
                  ? 'bg-red-500/10 text-red-600'
                  : action.perception.acwrZone === 'DANGER'
                    ? 'bg-orange-500/10 text-orange-600'
                    : action.perception.acwrZone === 'CAUTION'
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-green-500/10 text-green-600'
              )}
            >
              ACWR: {action.perception.acwr.toFixed(2)}
            </Badge>
          )}

          {action.targetDate && (
            <Badge variant="outline" className="text-xs">
              Target: {new Date(action.targetDate).toLocaleDateString('sv-SE')}
            </Badge>
          )}
        </div>

        {/* Action Data Preview */}
        {expanded && Object.keys(action.actionData).length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono">
            <pre className="overflow-x-auto">
              {JSON.stringify(action.actionData, null, 2)}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            size="sm"
            onClick={() => onApprove(action.id)}
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onModify(action)}
            disabled={isProcessing}
          >
            <Edit className="h-4 w-4 mr-1" />
            Modify
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReject(action.id)}
            disabled={isProcessing}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
