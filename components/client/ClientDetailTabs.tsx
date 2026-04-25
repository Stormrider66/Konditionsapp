'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LayoutGrid, Calendar, BarChart3, Folder, TestTube } from 'lucide-react'
import { cn } from '@/lib/utils'

// `analysis` replaces the old `logs` tab. Old `?tab=logs` URLs are
// soft-redirected to analysis below so deep links don't break.
export type ClientDetailTab = 'overview' | 'calendar' | 'analysis' | 'programs' | 'tests'

interface ClientDetailTabsProps {
  clientId: string
  content: {
    overview: React.ReactNode
    calendar: React.ReactNode
    analysis: React.ReactNode
    programs: React.ReactNode
    tests: React.ReactNode
  }
  defaultTab?: ClientDetailTab
}

const TAB_CONFIG: { value: ClientDetailTab; label: string; icon: React.ElementType }[] = [
  { value: 'overview', label: 'Översikt', icon: LayoutGrid },
  { value: 'calendar', label: 'Kalender', icon: Calendar },
  { value: 'analysis', label: 'Analys', icon: BarChart3 },
  { value: 'programs', label: 'Program', icon: Folder },
  { value: 'tests', label: 'Tester', icon: TestTube },
]

export function ClientDetailTabs({ clientId, content, defaultTab = 'overview' }: ClientDetailTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // Get active tab from URL or use default. Soft-migrate the deprecated
  // `logs` value (replaced by `analysis`) so old deep links land on the
  // new tab rather than triggering a default-fallback to overview.
  const rawTab = searchParams.get('tab')
  const activeTab: ClientDetailTab =
    rawTab === 'logs' ? 'analysis' : ((rawTab as ClientDetailTab) || defaultTab)

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
        <TabsList className="w-full h-auto p-1 bg-white shadow-sm rounded-lg border border-gray-200 grid grid-cols-5 gap-0.5 sm:gap-1">
          {TAB_CONFIG.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={cn(
                "flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:py-2.5 px-1 sm:px-3 rounded-md transition-all",
                "data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm",
                "data-[state=inactive]:hover:bg-gray-100",
                "text-xs sm:text-sm font-medium"
              )}
            >
              <Icon className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />
              <span className="text-[10px] sm:text-sm truncate">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Tab Content */}
      <TabsContent value="overview" className="mt-0">
        {content.overview}
      </TabsContent>

      <TabsContent value="calendar" className="mt-0">
        {content.calendar}
      </TabsContent>

      <TabsContent value="analysis" className="mt-0">
        {content.analysis}
      </TabsContent>

      <TabsContent value="programs" className="mt-0">
        {content.programs}
      </TabsContent>

      <TabsContent value="tests" className="mt-0">
        {content.tests}
      </TabsContent>
    </Tabs>
  )
}
