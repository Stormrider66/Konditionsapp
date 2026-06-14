'use client'

import { PieChart, Target, Utensils } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MacroSplitEditor } from '@/components/athlete/settings/MacroSplitEditor'
import { DietaryPreferencesForm } from '@/components/nutrition/forms/DietaryPreferencesForm'
import { LifestyleActivitySelector } from '@/components/nutrition/forms/LifestyleActivitySelector'
import { NutritionGoalForm } from '@/components/nutrition/forms/NutritionGoalForm'
import { useTranslations } from '@/i18n/client'
import type { NutritionSettingsViewModel } from '@/lib/nutrition/settings-view-model'

interface NutritionSettingsPanelProps {
  clientId: string
  nutritionSettings: NutritionSettingsViewModel
}

export function NutritionSettingsPanel({ clientId, nutritionSettings }: NutritionSettingsPanelProps) {
  const t = useTranslations('pages.athleteSettings.nutrition')

  return (
    <Tabs defaultValue="goals" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3 bg-white/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
        <TabsTrigger value="goals" className="gap-1 px-2 text-xs sm:text-sm">
          <Target className="h-3.5 w-3.5" />
          {t('tabs.goals')}
        </TabsTrigger>
        <TabsTrigger value="macros" className="gap-1 px-2 text-xs sm:text-sm">
          <PieChart className="h-3.5 w-3.5" />
          {t('tabs.macros')}
        </TabsTrigger>
        <TabsTrigger value="preferences" className="gap-1 px-2 text-xs sm:text-sm">
          <Utensils className="h-3.5 w-3.5" />
          {t('tabs.preferences')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="goals" className="mt-0 space-y-4">
        <LifestyleActivitySelector
          clientId={clientId}
          initialValue={nutritionSettings.lifestyleActivity}
        />
        <NutritionGoalForm
          initialData={nutritionSettings.goal}
          currentWeightKg={nutritionSettings.currentWeightKg}
          showMacroProfile={false}
        />
      </TabsContent>

      <TabsContent value="macros" className="mt-0">
        <MacroSplitEditor variant="glass" />
      </TabsContent>

      <TabsContent value="preferences" className="mt-0">
        <DietaryPreferencesForm initialData={nutritionSettings.preferences} />
      </TabsContent>
    </Tabs>
  )
}
