import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Settings, Users, User, Dumbbell } from 'lucide-react'
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
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  },
  GYM: {
    label: 'Gym',
    icon: Dumbbell,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  },
}

export function DashboardModeIndicator({ mode, basePath }: DashboardModeIndicatorProps) {
  const config = MODE_CONFIG[mode]
  const Icon = config.icon

  return (
    <Link href={`${basePath}/coach/settings`} className="inline-flex">
      <Badge
        variant="outline"
        className={`${config.color} text-xs gap-1.5 pr-1.5 hover:opacity-80 transition cursor-pointer`}
      >
        <Icon className="h-3 w-3" />
        {config.label}
        <Settings className="h-3 w-3 opacity-60" />
      </Badge>
    </Link>
  )
}
