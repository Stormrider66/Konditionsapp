'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { Grid3x3, LayoutList, LineChart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TeamTestProfile } from './TeamTestProfile'
import { TeamTestsClient } from './TeamTestsClient'
import { TeamPlayerDevelopment } from './TeamPlayerDevelopment'

type TestTab = 'selector' | 'matrix' | 'development'

interface TeamTestTabsProps {
  teamId: string
  teamName: string
  basePath: string
  businessSlug?: string
}

const TABS: Array<{ key: TestTab; en: string; sv: string; icon: typeof LayoutList }> = [
  { key: 'selector', en: 'Selector', sv: 'Väljare', icon: LayoutList },
  { key: 'matrix', en: 'Matrix', sv: 'Matris', icon: Grid3x3 },
  { key: 'development', en: 'Development', sv: 'Utveckling', icon: LineChart },
]

/**
 * Tabs for the team Test area: the new test profile split into Väljare /
 * Matris views (sharing season + profile state), plus the existing
 * TeamTestsClient for player development and reference-data settings.
 */
export function TeamTestTabs({ teamId, teamName, basePath, businessSlug }: TeamTestTabsProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const [tab, setTab] = useState<TestTab>('selector')

  return (
    <div className="space-y-6">
      <div className="inline-flex gap-1 rounded-lg border bg-white p-1 shadow-sm dark:border-white/10 dark:bg-slate-900">
        {TABS.map((t) => {
          const Icon = t.icon
          const isActive = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                isActive ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-4 w-4" />
              {locale === 'sv' ? t.sv : t.en}
            </button>
          )
        })}
      </div>

      {tab === 'development' ? (
        <div className="space-y-8">
          <TeamPlayerDevelopment teamId={teamId} businessSlug={businessSlug} />
          <TeamTestsClient teamId={teamId} teamName={teamName} basePath={basePath} />
        </div>
      ) : (
        <TeamTestProfile teamId={teamId} businessSlug={businessSlug} view={tab} />
      )}
    </div>
  )
}
