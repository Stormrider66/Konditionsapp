'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Activity, Trophy, Scale, Calendar, Heart, Gauge, Video, Target, Settings2, Sparkles } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import type { AthleteProfileData } from '@/lib/athlete-profile/data-fetcher'
import { ProfileHeroSection } from './ProfileHeroSection'
import { AIContextSidebar } from './AIContextSidebar'
import { ManageSportsSection } from './ManageSportsSection'
import { AITrainingPreferences } from './AITrainingPreferences'
import { PhysiologyTab } from './tabs/PhysiologyTab'
import { PerformanceTab } from './tabs/PerformanceTab'
import { BodyCompositionTab } from './tabs/BodyCompositionTab'
import { TrainingHistoryTab } from './tabs/TrainingHistoryTab'
import { InjuryHealthTab } from './tabs/InjuryHealthTab'
import { ReadinessTab } from './tabs/ReadinessTab'
import { TechniqueTab } from './tabs/TechniqueTab'
import { GoalsPlanningTab } from './tabs/GoalsPlanningTab'
import { cn } from '@/lib/utils'

interface AthleteProfileClientProps {
  data: AthleteProfileData
  viewMode: 'coach' | 'athlete'
  initialTab: string
  currentUserId: string
  basePath?: string
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
  basePath = '',
}: AthleteProfileClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') || initialTab
  const isAthlete = viewMode === 'athlete'
  const [isAIPreferencesOpen, setIsAIPreferencesOpen] = useState(false)

  const client = data.identity.client!
  const backLink = viewMode === 'coach' ? `/clients/${client.id}` : `${basePath}/athlete/dashboard`

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className={cn("min-h-screen", isAthlete ? "bg-transparent pb-20" : "bg-gray-50")}>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link href={backLink}>
            <Button variant="ghost" size="sm" className={cn(
              "gap-2",
              isAthlete ? "font-black uppercase tracking-widest text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" : ""
            )}>
              <ArrowLeft className="h-4 w-4" />
              {viewMode === 'coach' ? 'Tillbaka till klient' : 'Dashboard'}
            </Button>
          </Link>
        </div>

        {/* Hero Section */}
        <ProfileHeroSection
          data={data}
          viewMode={viewMode}
          variant={isAthlete ? "glass" : "default"}
        />

        {/* Manage Sports Section (Athlete only) */}
        {isAthlete && data.identity.sportProfile && (
          <ManageSportsSection
            clientId={client.id}
            sportProfile={data.identity.sportProfile}
          />
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-10">
          {/* Tab Content - 3 columns on desktop */}
          <div className="lg:col-span-3">
            <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
              {/* Tab List */}
              <TabsList className={cn(
                "w-full justify-start overflow-x-auto flex-nowrap h-auto mb-8 p-1.5 rounded-2xl",
                isAthlete ? "bg-white border-slate-200 dark:bg-white/5 dark:border-white/5 shadow-sm dark:shadow-none transition-colors" : "bg-white border"
              )}>
                {PROFILE_TABS.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className={cn(
                        "flex-shrink-0 gap-2 h-10 px-4 rounded-xl transition-all duration-300",
                        isAthlete
                          ? "data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px]"
                          : "data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {/* Tab Content */}
              <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <TabsContent value="physiology" className="mt-0">
                  <PhysiologyTab data={data} viewMode={viewMode} variant={isAthlete ? "glass" : "default"} basePath={basePath} />
                </TabsContent>

                <TabsContent value="performance" className="mt-0">
                  <PerformanceTab data={data} viewMode={viewMode} variant={isAthlete ? "glass" : "default"} />
                </TabsContent>

                <TabsContent value="body" className="mt-0">
                  <BodyCompositionTab data={data} viewMode={viewMode} variant={isAthlete ? "glass" : "default"} basePath={basePath} />
                </TabsContent>

                <TabsContent value="training" className="mt-0">
                  <TrainingHistoryTab data={data} viewMode={viewMode} variant={isAthlete ? "glass" : "default"} />
                </TabsContent>

                <TabsContent value="health" className="mt-0">
                  <InjuryHealthTab data={data} viewMode={viewMode} variant={isAthlete ? "glass" : "default"} />
                </TabsContent>

                <TabsContent value="readiness" className="mt-0">
                  <ReadinessTab data={data} viewMode={viewMode} variant={isAthlete ? "glass" : "default"} />
                </TabsContent>

                <TabsContent value="technique" className="mt-0">
                  <TechniqueTab data={data} viewMode={viewMode} variant={isAthlete ? "glass" : "default"} basePath={basePath} />
                </TabsContent>

                <TabsContent value="goals" className="mt-0">
                  <GoalsPlanningTab data={data} viewMode={viewMode} variant={isAthlete ? "glass" : "default"} />
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

        {/* AI Preferences Button (Athlete only) */}
        {isAthlete && (
          <div className="fixed bottom-20 right-4 z-50">
            <Button
              size="lg"
              onClick={() => setIsAIPreferencesOpen(true)}
              className="rounded-full shadow-lg gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Sparkles className="h-5 w-5" />
              AI Preferenser
            </Button>
          </div>
        )}

        {/* AI Training Preferences Dialog */}
        <AITrainingPreferences
          data={data}
          clientId={client.id}
          isOpen={isAIPreferencesOpen}
          onClose={() => setIsAIPreferencesOpen(false)}
          variant={isAthlete ? "glass" : "default"}
        />
      </main>
    </div>
  )
}
