'use client'

import { NutritionDashboard } from '@/components/nutrition/NutritionDashboard'
import { DailyNutritionCard } from '@/components/athlete/nutrition/DailyNutritionCard'
import { NutritionTimingCard } from '@/components/athlete/NutritionTimingCard'
import { MorningBriefingCard } from '@/components/athlete/MorningBriefingCard'
import { MilestoneCelebrationCard } from '@/components/athlete/MilestoneCelebrationCard'
import { AccountabilityStreakWidget } from '@/components/athlete/dashboard'
import { AgentRecommendationsPanel } from '@/components/athlete/agent'
import { AISuggestionsBanner } from '@/components/athlete/ai/AISuggestionsBanner'

interface NutritionFocusDashboardProps {
  clientId: string
  basePath: string
}

export function NutritionFocusDashboard({ clientId, basePath }: NutritionFocusDashboardProps) {
  return (
    <>
      {/* Hero: Daily Nutrition Card */}
      <div className="mb-8">
        <DailyNutritionCard />
      </div>

      {/* Contextual Cards */}
      <div className="mb-6">
        <MilestoneCelebrationCard />
      </div>
      <div className="mb-6">
        <MorningBriefingCard />
      </div>
      <div className="mb-6">
        <NutritionTimingCard />
      </div>
      <div className="mb-8">
        <AISuggestionsBanner />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3) - Nutrition content */}
        <div className="lg:col-span-2 space-y-6">
          <NutritionDashboard clientId={clientId} />
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6">
          <AccountabilityStreakWidget basePath={basePath} />
          <AgentRecommendationsPanel basePath={basePath} />
        </div>
      </div>
    </>
  )
}
