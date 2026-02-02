'use client'

/**
 * AI Generated Program Card
 *
 * Shows the AI-generated training program for coachless athletes.
 */

import useSWR from 'swr'
import Link from 'next/link'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Sparkles,
  Calendar,
  Target,
  TrendingUp,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react'

interface ProgramData {
  id: string
  name: string
  methodology: string
  status: string
  currentWeek: number
  totalWeeks: number
  startDate: string
  endDate: string
  nextPhase?: string
  weeklyGoal?: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface AIGeneratedProgramCardProps {
  basePath?: string
}

const methodologyLabels: Record<string, { label: string; color: string }> = {
  POLARIZED: { label: 'Polarized', color: 'bg-blue-100 text-blue-700' },
  NORWEGIAN: { label: 'Norwegian', color: 'bg-purple-100 text-purple-700' },
  PYRAMIDAL: { label: 'Pyramidal', color: 'bg-green-100 text-green-700' },
  CANOVA: { label: 'Canova', color: 'bg-orange-100 text-orange-700' },
}

export function AIGeneratedProgramCard({ basePath = '' }: AIGeneratedProgramCardProps) {
  const { data, isLoading, error, mutate } = useSWR<{ program: ProgramData }>(
    '/api/athlete/current-program',
    fetcher
  )

  if (isLoading) {
    return (
      <GlassCard>
        <GlassCardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  if (error || !data?.program) {
    return (
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            Training Program
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="text-center py-6">
          <p className="text-muted-foreground mb-4">No active program</p>
          <Button asChild>
            <Link href={`${basePath}/athlete/onboarding/ai-assessment`}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Program
            </Link>
          </Button>
        </GlassCardContent>
      </GlassCard>
    )
  }

  const program = data.program
  const progress = (program.currentWeek / program.totalWeeks) * 100
  const methodology = methodologyLabels[program.methodology] || {
    label: program.methodology,
    color: 'bg-gray-100 text-gray-700',
  }

  const weeksRemaining = program.totalWeeks - program.currentWeek
  const endDate = new Date(program.endDate)

  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <GlassCardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            {program.name}
          </GlassCardTitle>
          <Badge className={methodology.color}>{methodology.label}</Badge>
        </div>
      </GlassCardHeader>

      <GlassCardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              Week {program.currentWeek} of {program.totalWeeks}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Ends</p>
              <p className="font-medium">
                {endDate.toLocaleDateString('sv-SE', {
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Remaining</p>
              <p className="font-medium">{weeksRemaining} weeks</p>
            </div>
          </div>
        </div>

        {/* Next Phase */}
        {program.nextPhase && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              Upcoming Phase
            </p>
            <p className="text-sm">{program.nextPhase}</p>
          </div>
        )}

        {/* Weekly Goal */}
        {program.weeklyGoal && (
          <div className="flex items-start gap-2 text-sm">
            <Target className="h-4 w-4 text-green-600 mt-0.5" />
            <p className="text-muted-foreground">{program.weeklyGoal}</p>
          </div>
        )}

        {/* View Program */}
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href={`${basePath}/athlete/program`}>
            View Full Program
            <ChevronRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </GlassCardContent>
    </GlassCard>
  )
}
