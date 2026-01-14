'use client'

import { cn } from '@/lib/utils'

export type BenchmarkTier = 'WORLD_CLASS' | 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER'

interface TestBenchmarkBadgeProps {
  tier: BenchmarkTier
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const tierConfig: Record<BenchmarkTier, { label: string; labelSv: string; color: string; bgColor: string }> = {
  WORLD_CLASS: {
    label: 'World Class',
    labelSv: 'Världsklass',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
  },
  ELITE: {
    label: 'Elite',
    labelSv: 'Elit',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
  },
  ADVANCED: {
    label: 'Advanced',
    labelSv: 'Avancerad',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
  },
  INTERMEDIATE: {
    label: 'Intermediate',
    labelSv: 'Medel',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
  },
  BEGINNER: {
    label: 'Beginner',
    labelSv: 'Nybörjare',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800',
  },
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
}

export function TestBenchmarkBadge({
  tier,
  size = 'md',
  showLabel = true,
  className,
}: TestBenchmarkBadgeProps) {
  const config = tierConfig[tier]

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        config.bgColor,
        config.color,
        sizeClasses[size],
        className
      )}
    >
      {showLabel ? config.labelSv : tier}
    </span>
  )
}

export function getTierLabel(tier: BenchmarkTier, locale: 'sv' | 'en' = 'sv'): string {
  return locale === 'sv' ? tierConfig[tier].labelSv : tierConfig[tier].label
}
