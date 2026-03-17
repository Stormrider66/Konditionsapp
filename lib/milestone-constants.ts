import type { ReactNode } from 'react'

export type CelebrationLevel = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'

export const celebrationColors: Record<
  CelebrationLevel,
  {
    gradient: string
    border: string
    iconBg: string
    iconColor: string
    textColor: string
    badgeBg: string
  }
> = {
  BRONZE: {
    gradient: 'from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30',
    border: 'border-amber-300 dark:border-amber-700',
    iconBg: 'bg-amber-200 dark:bg-amber-900/50',
    iconColor: 'text-amber-700 dark:text-amber-400',
    textColor: 'text-amber-900 dark:text-amber-100',
    badgeBg: 'bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  },
  SILVER: {
    gradient: 'from-slate-100 to-gray-200 dark:from-slate-950/30 dark:to-gray-900/30',
    border: 'border-slate-300 dark:border-slate-600',
    iconBg: 'bg-slate-200 dark:bg-slate-800/50',
    iconColor: 'text-slate-700 dark:text-slate-300',
    textColor: 'text-slate-900 dark:text-slate-100',
    badgeBg: 'bg-slate-200 text-slate-800 dark:bg-slate-800/50 dark:text-slate-200',
  },
  GOLD: {
    gradient: 'from-yellow-100 to-amber-100 dark:from-yellow-950/30 dark:to-amber-950/30',
    border: 'border-yellow-400 dark:border-yellow-600',
    iconBg: 'bg-yellow-200 dark:bg-yellow-900/50',
    iconColor: 'text-yellow-700 dark:text-yellow-400',
    textColor: 'text-yellow-900 dark:text-yellow-100',
    badgeBg: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
  },
  PLATINUM: {
    gradient: 'from-purple-100 to-pink-100 dark:from-purple-950/30 dark:to-pink-950/30',
    border: 'border-purple-400 dark:border-purple-600',
    iconBg: 'bg-purple-200 dark:bg-purple-900/50',
    iconColor: 'text-purple-700 dark:text-purple-400',
    textColor: 'text-purple-900 dark:text-purple-100',
    badgeBg: 'bg-purple-200 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  },
}

export const celebrationEmojis: Record<CelebrationLevel, string> = {
  BRONZE: '🥉',
  SILVER: '🥈',
  GOLD: '🥇',
  PLATINUM: '💎',
}

export const MILESTONE_TYPE_ICONS: Record<string, string> = {
  PERSONAL_RECORD: 'Trophy',
  CONSISTENCY_STREAK: 'Flame',
  WORKOUT_COUNT: 'Award',
  TRAINING_ANNIVERSARY: 'Cake',
  FIRST_WORKOUT: 'Star',
  COMEBACK: 'Zap',
  PROGRAM_COMPLETED: 'Trophy',
}
