'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Activity, FlaskConical, Network } from 'lucide-react'
import { cn } from '@/lib/utils'
import { roleTabsListClass } from '@/components/layouts/role-shell/RolePage'

interface SubTab {
  segment: string
  en: string
  sv: string
  icon: typeof Activity
}

const SUB_TABS: SubTab[] = [
  { segment: 'analysis', en: 'Training', sv: 'Träning', icon: Activity },
  { segment: 'tests', en: 'Tests', sv: 'Test', icon: FlaskConical },
  { segment: 'multivariate', en: 'Multivariate', sv: 'Multivariat', icon: Network },
]

/**
 * Secondary nav for the team "Analys" area — switches between Training
 * (decision/load), Test (test profile + matrix), and Multivariate (MVA).
 * `base` is the team root, e.g. /{slug}/coach/teams/{teamId}.
 */
export function TeamAnalysisSubNav({ base }: { base: string }) {
  const pathname = usePathname()
  const locale = useLocale() === 'sv' ? 'sv' : 'en'

  const rest = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\//, '') : ''
  const segment = rest.split('/')[0] || 'analysis'
  const active = segment === 'analys' ? 'analysis' : segment

  return (
    <div className={roleTabsListClass('mb-6 inline-flex gap-1')}>
      {SUB_TABS.map((tab) => {
        const Icon = tab.icon
        const isActive = active === tab.segment
        return (
          <Link
            key={tab.segment}
            href={`${base}/${tab.segment}`}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              isActive ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <Icon className="h-4 w-4" />
            {locale === 'sv' ? tab.sv : tab.en}
          </Link>
        )
      })}
    </div>
  )
}
