'use client'

/**
 * WODHistorySummary
 *
 * Compact summary of recent WOD activity for the dashboard.
 * Shows last few completed workouts and quick stats.
 */

import Link from 'next/link'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import {
  ChevronRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Timer,
  Dumbbell,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WODSummaryItem {
  id: string
  title: string
  status: string
  requestedDuration: number
  actualDuration: number | null
  createdAt: Date
  completedAt: Date | null
}

interface WODHistorySummaryProps {
  recentWods: WODSummaryItem[]
  stats: {
    thisWeek: number
    totalCompleted: number
    totalMinutes: number
  }
}

export function WODHistorySummary({ recentWods, stats }: WODHistorySummaryProps) {
  // Only show completed WODs in summary
  const completedWods = recentWods.filter(w => w.status === 'COMPLETED').slice(0, 3)

  if (completedWods.length === 0 && stats.totalCompleted === 0) {
    return null // Don't show if no WOD history
  }

  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <GlassCardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-orange-500" />
            AI-pass Historik
          </GlassCardTitle>
          <Link href="/athlete/wod/history">
            <Button variant="ghost" size="sm" className="text-xs h-7">
              Se alla
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </GlassCardHeader>

      <GlassCardContent className="pt-0">
        {/* Quick stats */}
        <div className="flex gap-4 mb-3 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <span>{stats.thisWeek} denna vecka</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-blue-500" />
            <span>{stats.totalCompleted} totalt</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Timer className="h-3 w-3 text-orange-500" />
            <span>{stats.totalMinutes} min</span>
          </div>
        </div>

        {/* Recent completed WODs */}
        {completedWods.length > 0 ? (
          <div className="space-y-2">
            {completedWods.map(wod => (
              <Link key={wod.id} href={`/athlete/wod/${wod.id}`}>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-sm font-medium truncate">{wod.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(wod.completedAt || wod.createdAt), 'd MMM', { locale: sv })}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {wod.actualDuration || wod.requestedDuration} min
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            Inga slutförda AI-pass ännu
          </p>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
