'use client'

/**
 * WODHistoryClient
 *
 * Client component for displaying WOD history with filtering and stats.
 */

import { useState } from 'react'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import {
  ChevronLeft,
  CheckCircle2,
  Clock,
  Dumbbell,
  Flame,
  Play,
  XCircle,
  Sparkles,
  Timer,
  TrendingUp,
  Calendar,
  Zap,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WODWorkout } from '@/types/wod'

interface WODHistoryItem {
  id: string
  title: string
  subtitle: string | null
  mode: string
  status: string
  requestedDuration: number
  primarySport: string | null
  readinessAtGeneration: number | null
  intensityAdjusted: string | null
  createdAt: Date
  startedAt: Date | null
  completedAt: Date | null
  actualDuration: number | null
  sessionRPE: number | null
  workoutJson: unknown
}

interface WODHistoryClientProps {
  wods: WODHistoryItem[]
  stats: {
    total: number
    completed: number
    totalMinutes: number
  }
}

const STATUS_CONFIG = {
  GENERATED: {
    label: 'Ej påbörjad',
    icon: Clock,
    color: 'text-slate-500',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
  },
  STARTED: {
    label: 'Påbörjad',
    icon: Play,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  COMPLETED: {
    label: 'Slutförd',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  ABANDONED: {
    label: 'Avbruten',
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
}

const MODE_LABELS: Record<string, string> = {
  STRUCTURED: 'Strukturerat',
  CASUAL: 'Avslappnat',
  FUN: 'Bara kul!',
}

export function WODHistoryClient({ wods, stats }: WODHistoryClientProps) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all')
  const [repeating, setRepeating] = useState<string | null>(null)

  const handleRepeat = async (wodId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setRepeating(wodId)
    try {
      const response = await fetch('/api/ai/wod/repeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wodId }),
      })

      if (!response.ok) {
        throw new Error('Failed to repeat WOD')
      }

      const data = await response.json()
      window.location.href = `/athlete/wod/${data.newWodId}`
    } catch (err) {
      console.error('Failed to repeat WOD:', err)
      setRepeating(null)
    }
  }

  const filteredWods = wods.filter(wod => {
    if (filter === 'completed') return wod.status === 'COMPLETED'
    if (filter === 'pending') return wod.status === 'GENERATED' || wod.status === 'STARTED'
    return true
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-slate-200 pb-20">
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-400/10 dark:bg-orange-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/10 dark:bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <div className="bg-white/70 dark:bg-black/40 backdrop-blur-md border-b border-slate-200 dark:border-white/5 sticky top-0 z-20">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/athlete/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase italic tracking-tight leading-none">
                WOD Historik
              </h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
                AI-genererade pass
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-2xl mx-auto p-4 space-y-4 relative z-10">
        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3">
          <GlassCard>
            <GlassCardContent className="p-4 text-center">
              <Dumbbell className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Genererade
              </p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="p-4 text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Slutförda
              </p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="p-4 text-center">
              <Timer className="h-5 w-5 mx-auto mb-1 text-orange-500" />
              <p className="text-2xl font-bold">{stats.totalMinutes}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Minuter
              </p>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="flex-1"
          >
            Alla ({wods.length})
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('completed')}
            className="flex-1"
          >
            Slutförda
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
            className="flex-1"
          >
            Ej klara
          </Button>
        </div>

        {/* WOD list */}
        {filteredWods.length === 0 ? (
          <GlassCard>
            <GlassCardContent className="p-8 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-2">Inga pass att visa</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {filter === 'all'
                  ? 'Du har inte genererat några AI-pass än.'
                  : filter === 'completed'
                    ? 'Inga slutförda pass ännu.'
                    : 'Inga pågående pass.'}
              </p>
              <Link href="/athlete/dashboard">
                <Button>
                  <Zap className="h-4 w-4 mr-2" />
                  Skapa ett pass
                </Button>
              </Link>
            </GlassCardContent>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {filteredWods.map(wod => {
              const statusConfig = STATUS_CONFIG[wod.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.GENERATED
              const StatusIcon = statusConfig.icon
              const workout = wod.workoutJson as WODWorkout | null
              const exerciseCount = workout?.sections?.reduce((sum, s) => sum + s.exercises.length, 0) || 0

              return (
                <Link key={wod.id} href={`/athlete/wod/${wod.id}`}>
                  <GlassCard className="hover:ring-2 hover:ring-orange-500/50 transition-all cursor-pointer">
                    <GlassCardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Status icon */}
                        <div className={cn('p-2 rounded-lg shrink-0', statusConfig.bgColor)}>
                          <StatusIcon className={cn('h-5 w-5', statusConfig.color)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold truncate">{wod.title}</h3>
                              {wod.subtitle && (
                                <p className="text-sm text-muted-foreground truncate">
                                  {wod.subtitle}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {MODE_LABELS[wod.mode] || wod.mode}
                            </Badge>
                          </div>

                          {/* Meta info */}
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(wod.createdAt), 'd MMM yyyy', { locale: sv })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {wod.actualDuration || wod.requestedDuration} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Dumbbell className="h-3 w-3" />
                              {exerciseCount} övningar
                            </span>
                            {wod.sessionRPE && (
                              <span className="flex items-center gap-1">
                                <Flame className="h-3 w-3" />
                                RPE {wod.sessionRPE}
                              </span>
                            )}
                          </div>

                          {/* Completion time and repeat button */}
                          <div className="flex items-center justify-between mt-2">
                            {wod.completedAt && (
                              <p className="text-xs text-green-600 dark:text-green-400">
                                Slutförd {formatDistanceToNow(new Date(wod.completedAt), { addSuffix: true, locale: sv })}
                              </p>
                            )}
                            {wod.status === 'COMPLETED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => handleRepeat(wod.id, e)}
                                disabled={repeating === wod.id}
                              >
                                <RotateCcw className={cn('h-3 w-3 mr-1', repeating === wod.id && 'animate-spin')} />
                                {repeating === wod.id ? 'Skapar...' : 'Gör om'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </GlassCardContent>
                  </GlassCard>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
