'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  History,
  Plus,
  Dumbbell,
  Heart,
  Flame,
  Zap,
  Sparkles,
  Lock,
  Crown,
  ChevronRight,
} from 'lucide-react'
import { AthleteStrengthClient } from '@/app/athlete/strength/client'
import { AthleteCardioClient } from '@/components/athlete/cardio/AthleteCardioClient'
import { AgilityDashboard } from '@/components/athlete/AgilityDashboard'
import { WODHistorySection, type WODSummaryItem } from '@/components/athlete/WODHistorySection'
import type { AgilityWorkoutResult, TimingGateResult } from '@/types'

interface Assignment {
  id: string
  sessionId: string
  sessionName: string
  phase: string
  estimatedDuration: number | null
  assignedDate: string
  status: string
  startTime?: string | null
  endTime?: string | null
  locationName?: string | null
  location?: { id: string; name: string } | null
}

interface DashboardAssignment {
  id: string
  athleteId: string
  workoutId: string
  assignedDate: Date
  status: string
  completedAt?: Date | null
  notes?: string | null
  workout: {
    id: string
    name: string
    format: string
    totalDuration?: number | null
    drills?: { id: string }[]
  }
}

type CategoryFilter = 'alla' | 'styrka' | 'cardio' | 'hybrid' | 'agility' | 'ai-pass'
type CreateCategoryFilter = 'styrka' | 'cardio' | 'hybrid'

interface TrainingLibraryClientProps {
  clientId: string
  selfServiceEnabled: boolean
  subscriptionTier: string
  basePath: string
  strengthUpcoming: Assignment[]
  strengthCompleted: Assignment[]
  agilityAssignments: DashboardAssignment[]
  agilityResults: (AgilityWorkoutResult & {
    workout: { id: string; name: string }
  })[]
  agilityTimingResults: (TimingGateResult & {
    session: { sessionName?: string | null; sessionDate: Date }
  })[]
  wodHistory?: WODSummaryItem[]
}

const historyCategoryFilters: { value: CategoryFilter; label: string; icon: React.ElementType }[] = [
  { value: 'alla', label: 'Alla', icon: History },
  { value: 'styrka', label: 'Styrka', icon: Dumbbell },
  { value: 'cardio', label: 'Cardio', icon: Heart },
  { value: 'hybrid', label: 'Hybrid', icon: Flame },
  { value: 'agility', label: 'Agility', icon: Zap },
  { value: 'ai-pass', label: 'AI-Pass', icon: Sparkles },
]

const createCategoryFilters: { value: CreateCategoryFilter; label: string; icon: React.ElementType }[] = [
  { value: 'styrka', label: 'Styrka', icon: Dumbbell },
  { value: 'cardio', label: 'Cardio', icon: Heart },
  { value: 'hybrid', label: 'Hybrid', icon: Flame },
]

export function TrainingLibraryClient({
  clientId,
  selfServiceEnabled,
  subscriptionTier,
  basePath,
  strengthUpcoming,
  strengthCompleted,
  agilityAssignments,
  agilityResults,
  agilityTimingResults,
  wodHistory = [],
}: TrainingLibraryClientProps) {
  const [topTab, setTopTab] = useState<string>('historik')
  const [historyCategory, setHistoryCategory] = useState<CategoryFilter>('alla')
  const [createCategory, setCreateCategory] = useState<CreateCategoryFilter>('styrka')

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">
          Träningsbibliotek
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
          All din träning samlad på ett ställe
        </p>
      </div>

      {/* Top-level tabs */}
      <Tabs value={topTab} onValueChange={setTopTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
          <TabsTrigger
            value="historik"
            className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white transition-all font-bold"
          >
            <History className="h-4 w-4" />
            Historik
          </TabsTrigger>
          <TabsTrigger
            value="skapa"
            className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white transition-all font-bold"
          >
            <Plus className="h-4 w-4" />
            Skapa Pass
          </TabsTrigger>
        </TabsList>

        {/* Historik Tab */}
        <TabsContent value="historik" className="mt-6">
          {/* Category filter pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {historyCategoryFilters.map((filter) => {
              const isActive = historyCategory === filter.value
              return (
                <button
                  key={filter.value}
                  onClick={() => setHistoryCategory(filter.value)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                  }`}
                >
                  <filter.icon className="h-3.5 w-3.5" />
                  {filter.label}
                </button>
              )
            })}
          </div>

          {/* Render history content based on category */}
          {(historyCategory === 'alla' || historyCategory === 'styrka') && (
            <div className={historyCategory === 'alla' ? 'mb-8' : ''}>
              {historyCategory === 'alla' && (
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-blue-500" />
                  Styrka
                </h2>
              )}
              <AthleteStrengthClient
                selfServiceEnabled={selfServiceEnabled}
                subscriptionTier={subscriptionTier}
                upcomingAssignments={strengthUpcoming}
                completedAssignments={strengthCompleted}
                basePath={basePath}
              />
            </div>
          )}

          {(historyCategory === 'alla' || historyCategory === 'cardio') && (
            <div className={historyCategory === 'alla' ? 'mb-8' : ''}>
              {historyCategory === 'alla' && (
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Cardio
                </h2>
              )}
              <AthleteCardioClient
                clientId={clientId}
                canAccessTemplates={selfServiceEnabled}
              />
            </div>
          )}

          {(historyCategory === 'alla' || historyCategory === 'agility') && (
            <div>
              {historyCategory === 'alla' && (
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Agility
                </h2>
              )}
              <AgilityDashboard
                clientId={clientId}
                assignments={agilityAssignments}
                results={agilityResults}
                timingResults={agilityTimingResults}
                basePath={`${basePath}/athlete`}
              />
            </div>
          )}

          {(historyCategory === 'alla' || historyCategory === 'ai-pass') && (
            <div className={historyCategory === 'alla' ? 'mb-8' : ''}>
              {historyCategory === 'alla' && (
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                  AI-Pass
                </h2>
              )}
              <WODHistorySection wodHistory={wodHistory} basePath={basePath} />
            </div>
          )}

          {historyCategory === 'hybrid' && (
            <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 dark:bg-white/5 dark:border-white/10 rounded-3xl">
              <div className="w-16 h-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Flame className="h-8 w-8 text-slate-300 dark:text-slate-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
                Ingen hybrid-historik ännu
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                Slutförda hybridpass visas här.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Skapa Pass Tab */}
        <TabsContent value="skapa" className="mt-6">
          {selfServiceEnabled ? (
            <>
              {/* Category filter pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {createCategoryFilters.map((filter) => {
                  const isActive = createCategory === filter.value
                  return (
                    <button
                      key={filter.value}
                      onClick={() => setCreateCategory(filter.value)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                      }`}
                    >
                      <filter.icon className="h-3.5 w-3.5" />
                      {filter.label}
                    </button>
                  )
                })}
              </div>

              {/* Render template content based on category */}
              {createCategory === 'styrka' && (
                <AthleteStrengthClient
                  selfServiceEnabled={selfServiceEnabled}
                  subscriptionTier={subscriptionTier}
                  upcomingAssignments={strengthUpcoming}
                  completedAssignments={strengthCompleted}
                  basePath={basePath}
                />
              )}

              {createCategory === 'cardio' && (
                <AthleteCardioClient
                  clientId={clientId}
                  canAccessTemplates={selfServiceEnabled}
                />
              )}

              {createCategory === 'hybrid' && (
                <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 dark:bg-white/5 dark:border-white/10 rounded-3xl">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Flame className="h-8 w-8 text-slate-300 dark:text-slate-500" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
                    Hybridmallar
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">
                    Hybridmallar kommer snart.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* PRO upgrade CTA */
            <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 dark:bg-white/5 dark:border-white/10 rounded-3xl">
              <div className="inline-flex items-center justify-center p-4 rounded-full bg-yellow-100 dark:bg-yellow-500/10 mb-6 border border-yellow-200 dark:border-yellow-500/20">
                <Lock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
                PRO-funktion
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 max-w-md mx-auto">
                Uppgradera till PRO för att bläddra och skapa pass på egen hand.
              </p>
              <div className="flex items-center justify-center gap-3 mb-8">
                <Badge variant="outline" className="text-xs font-bold uppercase tracking-wider py-1 px-3 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300">
                  Din plan: {subscriptionTier}
                </Badge>
                <ChevronRight className="h-4 w-4 text-slate-300" />
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 border-0">
                  <Crown className="h-3 w-3 mr-1" />
                  PRO
                </Badge>
              </div>
              <Button variant="outline" asChild className="font-bold border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
                <Link href={`${basePath}/athlete/subscription`}>
                  Uppgradera nu
                </Link>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
