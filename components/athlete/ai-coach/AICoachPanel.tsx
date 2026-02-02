'use client'

/**
 * AI Coach Panel
 *
 * Main panel for AI-coached athletes showing their AI coach status,
 * program overview, and quick actions.
 */

import useSWR from 'swr'
import Link from 'next/link'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Bot,
  Sparkles,
  MessageSquare,
  Settings,
  TrendingUp,
  Calendar,
  Target,
  Loader2,
  ChevronRight,
} from 'lucide-react'

interface AICoachStatus {
  isActive: boolean
  autonomyLevel: string
  programName?: string
  programProgress?: number
  currentWeek?: number
  totalWeeks?: number
  nextWorkout?: {
    name: string
    date: string
    type: string
  }
  recentActions: number
  pendingRecommendations: number
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface AICoachPanelProps {
  basePath?: string
}

export function AICoachPanel({ basePath = '' }: AICoachPanelProps) {
  const { data, isLoading, error } = useSWR<AICoachStatus>(
    '/api/agent/status',
    fetcher,
    { refreshInterval: 60000 }
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

  if (error || !data) {
    return (
      <GlassCard>
        <GlassCardContent className="py-6 text-center text-muted-foreground">
          Unable to load AI coach status
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">AI Coach</h3>
              <p className="text-sm text-white/80">Your personal training assistant</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="bg-white/20 border-white/30 text-white"
          >
            {data.autonomyLevel?.replace('_', ' ') || 'Advisory'}
          </Badge>
        </div>
      </div>

      <GlassCardContent className="space-y-4 pt-4">
        {/* Program Progress */}
        {data.programName && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{data.programName}</span>
              <span className="text-muted-foreground">
                Week {data.currentWeek}/{data.totalWeeks}
              </span>
            </div>
            <Progress value={data.programProgress || 0} className="h-2" />
          </div>
        )}

        {/* Next Workout */}
        {data.nextWorkout && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-indigo-500" />
              <div>
                <p className="text-sm font-medium">{data.nextWorkout.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(data.nextWorkout.date).toLocaleDateString('sv-SE', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <Badge variant="outline">{data.nextWorkout.type}</Badge>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold text-indigo-600">{data.recentActions}</p>
            <p className="text-xs text-muted-foreground">Adjustments made</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">
              {data.pendingRecommendations}
            </p>
            <p className="text-xs text-muted-foreground">Recommendations</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button asChild variant="outline" size="sm" className="justify-start">
            <Link href={`${basePath}/athlete/ai-chat`}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat with AI
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="justify-start">
            <Link href={`${basePath}/athlete/settings/agent`}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
