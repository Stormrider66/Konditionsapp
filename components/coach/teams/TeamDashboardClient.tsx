'use client'

/**
 * Team Dashboard Client Component
 *
 * Client-side interactivity for the team dashboard:
 * - Assign workout button with dialog
 */

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dumbbell, Heart, Zap, Timer } from 'lucide-react'
import { useTranslations } from '@/i18n/client'

interface TeamDashboardClientProps {
  teamId: string
  basePath: string
}

export function TeamDashboardClient({ teamId, basePath }: TeamDashboardClientProps) {
  const router = useRouter()
  const t = useTranslations('components.teamDashboardClient')

  const handleAssignClick = (type: 'strength' | 'cardio' | 'hybrid') => {
    // Navigate to workout selection with team context
    const typeMap = {
      strength: 'strength',
      cardio: 'cardio',
      hybrid: 'hybrid-studio',
    }
    router.push(`${basePath}/coach/${typeMap[type]}?assignToTeam=${teamId}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('assignWorkout')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleAssignClick('strength')}>
          <Dumbbell className="mr-2 h-4 w-4" />
          {t('strengthWorkout')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAssignClick('cardio')}>
          <Heart className="mr-2 h-4 w-4" />
          {t('cardioWorkout')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAssignClick('hybrid')}>
          <Zap className="mr-2 h-4 w-4" />
          {t('hybridWorkout')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`${basePath}/coach/interval-sessions?teamId=${teamId}`)}>
          <Timer className="mr-2 h-4 w-4" />
          {t('startIntervalSession')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
