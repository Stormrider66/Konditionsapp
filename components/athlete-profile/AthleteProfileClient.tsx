'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Activity, Trophy, Scale, Calendar, Heart, Gauge, Video, Target } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { MobileNav } from '@/components/navigation/MobileNav'
import type { AthleteProfileData } from '@/lib/athlete-profile/data-fetcher'
import { ProfileHeroSection } from './ProfileHeroSection'
import { AIContextSidebar } from './AIContextSidebar'
import { PhysiologyTab } from './tabs/PhysiologyTab'
import { PerformanceTab } from './tabs/PerformanceTab'
import { BodyCompositionTab } from './tabs/BodyCompositionTab'
import { TrainingHistoryTab } from './tabs/TrainingHistoryTab'
import { InjuryHealthTab } from './tabs/InjuryHealthTab'
import { ReadinessTab } from './tabs/ReadinessTab'
import { TechniqueTab } from './tabs/TechniqueTab'
import { GoalsPlanningTab } from './tabs/GoalsPlanningTab'

interface AthleteProfileClientProps {
  data: AthleteProfileData
  viewMode: 'coach' | 'athlete'
  initialTab: string
  currentUserId: string
}

const PROFILE_TABS = [
  { id: 'physiology', label: 'Fysiologi', icon: Activity },
  { id: 'performance', label: 'Prestation', icon: Trophy },
  { id: 'body', label: 'Kropp', icon: Scale },
  { id: 'training', label: 'Träning', icon: Calendar },
  { id: 'health', label: 'Hälsa', icon: Heart },
  { id: 'readiness', label: 'Beredskap', icon: Gauge },
  { id: 'technique', label: 'Teknik', icon: Video },
  { id: 'goals', label: 'Mål', icon: Target },
] as const

export function AthleteProfileClient({
  data,
  viewMode,
  initialTab,
  currentUserId,
}: AthleteProfileClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') || initialTab

  const client = data.identity.client!
  const backLink = viewMode === 'coach' ? `/clients/${client.id}` : '/athlete/dashboard'

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav user={null} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Back Navigation */}
        <div className="mb-4">
          <Link href={backLink}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {viewMode === 'coach' ? 'Tillbaka till klient' : 'Tillbaka till dashboard'}
            </Button>
          </Link>
        </div>

        {/* Hero Section */}
        <ProfileHeroSection
          data={data}
          viewMode={viewMode}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
          {/* Tab Content - 3 columns on desktop */}
          <div className="lg:col-span-3">
            <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
              {/* Tab List - Horizontal scroll on mobile */}
              <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-white border rounded-lg p-1 h-auto">
                {PROFILE_TABS.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex-shrink-0 gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {/* Tab Content */}
              <div className="mt-4">
                <TabsContent value="physiology" className="mt-0">
                  <PhysiologyTab data={data} viewMode={viewMode} />
                </TabsContent>

                <TabsContent value="performance" className="mt-0">
                  <PerformanceTab data={data} viewMode={viewMode} />
                </TabsContent>

                <TabsContent value="body" className="mt-0">
                  <BodyCompositionTab data={data} viewMode={viewMode} />
                </TabsContent>

                <TabsContent value="training" className="mt-0">
                  <TrainingHistoryTab data={data} viewMode={viewMode} />
                </TabsContent>

                <TabsContent value="health" className="mt-0">
                  <InjuryHealthTab data={data} viewMode={viewMode} />
                </TabsContent>

                <TabsContent value="readiness" className="mt-0">
                  <ReadinessTab data={data} viewMode={viewMode} />
                </TabsContent>

                <TabsContent value="technique" className="mt-0">
                  <TechniqueTab data={data} viewMode={viewMode} />
                </TabsContent>

                <TabsContent value="goals" className="mt-0">
                  <GoalsPlanningTab data={data} viewMode={viewMode} />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* AI Context Sidebar - 1 column on desktop, hidden on mobile for athletes */}
          {viewMode === 'coach' && (
            <div className="lg:col-span-1 hidden lg:block">
              <AIContextSidebar
                data={data}
                clientId={client.id}
                clientName={client.name}
              />
            </div>
          )}
        </div>

        {/* Mobile AI Button (Coach only) */}
        {viewMode === 'coach' && (
          <div className="fixed bottom-20 right-4 lg:hidden z-50">
            <Link href={`/coach/ai-studio?athleteId=${client.id}`}>
              <Button size="lg" className="rounded-full shadow-lg gap-2">
                <Activity className="h-5 w-5" />
                AI Studio
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
