'use client'

import { useState, useEffect } from 'react'
import { GlassCard, GlassCardHeader, GlassCardContent } from '@/components/ui/GlassCard'
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
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { useLocale, useTranslations } from '@/i18n/client'
import { openAthleteFloatingChat } from '@/lib/events/athlete-floating-chat'
import { NewProgramDialog } from '@/components/athlete/workout/NewProgramDialog'

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

interface MorningBriefingCardProps {
  hasActiveProgram?: boolean
  isAICoached?: boolean
  primarySport?: string | null
}

export function MorningBriefingCard({
  hasActiveProgram = false,
  isAICoached = false,
  primarySport = null,
}: MorningBriefingCardProps) {
  const t = useTranslations('components.morningBriefingCard')
  const locale = useLocale()
  const router = useRouter()
  const basePath = useBasePath()
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissing, setIsDismissing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isProgramDialogOpen, setIsProgramDialogOpen] = useState(false)

  useEffect(() => {
    async function fetchBriefing() {
      try {
        const response = await fetch('/api/athlete/briefing')
        if (response.ok) {
          const data = await response.json()
          setBriefing(data.briefing)

          // Mark as read if not already
          if (data.briefing && !data.briefing.readAt) {
            void fetch(`/api/athlete/briefing/${data.briefing.id}`, {
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

    void fetchBriefing()
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
        router.push(`${basePath}/athlete/training`)
        break
      case 'open_chat':
        openAthleteFloatingChat()
        break
      case 'check_in':
        router.push(`${basePath}/athlete/check-in`)
        break
      case 'view_program':
        if (hasActiveProgram) {
          router.push(`${basePath}/athlete/programs`)
        } else {
          setIsProgramDialogOpen(true)
        }
        break
      default:
        break
    }
  }

  function getAlertIcon(type: string) {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500 mt-0.5" />
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
      default:
        return <Info className="h-4 w-4 mt-0.5" />
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
        return hasActiveProgram
          ? <Calendar className="h-4 w-4" />
          : <Sparkles className="h-4 w-4" />
      default:
        return <ChevronRight className="h-4 w-4" />
    }
  }

  if (isLoading || !briefing) {
    return null
  }

  const alerts = ((briefing.alerts || []) as BriefingAlert[]).filter(
    (a) => a && a.type && a.message
  )
  const quickActions = (briefing.quickActions || []) as QuickAction[]
  const highlights = briefing.highlights || []

  return (
    <GlassCard
      glow="amber"
      gradient
      className="group border-amber-200/30 dark:border-amber-800/20 hover:border-amber-500/30 dark:hover:border-amber-500/30 transition-all duration-300"
    >
      <GlassCardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 dark:border-amber-400/20 rounded-full shadow-inner transition-all duration-300 group-hover:bg-amber-500/20">
              <Sun className="h-5 w-5 text-amber-600 dark:text-amber-400 transition-transform duration-700 group-hover:rotate-45" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                {briefing.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {new Date(briefing.scheduledFor).toLocaleTimeString(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                {t('today')}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800/50 rounded-full"
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
      </GlassCardHeader>

      <GlassCardContent className="space-y-4">
        {/* Main content */}
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {briefing.content}
        </p>

        {/* Readiness score & workout */}
        {(briefing.readinessScore !== undefined && briefing.readinessScore !== null) && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t('readiness')}
            </span>
            <Badge
              variant="secondary"
              className={cn(
                'text-xs font-semibold px-2.5 py-0.5 rounded-full border',
                briefing.readinessScore >= 7
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                  : briefing.readinessScore >= 5
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
              )}
            >
              {briefing.readinessScore.toFixed(1)}/10
            </Badge>
            {briefing.todaysWorkout && (
              <>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {briefing.todaysWorkout}
                </span>
              </>
            )}
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl text-xs border border-slate-100 dark:border-slate-800/30 backdrop-blur-sm transition-all duration-300 hover:shadow-sm',
                  alert.type === 'warning' &&
                    'bg-amber-500/5 border-l-4 border-l-amber-500 text-slate-700 dark:text-slate-300',
                  alert.type === 'info' &&
                    'bg-blue-500/5 border-l-4 border-l-blue-500 text-slate-700 dark:text-slate-300',
                  alert.type === 'success' &&
                    'bg-emerald-500/5 border-l-4 border-l-emerald-500 text-slate-700 dark:text-slate-300'
                )}
              >
                {getAlertIcon(alert.type)}
                <span className="leading-normal">{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Highlights (expandable) */}
        {highlights.length > 0 && (
          <div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
            >
              <ChevronRight
                className={cn('h-3.5 w-3.5 transition-transform duration-250', isExpanded && 'rotate-90')}
              />
              {isExpanded ? t('actions.hideDetails') : t('actions.showDetails')}
            </button>
            {isExpanded && (
              <ul className="mt-2 space-y-1.5 pl-5 list-disc">
                {highlights.map((highlight, index) => (
                  <li
                    key={index}
                    className="text-xs text-slate-600 dark:text-slate-400 leading-normal"
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
                className="h-9 text-xs rounded-full bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all duration-200 shadow-sm hover:shadow"
                onClick={() => handleAction(action.action)}
              >
                {getActionIcon(action.action)}
                <span className="ml-1.5 font-medium">
                  {action.action === 'view_program' && !hasActiveProgram
                    ? t('actions.createProgram')
                    : action.label}
                </span>
              </Button>
            ))}
          </div>
        )}
      </GlassCardContent>

      <NewProgramDialog
        open={isProgramDialogOpen}
        onOpenChange={setIsProgramDialogOpen}
        isAICoached={isAICoached}
        primarySport={primarySport}
        basePath={basePath}
      />
    </GlassCard>
  )
}
