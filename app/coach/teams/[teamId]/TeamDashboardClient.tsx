'use client'

/**
 * Team Dashboard Client Component
 *
 * Client-side interactivity for the team dashboard:
 * - Assign workout button with dialog
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dumbbell, Heart, Zap } from 'lucide-react'

interface TeamDashboardClientProps {
  teamId: string
  teamName: string
}

export function TeamDashboardClient({ teamId, teamName }: TeamDashboardClientProps) {
  const router = useRouter()
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedWorkoutType, setSelectedWorkoutType] = useState<
    'strength' | 'cardio' | 'hybrid' | null
  >(null)

  const handleAssignClick = (type: 'strength' | 'cardio' | 'hybrid') => {
    // Navigate to workout selection with team context
    const typeMap = {
      strength: 'strength',
      cardio: 'cardio',
      hybrid: 'hybrid-studio',
    }
    router.push(`/coach/${typeMap[type]}?assignToTeam=${teamId}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Tilldela pass
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleAssignClick('strength')}>
          <Dumbbell className="mr-2 h-4 w-4" />
          Styrkepass
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAssignClick('cardio')}>
          <Heart className="mr-2 h-4 w-4" />
          Konditionspass
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAssignClick('hybrid')}>
          <Zap className="mr-2 h-4 w-4" />
          Hybridpass
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
