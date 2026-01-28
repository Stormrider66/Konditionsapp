'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sun,
  X,
  ChevronRight,
  AlertTriangle,
  Info,
  CheckCircle2,
  MessageSquare,
  Dumbbell,
  ClipboardCheck,
  Calendar,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface BriefingAlert {
  type: 'warning' | 'info' | 'success'
  message: string
}

interface QuickAction {
  label: string
  action: string
}

interface Briefing {
  id: string
  title: string
  content: string
  highlights: string[]
  readinessScore?: number
  todaysWorkout?: string
  alerts: BriefingAlert[]
  quickActions: QuickAction[]
  scheduledFor: string
  readAt?: string
  createdAt: string
}

export function MorningBriefingCard() {
  const router = useRouter()
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissing, setIsDismissing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    async function fetchBriefing() {
      try {
        const response = await fetch('/api/athlete/briefing')
        if (response.ok) {
          const data = await response.json()
          setBriefing(data.briefing)

          // Mark as read if not already
          if (data.briefing && !data.briefing.readAt) {
            fetch(`/api/athlete/briefing/${data.briefing.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'read' }),
            })
          }
        }
      } catch (error) {
        console.error('Error fetching briefing:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBriefing()
  }, [])

  async function handleDismiss() {
    if (!briefing) return
    setIsDismissing(true)

    try {
      await fetch(`/api/athlete/briefing/${briefing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      })
      setBriefing(null)
    } catch (error) {
      console.error('Error dismissing briefing:', error)
    } finally {
      setIsDismissing(false)
    }
  }

  function handleAction(action: string) {
    switch (action) {
      case 'log_workout':
        router.push('/athlete/training')
        break
      case 'open_chat':
        // Open the floating chat - this would need to be connected to a global state
        // For now, we'll scroll to the chat button
        document.querySelector('[data-chat-trigger]')?.scrollIntoView({ behavior: 'smooth' })
        break
      case 'check_in':
        router.push('/athlete/check-in')
        break
      case 'view_program':
        router.push('/athlete/program')
        break
      default:
        // Unknown action - no-op
        break
    }
  }

  function getAlertIcon(type: string) {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  function getActionIcon(action: string) {
    switch (action) {
      case 'log_workout':
        return <Dumbbell className="h-4 w-4" />
      case 'open_chat':
        return <MessageSquare className="h-4 w-4" />
      case 'check_in':
        return <ClipboardCheck className="h-4 w-4" />
      case 'view_program':
        return <Calendar className="h-4 w-4" />
      default:
        return <ChevronRight className="h-4 w-4" />
    }
  }

  // Don't render if loading or no briefing
  if (isLoading) {
    return null
  }

  if (!briefing) {
    return null
  }

  const alerts = ((briefing.alerts || []) as BriefingAlert[]).filter(
    (a) => a && a.type && a.message
  )
  const quickActions = (briefing.quickActions || []) as QuickAction[]
  const highlights = briefing.highlights || []

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
              <Sun className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                {briefing.title}
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {new Date(briefing.scheduledFor).toLocaleTimeString('sv-SE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                idag
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-amber-600 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/50"
            onClick={handleDismiss}
            disabled={isDismissing}
          >
            {isDismissing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Main content */}
        <p className="text-sm text-amber-800 dark:text-amber-200">{briefing.content}</p>

        {/* Readiness score if available */}
        {briefing.readinessScore !== undefined && briefing.readinessScore !== null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-600 dark:text-amber-400">Readiness:</span>
            <Badge
              variant="secondary"
              className={cn(
                'text-xs',
                briefing.readinessScore >= 7
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                  : briefing.readinessScore >= 5
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
              )}
            >
              {briefing.readinessScore.toFixed(1)}/10
            </Badge>
            {briefing.todaysWorkout && (
              <>
                <span className="text-amber-400">•</span>
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  {briefing.todaysWorkout}
                </span>
              </>
            )}
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-1">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg text-xs',
                  alert.type === 'warning' &&
                    'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200',
                  alert.type === 'info' &&
                    'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
                  alert.type === 'success' &&
                    'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                )}
              >
                {getAlertIcon(alert.type)}
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Highlights (expandable) */}
        {highlights.length > 0 && (
          <div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
            >
              <ChevronRight
                className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-90')}
              />
              {isExpanded ? 'Dölj detaljer' : 'Visa detaljer'}
            </button>
            {isExpanded && (
              <ul className="mt-2 space-y-1 pl-4">
                {highlights.map((highlight, index) => (
                  <li
                    key={index}
                    className="text-xs text-amber-700 dark:text-amber-300 list-disc"
                  >
                    {highlight}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Quick actions */}
        {quickActions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-white/50 dark:bg-black/20 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                onClick={() => handleAction(action.action)}
              >
                {getActionIcon(action.action)}
                <span className="ml-1">{action.label}</span>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
