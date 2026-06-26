'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Activity, LayoutGrid, CalendarDays, TrendingUp, UserCircle, Scale } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'

export type ClientDetailTab = 'overview' | 'planning' | 'monitoring' | 'development' | 'body' | 'profile'

interface ClientDetailTabsProps {
  clientId: string
  content: {
    overview: React.ReactNode
    planning: React.ReactNode
    monitoring: React.ReactNode
    development: React.ReactNode
    body: React.ReactNode
    profile: React.ReactNode
  }
  defaultTab?: ClientDetailTab
}

const TAB_CONFIG: { value: ClientDetailTab; labelKey: string; descriptionKey: string; icon: React.ElementType }[] = [
  { value: 'overview', labelKey: 'overview', descriptionKey: 'overviewDescription', icon: LayoutGrid },
  { value: 'planning', labelKey: 'planning', descriptionKey: 'planningDescription', icon: CalendarDays },
  { value: 'monitoring', labelKey: 'monitoring', descriptionKey: 'monitoringDescription', icon: Activity },
  { value: 'development', labelKey: 'development', descriptionKey: 'developmentDescription', icon: TrendingUp },
  { value: 'body', labelKey: 'body', descriptionKey: 'bodyDescription', icon: Scale },
  { value: 'profile', labelKey: 'profile', descriptionKey: 'profileDescription', icon: UserCircle },
]

export function ClientDetailTabs({ clientId: _clientId, content, defaultTab = 'overview' }: ClientDetailTabsProps) {
  const t = useTranslations('components.clientDetailTabs')
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const rawTab = searchParams.get('tab')
  const tabAliases: Record<string, ClientDetailTab> = {
    calendar: 'planning',
    programs: 'planning',
    logs: 'planning',
    analysis: 'development',
    workouts: 'monitoring',
    workoutEvaluation: 'monitoring',
    fatigue: 'monitoring',
    readiness: 'monitoring',
    load: 'monitoring',
    tests: 'development',
    fullProfile: 'profile',
    physiology: 'development',
    performance: 'development',
    training: 'planning',
    health: 'profile',
    technique: 'development',
    goals: 'profile',
    composition: 'body',
    bioimpedance: 'body',
  }
  const normalizedTab = rawTab ? (tabAliases[rawTab] ?? rawTab) : defaultTab
  const activeTab: ClientDetailTab = TAB_CONFIG.some((tab) => tab.value === normalizedTab)
    ? normalizedTab as ClientDetailTab
    : defaultTab

  const handleTabChange = (value: string) => {
    const tab = value as ClientDetailTab
    const params = new URLSearchParams(searchParams.toString())

    if (tab === 'overview') {
      // Remove tab param for overview (cleaner URL)
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }

    const newUrl = params.toString() ? `?${params.toString()}` : ''
    router.push(`${pathname}${newUrl}`, { scroll: false })
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      {/* Tab Navigation */}
      <div className="sticky top-0 z-10 bg-gray-50 pb-3 sm:pb-4">
        <TabsList className="w-full h-auto p-1 bg-white dark:bg-slate-900 shadow-sm rounded-lg border border-gray-200 dark:border-white/10 grid grid-cols-3 sm:grid-cols-6 gap-0.5 sm:gap-1">
          {TAB_CONFIG.map(({ value, labelKey, descriptionKey, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={cn(
                "flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 py-2 sm:py-2.5 px-1 sm:px-3 rounded-md transition-all",
                "data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm",
                "data-[state=inactive]:hover:bg-gray-100 dark:data-[state=inactive]:hover:bg-white/5",
                "text-xs sm:text-sm font-medium"
              )}
            >
              <Icon className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
              <span className="min-w-0 text-center md:text-left">
                <span className="block text-[10px] sm:text-sm truncate">{t(labelKey)}</span>
                <span className="hidden lg:block text-[11px] font-normal opacity-75 truncate">{t(descriptionKey)}</span>
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Tab Content */}
      <TabsContent value="overview" className="mt-0">
        {content.overview}
      </TabsContent>

      <TabsContent value="planning" className="mt-0">
        {content.planning}
      </TabsContent>

      <TabsContent value="monitoring" className="mt-0">
        {content.monitoring}
      </TabsContent>

      <TabsContent value="development" className="mt-0">
        {content.development}
      </TabsContent>

      <TabsContent value="body" className="mt-0">
        {content.body}
      </TabsContent>

      <TabsContent value="profile" className="mt-0">
        {content.profile}
      </TabsContent>
    </Tabs>
  )
}
