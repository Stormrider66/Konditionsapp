'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Users, User, Dumbbell, ChevronDown, Check } from 'lucide-react'
import type { DashboardMode } from '@/lib/coach/dashboard-mode'

interface DashboardModeIndicatorProps {
  mode: DashboardMode
  basePath: string
}

const MODE_CONFIG: Record<DashboardMode, { label: string; icon: typeof Users; color: string }> = {
  TEAM: {
    label: 'Team Coach',
    icon: Users,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  PT: {
    label: 'PT',
    icon: User,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  },
  GYM: {
    label: 'Gym',
    icon: Dumbbell,
    color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
  },
}

const MODES: DashboardMode[] = ['PT', 'TEAM', 'GYM']

export function DashboardModeIndicator({ mode, basePath }: DashboardModeIndicatorProps) {
  const [currentMode, setCurrentMode] = useState<DashboardMode>(mode)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const config = MODE_CONFIG[currentMode]
  const Icon = config.icon

  const handleModeChange = async (newMode: DashboardMode) => {
    if (newMode === currentMode) return
    setCurrentMode(newMode)

    try {
      await fetch('/api/coach/dashboard-mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dashboardMode: newMode }),
      })
      startTransition(() => {
        router.refresh()
      })
    } catch {
      setCurrentMode(mode) // Revert on error
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex focus:outline-none">
          <Badge
            variant="outline"
            className={`${config.color} text-xs gap-1.5 pr-1.5 hover:opacity-80 transition cursor-pointer ${isPending ? 'opacity-50' : ''}`}
          >
            <Icon className="h-3 w-3" />
            {config.label}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {MODES.map((m) => {
          const mConfig = MODE_CONFIG[m]
          const MIcon = mConfig.icon
          const isActive = m === currentMode
          return (
            <DropdownMenuItem
              key={m}
              onClick={() => handleModeChange(m)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <MIcon className="h-4 w-4" />
              <span className="flex-1">{mConfig.label}</span>
              {isActive && <Check className="h-3.5 w-3.5 text-emerald-600" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
