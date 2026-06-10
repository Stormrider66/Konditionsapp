'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'
import {
  LayoutDashboard,
  CalendarDays,
  Layers,
  ClipboardCheck,
  Users,
  HeartPulse,
  BarChart3,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react'

interface TeamTabNavProps {
  /** Base path for the team, e.g. `/acme/coach/teams/abc123` */
  base: string
}

interface TeamTab {
  key: string
  labelKey: string
  icon: LucideIcon
  /** Path segment appended to `base`; '' = the Idag landing. */
  segment: string
  /** First path part after the team base that marks this tab active. */
  activeSegments: string[]
}

const TEAM_TABS: TeamTab[] = [
  { key: 'today', labelKey: 'tabs.today', icon: LayoutDashboard, segment: '', activeSegments: [''] },
  { key: 'calendar', labelKey: 'tabs.calendar', icon: CalendarDays, segment: '/calendar', activeSegments: ['calendar'] },
  { key: 'plan', labelKey: 'tabs.plan', icon: Layers, segment: '/plan', activeSegments: ['plan'] },
  { key: 'followUp', labelKey: 'tabs.followUp', icon: ClipboardCheck, segment: '/uppfoljning', activeSegments: ['uppfoljning'] },
  { key: 'roster', labelKey: 'tabs.roster', icon: Users, segment: '/trupp', activeSegments: ['trupp'] },
  { key: 'medical', labelKey: 'tabs.medical', icon: HeartPulse, segment: '/medical', activeSegments: ['medical'] },
  { key: 'chat', labelKey: 'tabs.chat', icon: MessageCircle, segment: '/chat', activeSegments: ['chat'] },
  {
    key: 'analysis',
    labelKey: 'tabs.analysis',
    icon: BarChart3,
    segment: '/analys',
    // Highlight "Analys" for the hub and the deep analysis sub-routes it links to.
    activeSegments: ['analys', 'analysis', 'tests', 'multivariate'],
  },
]

export function TeamTabNav({ base }: TeamTabNavProps) {
  const t = useTranslations('coach.pages.teamDetail')
  const pathname = usePathname()

  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : ''
  const currentSegment = rest.replace(/^\//, '').split('/')[0] ?? ''

  return (
    <nav className="sticky top-16 z-40 border-y bg-gray-50/95 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/85">
      <div className="container mx-auto px-4 py-3">
        <div className="flex gap-1 overflow-x-auto rounded-lg border bg-white p-1 shadow-sm dark:border-white/10 dark:bg-slate-900">
          {TEAM_TABS.map(({ key, labelKey, icon: Icon, segment, activeSegments }) => {
            const isActive = activeSegments.includes(currentSegment)
            return (
              <Link
                key={key}
                href={`${base}${segment}`}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-600/20'
                    : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground dark:hover:bg-white/5'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{t(labelKey)}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
