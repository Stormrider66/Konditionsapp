/**
 * Athlete Nutrition Settings Page
 *
 * Allows athletes to configure:
 * - Dietary preferences (allergies, intolerances, diet style)
 * - Nutrition goals (weight targets, macro profiles)
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Utensils, Target } from 'lucide-react'
import Link from 'next/link'
import { DietaryPreferencesForm } from '@/components/nutrition/forms/DietaryPreferencesForm'
import { NutritionGoalForm } from '@/components/nutrition/forms/NutritionGoalForm'

export default async function NutritionSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get athlete account with preferences and goals
  const athleteAccount = await prisma.athleteAccount.findFirst({
    where: {
      user: { email: user.email },
    },
    include: {
      client: {
        include: {
          dietaryPreferences: true,
          nutritionGoal: true,
        },
      },
    },
  })

  if (!athleteAccount) {
    redirect('/login')
  }

  const { client } = athleteAccount
  const preferences = client.dietaryPreferences
  const goal = client.nutritionGoal

  // Transform data for forms
  const preferencesData = preferences
    ? {
        dietaryStyle: preferences.dietaryStyle as
          | 'OMNIVORE'
          | 'VEGETARIAN'
          | 'VEGAN'
          | 'PESCATARIAN'
          | 'FLEXITARIAN'
          | undefined,
        allergies: (preferences.allergies as string[]) || [],
        intolerances: (preferences.intolerances as string[]) || [],
        dislikedFoods: (preferences.dislikedFoods as string[]) || [],
        preferLowFODMAP: preferences.preferLowFODMAP,
        preferWholeGrain: preferences.preferWholeGrain,
        preferSwedishFoods: preferences.preferSwedishFoods,
      }
    : null

  const goalData = goal
    ? {
        goalType: goal.goalType as 'WEIGHT_LOSS' | 'WEIGHT_GAIN' | 'MAINTAIN' | 'BODY_RECOMP',
        targetWeightKg: goal.targetWeightKg,
        weeklyChangeKg: goal.weeklyChangeKg,
        targetBodyFatPercent: goal.targetBodyFatPercent,
        macroProfile: goal.macroProfile as
          | 'BALANCED'
          | 'HIGH_PROTEIN'
          | 'LOW_CARB'
          | 'ENDURANCE'
          | 'STRENGTH'
          | undefined,
        activityLevel: goal.activityLevel as
          | 'SEDENTARY'
          | 'LIGHTLY_ACTIVE'
          | 'ACTIVE'
          | 'VERY_ACTIVE'
          | 'ATHLETE'
          | undefined,
        showMacroTargets: goal.showMacroTargets,
        showHydration: goal.showHydration,
      }
    : null

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/athlete/settings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Kost & Näring</h1>
          <p className="text-slate-500">Anpassa dina kostpreferenser och mål</p>
        </div>
      </div>

      {/* Tabs for preferences and goals */}
      <Tabs defaultValue="preferences" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preferences" className="gap-2">
            <Utensils className="h-4 w-4" />
            Preferenser
          </TabsTrigger>
          <TabsTrigger value="goals" className="gap-2">
            <Target className="h-4 w-4" />
            Mål
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="mt-6">
          <DietaryPreferencesForm initialData={preferencesData} />
        </TabsContent>

        <TabsContent value="goals" className="mt-6">
          <NutritionGoalForm
            initialData={goalData}
            currentWeightKg={client.weight || undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
