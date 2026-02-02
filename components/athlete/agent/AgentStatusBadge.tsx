'use client'

import { Badge } from '@/components/ui/badge'
import { Bot, AlertCircle, CheckCircle, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentStatusBadgeProps {
  isActive: boolean
  hasConsent: boolean
  autonomyLevel: string
  className?: string
}

export function AgentStatusBadge({
  isActive,
  hasConsent,
  autonomyLevel,
  className,
}: AgentStatusBadgeProps) {
  if (!hasConsent) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'bg-gray-50 text-gray-600 border-gray-300 dark:bg-gray-900/50 dark:text-gray-400 dark:border-gray-700',
          className
        )}
      >
        <AlertCircle className="h-3 w-3 mr-1" />
        Consent Required
      </Badge>
    )
  }

  if (!isActive) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
          className
        )}
      >
        <Pause className="h-3 w-3 mr-1" />
        Paused
      </Badge>
    )
  }

  // Active with autonomy level
  const levelColor = {
    ADVISORY: 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
    LIMITED: 'bg-cyan-50 text-cyan-700 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-700',
    SUPERVISED: 'bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
    AUTONOMOUS: 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700',
  }

  const levelLabel = {
    ADVISORY: 'Advisory',
    LIMITED: 'Limited',
    SUPERVISED: 'Supervised',
    AUTONOMOUS: 'Autonomous',
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        levelColor[autonomyLevel as keyof typeof levelColor] || levelColor.ADVISORY,
        className
      )}
    >
      <Bot className="h-3 w-3 mr-1" />
      {levelLabel[autonomyLevel as keyof typeof levelLabel] || 'Advisory'}
    </Badge>
  )
}
