'use client'

import Link from 'next/link'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardList,
  Target,
  Sparkles,
  Video,
  Dumbbell,
  Timer,
  Users,
  MessageSquare,
} from 'lucide-react'
import { VoiceWorkoutButton } from '@/components/coach/voice-workout'
import type { DashboardMode } from '@/lib/coach/dashboard-mode'

interface CoachQuickActionsProps {
  mode: DashboardMode
  basePath: string
  pendingFeedbackCount: number
}

export function CoachQuickActions({ mode, basePath, pendingFeedbackCount }: CoachQuickActionsProps) {
  if (mode === 'TEAM') {
    return (
      <GlassCard>
        <GlassCardHeader className="pb-3">
          <GlassCardTitle className="text-base">Snabblänkar</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="grid grid-cols-2 gap-2">
          <Link href={`${basePath}/coach/interval-sessions`} className="block">
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition text-center">
              <Timer className="h-5 w-5 text-teal-500" />
              <span className="text-xs dark:text-slate-300">Lagsession</span>
            </div>
          </Link>
          <Link href={`${basePath}/coach/test`} className="block">
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition text-center">
              <ClipboardList className="h-5 w-5 text-cyan-500" />
              <span className="text-xs dark:text-slate-300">Lagtest</span>
            </div>
          </Link>
          <Link href={`${basePath}/coach/teams`} className="block">
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition text-center">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-xs dark:text-slate-300">Trupp</span>
            </div>
          </Link>
          <Link href={`${basePath}/coach/programs/new`} className="block">
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition text-center">
              <Target className="h-5 w-5 text-green-500" />
              <span className="text-xs dark:text-slate-300">Program</span>
            </div>
          </Link>
          {pendingFeedbackCount > 0 && (
            <Link href={`${basePath}/coach/clients`} className="block col-span-2">
              <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition text-center">
                <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  Granska pass
                </span>
                <Badge variant="outline" className="text-[10px] h-5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                  {pendingFeedbackCount}
                </Badge>
              </div>
            </Link>
          )}
        </GlassCardContent>
      </GlassCard>
    )
  }

  // PT / GYM mode — same 7 links as original
  return (
    <GlassCard>
      <GlassCardHeader className="pb-3">
        <GlassCardTitle className="text-base">Snabblänkar</GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent className="grid grid-cols-2 gap-2">
        <VoiceWorkoutButton variant="card" basePath={basePath} />
        <Link href={`${basePath}/coach/test`} className="block">
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition text-center">
            <ClipboardList className="h-5 w-5 text-cyan-500" />
            <span className="text-xs dark:text-slate-300">Nytt test</span>
          </div>
        </Link>
        <Link href={`${basePath}/coach/programs/new`} className="block">
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition text-center">
            <Target className="h-5 w-5 text-green-500" />
            <span className="text-xs dark:text-slate-300">Program</span>
          </div>
        </Link>
        <Link href={`${basePath}/coach/ai-studio`} className="block">
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition text-center">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <span className="text-xs dark:text-slate-300">AI Studio</span>
          </div>
        </Link>
        <Link href={`${basePath}/coach/video-analysis`} className="block">
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition text-center">
            <Video className="h-5 w-5 text-red-500" />
            <span className="text-xs dark:text-slate-300">Video</span>
          </div>
        </Link>
        <Link href={`${basePath}/coach/strength`} className="block">
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition text-center">
            <Dumbbell className="h-5 w-5 text-orange-500" />
            <span className="text-xs dark:text-slate-300">Styrka</span>
          </div>
        </Link>
        <Link href={`${basePath}/coach/interval-sessions`} className="block">
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition text-center">
            <Timer className="h-5 w-5 text-teal-500" />
            <span className="text-xs dark:text-slate-300">Intervaller</span>
          </div>
        </Link>
      </GlassCardContent>
    </GlassCard>
  )
}
