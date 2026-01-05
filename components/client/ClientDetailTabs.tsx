'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LayoutGrid, Calendar, ClipboardList, Folder, TestTube } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ClientDetailTab = 'overview' | 'calendar' | 'logs' | 'programs' | 'tests'

interface ClientDetailTabsProps {
  clientId: string
  children: {
    overview: React.ReactNode
    calendar: React.ReactNode
    logs: React.ReactNode
    programs: React.ReactNode
    tests: React.ReactNode
  }
  defaultTab?: ClientDetailTab
}

const TAB_CONFIG: { value: ClientDetailTab; label: string; icon: React.ElementType }[] = [
  { value: 'overview', label: 'Översikt', icon: LayoutGrid },
  { value: 'calendar', label: 'Kalender', icon: Calendar },
  { value: 'logs', label: 'Loggar', icon: ClipboardList },
  { value: 'programs', label: 'Program', icon: Folder },
  { value: 'tests', label: 'Tester', icon: TestTube },
]

export function ClientDetailTabs({ clientId, children, defaultTab = 'overview' }: ClientDetailTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get active tab from URL or use default
  const activeTab = (searchParams.get('tab') as ClientDetailTab) || defaultTab

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
    router.push(`/clients/${clientId}${newUrl}`, { scroll: false })
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      {/* Tab Navigation */}
      <div className="sticky top-0 z-10 bg-gray-50 pb-4">
        <TabsList className="w-full h-auto p-1 bg-white shadow-sm rounded-lg border border-gray-200 grid grid-cols-5 gap-1">
          {TAB_CONFIG.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 px-3 rounded-md transition-all",
                "data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm",
                "data-[state=inactive]:hover:bg-gray-100",
                "text-sm font-medium"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Tab Content */}
      <TabsContent value="overview" className="mt-0">
        {children.overview}
      </TabsContent>

      <TabsContent value="calendar" className="mt-0">
        {children.calendar}
      </TabsContent>

      <TabsContent value="logs" className="mt-0">
        {children.logs}
      </TabsContent>

      <TabsContent value="programs" className="mt-0">
        {children.programs}
      </TabsContent>

      <TabsContent value="tests" className="mt-0">
        {children.tests}
      </TabsContent>
    </Tabs>
  )
}
