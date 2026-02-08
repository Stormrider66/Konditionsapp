'use client'

/**
 * AccountabilityStreakWidget
 *
 * Dashboard widget showing check-in streak with:
 * - Current streak count
 * - Personal best indicator
 * - Motivational message
 * - 4-week visual calendar
 * - Check-in CTA if not done today
 */

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Flame, Trophy, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { StreakCalendar } from './StreakCalendar'
import type { StreakResponse } from '@/types/streak'

interface AccountabilityStreakWidgetProps {
  clientId?: string
  className?: string
  basePath?: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function AccountabilityStreakWidget({ className, basePath = '' }: AccountabilityStreakWidgetProps) {
  const { data, error, isLoading } = useSWR<StreakResponse>(
    '/api/athlete/streaks',
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
      revalidateOnFocus: true,
    }
  )

  // Loading state
  if (isLoading) {
    return (
      <GlassCard className={className}>
        <GlassCardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </GlassCardContent>
      </GlassCard>
    )
  }

  // Error state
  if (error || !data?.success) {
    return (
      <GlassCard className={className}>
        <GlassCardContent className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <AlertCircle className="h-6 w-6 mb-2 text-red-500" />
          <p className="text-sm">Kunde inte ladda streak-data</p>
        </GlassCardContent>
      </GlassCard>
    )
  }

  const {
    currentStreak,
    personalBest,
    hasCheckedInToday,
    isNewRecord,
    checkInHistory,
    motivation,
  } = data.data

  return (
    <GlassCard className={className}>
      <GlassCardHeader className="pb-2">
        <GlassCardTitle className="flex items-center gap-1.5 text-sm">
          <Flame className="h-4 w-4 text-orange-500" />
          Streak <InfoTooltip conceptKey="checkinStreak" />
        </GlassCardTitle>
      </GlassCardHeader>

      <GlassCardContent className="pt-0 space-y-4">
        {/* Current streak display */}
        <div className="text-center py-2">
          <div className="flex items-center justify-center gap-2">
            <Flame
              className={cn(
                'h-8 w-8',
                currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'
              )}
            />
            <span
              className={cn(
                'text-4xl font-bold',
                currentStreak > 0 ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {currentStreak}
            </span>
            <span className="text-lg text-muted-foreground">
              {currentStreak === 1 ? 'dag' : 'dagar'}
            </span>
          </div>

          {/* Personal best indicator */}
          {personalBest > 0 && (
            <div className="flex items-center justify-center gap-1 mt-1 text-xs text-muted-foreground">
              <Trophy className="h-3 w-3 text-amber-500" />
              <span>
                {isNewRecord ? (
                  <span className="text-amber-500 font-medium">Nytt rekord!</span>
                ) : (
                  `Ditt rekord: ${personalBest} dagar`
                )}
              </span>
            </div>
          )}

          {/* Motivation message */}
          <p className="text-xs text-muted-foreground mt-2 italic">
            &ldquo;{motivation.message}&rdquo;
          </p>
        </div>

        {/* Streak calendar */}
        <StreakCalendar
          checkInHistory={checkInHistory}
          hasCheckedInToday={hasCheckedInToday}
        />

        {/* Check-in CTA if not done today */}
        {!hasCheckedInToday && (
          <Link href={`${basePath}/athlete/check-in`} className="block">
            <Button
              variant="default"
              size="sm"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Flame className="h-4 w-4 mr-2" />
              Checka in nu
            </Button>
          </Link>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
