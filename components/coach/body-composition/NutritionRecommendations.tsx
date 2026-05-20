'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/hooks/use-toast'
import {
  Utensils,
  Flame,
  Beef,
  Wheat,
  Droplet,
  Target,
  TrendingDown,
  TrendingUp,
  Minus,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react'
import {
  generateNutritionPlan,
  calculateHydration,
  getProteinRequirements,
  calculateWeightTimeline,
  type ActivityLevel,
  type CaloricGoal,
  type MacroProfile,
  type NutritionPlan,
} from '@/lib/ai/nutrition-calculator'
import { useLocale } from 'next-intl'

type AppLocale = 'en' | 'sv'

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

interface NutritionRecommendationsProps {
  clientId: string
  clientData: {
    name: string
    gender: 'MALE' | 'FEMALE'
    birthDate: string
    height: number
    weight?: number
    bodyFatPercent?: number
    activityLevel?: ActivityLevel
    sport?: string
  }
  onGenerateAIPlan?: () => void
}

const getActivityLevels = (locale: AppLocale): { value: ActivityLevel; label: string; description: string }[] => [
  { value: 'SEDENTARY', label: copy(locale, 'Sedentary', 'Stillasittande'), description: copy(locale, 'Little or no training', 'Lite eller ingen träning') },
  { value: 'LIGHT', label: copy(locale, 'Lightly active', 'Lätt aktiv'), description: copy(locale, 'Training 1-3 days/week', 'Träning 1-3 dagar/vecka') },
  { value: 'MODERATE', label: copy(locale, 'Moderately active', 'Måttligt aktiv'), description: copy(locale, 'Training 3-5 days/week', 'Träning 3-5 dagar/vecka') },
  { value: 'ACTIVE', label: copy(locale, 'Very active', 'Mycket aktiv'), description: copy(locale, 'Hard training 6-7 days/week', 'Hård träning 6-7 dagar/vecka') },
  { value: 'VERY_ACTIVE', label: copy(locale, 'Extremely active', 'Extremt aktiv'), description: copy(locale, 'Very hard training, physical job', 'Mycket hård träning, fysiskt jobb') },
  { value: 'ATHLETE', label: copy(locale, 'Elite athlete', 'Elitidrottare'), description: copy(locale, '2 sessions/day, elite training', '2 pass/dag, elitträning') },
]

const getCaloricGoals = (locale: AppLocale): { value: CaloricGoal; label: string; description: string }[] => [
  { value: 'AGGRESSIVE_LOSS', label: copy(locale, 'Fast weight loss', 'Snabb viktnedgång'), description: copy(locale, '~0.75 kg/week', '~0.75 kg/vecka') },
  { value: 'MODERATE_LOSS', label: copy(locale, 'Weight loss', 'Viktnedgång'), description: copy(locale, '~0.5 kg/week', '~0.5 kg/vecka') },
  { value: 'MILD_LOSS', label: copy(locale, 'Mild weight loss', 'Lätt viktnedgång'), description: copy(locale, '~0.25 kg/week', '~0.25 kg/vecka') },
  { value: 'MAINTAIN', label: copy(locale, 'Maintain weight', 'Bibehåll vikt'), description: copy(locale, 'Balanced intake', 'Balanserat intag') },
  { value: 'MILD_GAIN', label: copy(locale, 'Mild weight gain', 'Lätt viktökning'), description: copy(locale, '~0.25 kg/week', '~0.25 kg/vecka') },
  { value: 'MODERATE_GAIN', label: copy(locale, 'Weight gain', 'Viktökning'), description: copy(locale, '~0.5 kg/week', '~0.5 kg/vecka') },
  { value: 'AGGRESSIVE_GAIN', label: copy(locale, 'Fast weight gain', 'Snabb viktökning'), description: copy(locale, '~0.75 kg/week (bulking)', '~0.75 kg/vecka (bulking)') },
]

const getMacroProfiles = (locale: AppLocale): { value: MacroProfile; label: string; description: string }[] => [
  { value: 'BALANCED', label: copy(locale, 'Balanced', 'Balanserad'), description: copy(locale, '25% protein, 45% carbs, 30% fat', '25% protein, 45% kolhydrater, 30% fett') },
  { value: 'HIGH_PROTEIN', label: copy(locale, 'High protein', 'Högt protein'), description: copy(locale, '35% protein, 40% carbs, 25% fat', '35% protein, 40% kolhydrater, 25% fett') },
  { value: 'LOW_CARB', label: copy(locale, 'Low carb', 'Låg kolhydrat'), description: copy(locale, '30% protein, 30% carbs, 40% fat', '30% protein, 30% kolhydrater, 40% fett') },
  { value: 'ENDURANCE', label: copy(locale, 'Endurance', 'Uthållighet'), description: copy(locale, '20% protein, 55% carbs, 25% fat', '20% protein, 55% kolhydrater, 25% fett') },
  { value: 'STRENGTH', label: copy(locale, 'Strength', 'Styrka'), description: copy(locale, '30% protein, 45% carbs, 25% fat', '30% protein, 45% kolhydrater, 25% fett') },
  { value: 'KETO', label: 'Keto', description: copy(locale, '25% protein, 5% carbs, 70% fat', '25% protein, 5% kolhydrater, 70% fett') },
]

export function NutritionRecommendations({
  clientId,
  clientData,
  onGenerateAIPlan,
}: NutritionRecommendationsProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const activityLevels = getActivityLevels(locale)
  const caloricGoals = getCaloricGoals(locale)
  const macroProfiles = getMacroProfiles(locale)
  const { toast } = useToast()
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  // Form state
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    clientData.activityLevel || 'MODERATE'
  )
  const [goal, setGoal] = useState<CaloricGoal>('MAINTAIN')
  const [macroProfile, setMacroProfile] = useState<MacroProfile>(
    clientData.sport === 'RUNNING' ? 'ENDURANCE' :
    clientData.sport === 'STRENGTH' ? 'STRENGTH' : 'BALANCED'
  )
  const [targetWeight, setTargetWeight] = useState<number | null>(null)
  const [customProtein] = useState<number | null>(null)

  // Calculated values
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null)

  // Calculate age
  const ageYears = Math.floor(
    (new Date().getTime() - new Date(clientData.birthDate).getTime()) /
    (1000 * 60 * 60 * 24 * 365.25)
  )

  // Recalculate when inputs change
  useEffect(() => {
    if (!clientData.weight || !clientData.height) return

    const plan = generateNutritionPlan(
      {
        weightKg: clientData.weight,
        heightCm: clientData.height,
        ageYears,
        gender: clientData.gender,
        activityLevel,
      },
      goal,
      macroProfile,
      customProtein || undefined
    )

    setNutritionPlan(plan)
  }, [
    clientData.weight,
    clientData.height,
    clientData.gender,
    ageYears,
    activityLevel,
    goal,
    macroProfile,
    customProtein,
  ])

  // Calculate hydration
  const hydration = clientData.weight
    ? calculateHydration(clientData.weight, activityLevel)
    : null

  // Calculate weight timeline
  const timeline =
    clientData.weight && targetWeight
      ? calculateWeightTimeline(clientData.weight, targetWeight)
      : null

  // Get protein requirements
  const proteinReqs = clientData.weight
    ? getProteinRequirements(
        clientData.weight,
        goal.includes('LOSS') ? 'WEIGHT_LOSS' :
        goal.includes('GAIN') ? 'MUSCLE_GAIN' :
        activityLevel === 'ATHLETE' ? 'ELITE_ATHLETE' :
        clientData.sport === 'RUNNING' ? 'ENDURANCE_ATHLETE' : 'SEDENTARY'
      )
    : null

  const handleGenerateAI = async () => {
    setIsGeneratingAI(true)
    try {
      // Call AI endpoint
      const response = await fetch('/api/ai/nutrition-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientData,
          activityLevel,
          goal,
          macroProfile,
          targetWeight,
          nutritionPlan,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || copy(locale, 'Could not generate plan', 'Kunde inte generera plan'))
      }

      toast({
        title: copy(locale, 'AI plan generated', 'AI-plan genererad'),
        description: copy(locale, 'A personalized nutrition plan has been created.', 'En personlig näringsplan har skapats.'),
      })

      onGenerateAIPlan?.()
    } catch (error) {
      toast({
        title: copy(locale, 'Error', 'Fel'),
        description: error instanceof Error ? error.message : copy(locale, 'Unknown error', 'Okänt fel'),
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingAI(false)
    }
  }

  if (!clientData.weight || !clientData.height) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
          <p className="text-muted-foreground">
            {copy(locale, 'Weight and height are required to calculate nutrition recommendations.', 'Vikt och längd krävs för att beräkna näringsrekommendationer.')}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {copy(locale, 'Add a body composition measurement first.', 'Lägg till en kroppssammansättningsmätning först.')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {copy(locale, 'Calculate nutrition plan', 'Beräkna näringsplan')}
          </CardTitle>
          <CardDescription>
            {copy(locale, 'Adjust settings to get personalized recommendations', 'Anpassa inställningar för att få personliga rekommendationer')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{copy(locale, 'Activity level', 'Aktivitetsnivå')}</Label>
              <Select
                value={activityLevel}
                onValueChange={(v) => setActivityLevel(v as ActivityLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activityLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div>
                        <span className="font-medium">{level.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {level.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{copy(locale, 'Goal', 'Mål')}</Label>
              <Select
                value={goal}
                onValueChange={(v) => setGoal(v as CaloricGoal)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {caloricGoals.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      <div className="flex items-center gap-2">
                        {g.value.includes('LOSS') ? (
                          <TrendingDown className="h-3 w-3 text-blue-500" />
                        ) : g.value.includes('GAIN') ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                        <span>{g.label}</span>
                        <span className="text-xs text-muted-foreground">
                          ({g.description})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{copy(locale, 'Macro profile', 'Makroprofil')}</Label>
              <Select
                value={macroProfile}
                onValueChange={(v) => setMacroProfile(v as MacroProfile)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {macroProfiles.map((profile) => (
                    <SelectItem key={profile.value} value={profile.value}>
                      <div>
                        <span className="font-medium">{profile.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target weight slider */}
          {(goal.includes('LOSS') || goal.includes('GAIN')) && (
            <div className="space-y-2">
              <Label>
                {copy(locale, 'Target weight', 'Målvikt')}: {targetWeight || clientData.weight} kg
                {targetWeight && targetWeight !== clientData.weight && (
                  <span className="text-muted-foreground ml-2">
                    ({targetWeight > clientData.weight ? '+' : ''}
                    {(targetWeight - clientData.weight).toFixed(1)} kg)
                  </span>
                )}
              </Label>
              <Slider
                value={[targetWeight || clientData.weight]}
                onValueChange={([v]) => setTargetWeight(v)}
                min={Math.max(40, clientData.weight - 30)}
                max={clientData.weight + 20}
                step={0.5}
              />
              {timeline && (
                <p className="text-sm text-muted-foreground">
                  {copy(locale, 'Estimated time', 'Uppskattad tid')}: {timeline.weeks} {copy(locale, 'weeks', 'veckor')} {copy(locale, 'with', 'med')} {Math.abs(timeline.dailyDeficit)} kcal/{copy(locale, 'day', 'dag')}{' '}
                  {timeline.dailyDeficit < 0 ? copy(locale, 'deficit', 'underskott') : copy(locale, 'surplus', 'överskott')}
                  {!timeline.achievable && (
                    <span className="text-yellow-600 ml-2">
                      {copy(locale, '(may be too aggressive)', '(kan vara för aggressivt)')}
                    </span>
                  )}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {nutritionPlan && (
        <>
          {/* Calorie overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                {copy(locale, 'Daily calorie intake', 'Dagligt kaloriintag')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">BMR</p>
                  <p className="text-2xl font-bold">{nutritionPlan.bmr}</p>
                  <p className="text-xs text-muted-foreground">{copy(locale, 'kcal/day at rest', 'kcal/dag i vila')}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">TDEE</p>
                  <p className="text-2xl font-bold">{nutritionPlan.tdee}</p>
                  <p className="text-xs text-muted-foreground">{copy(locale, 'total expenditure', 'total förbrukning')}</p>
                </div>
                <div className="text-center p-4 bg-primary/10 rounded-lg border-2 border-primary">
                  <p className="text-sm text-muted-foreground">{copy(locale, 'Target calories', 'Målkalorier')}</p>
                  <p className="text-3xl font-bold text-primary">
                    {nutritionPlan.targetCalories}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {nutritionPlan.deficit > 0 ? '+' : ''}
                    {nutritionPlan.deficit} kcal
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Macros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5" />
                {copy(locale, 'Macronutrients', 'Makronutrienter')}
              </CardTitle>
              <CardDescription>
                {copy(locale, 'Recommended distribution based on your goals', 'Rekommenderad fördelning baserat på dina mål')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Protein */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Beef className="h-5 w-5 text-red-500" />
                      <span className="font-medium">Protein</span>
                    </div>
                    <Badge variant="secondary">
                      {nutritionPlan.macros.protein.percentage}%
                    </Badge>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-3xl font-bold text-red-700">
                      {nutritionPlan.macros.protein.grams}g
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {nutritionPlan.macros.protein.calories} kcal
                    </p>
                  </div>
                  {proteinReqs && (
                    <p className="text-xs text-muted-foreground text-center">
                      {copy(locale, 'Recommended', 'Rekommenderat')}: {proteinReqs.min}-{proteinReqs.max}g
                    </p>
                  )}
                </div>

                {/* Carbs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wheat className="h-5 w-5 text-amber-500" />
                      <span className="font-medium">{copy(locale, 'Carbs', 'Kolhydrater')}</span>
                    </div>
                    <Badge variant="secondary">
                      {nutritionPlan.macros.carbs.percentage}%
                    </Badge>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <p className="text-3xl font-bold text-amber-700">
                      {nutritionPlan.macros.carbs.grams}g
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {nutritionPlan.macros.carbs.calories} kcal
                    </p>
                  </div>
                </div>

                {/* Fat */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplet className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">{copy(locale, 'Fat', 'Fett')}</span>
                    </div>
                    <Badge variant="secondary">
                      {nutritionPlan.macros.fat.percentage}%
                    </Badge>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-3xl font-bold text-yellow-700">
                      {nutritionPlan.macros.fat.grams}g
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {nutritionPlan.macros.fat.calories} kcal
                    </p>
                  </div>
                </div>
              </div>

              {/* Macro bar visualization */}
              <div className="mt-6">
                <div className="h-4 rounded-full overflow-hidden flex">
                  <div
                    className="bg-red-500"
                    style={{ width: `${nutritionPlan.macros.protein.percentage}%` }}
                  />
                  <div
                    className="bg-amber-500"
                    style={{ width: `${nutritionPlan.macros.carbs.percentage}%` }}
                  />
                  <div
                    className="bg-yellow-500"
                    style={{ width: `${nutritionPlan.macros.fat.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Protein</span>
                  <span>{copy(locale, 'Carbs', 'Kolhydrater')}</span>
                  <span>{copy(locale, 'Fat', 'Fett')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hydration */}
          {hydration && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplet className="h-5 w-5 text-blue-500" />
                  {copy(locale, 'Fluid needs', 'Vätskebehov')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-blue-600">
                    {(hydration.withActivityML / 1000).toFixed(1)}L
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>{copy(locale, 'per day based on your activity level', 'per dag baserat på din aktivitetsnivå')}</p>
                    <p className="text-xs">Bas: {(hydration.baseML / 1000).toFixed(1)}L</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  {hydration.recommendation}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {nutritionPlan.warnings.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="h-5 w-5" />
                  {copy(locale, 'Warnings', 'Varningar')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {nutritionPlan.warnings.map((warning, i) => (
                    <li key={i} className="flex items-start gap-2 text-yellow-800">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {nutritionPlan.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-500" />
                  {copy(locale, 'Recommendations', 'Rekommendationer')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {nutritionPlan.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* AI Plan button */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-purple-500" />
                  <div>
                    <p className="font-medium">{copy(locale, 'Want a more detailed plan?', 'Vill du ha en mer detaljerad plan?')}</p>
                    <p className="text-sm text-muted-foreground">
                      {copy(locale, 'AI can create a personalized nutrition and meal plan based on your goals.', 'AI kan skapa en personlig närings- och måltidsplan baserad på dina mål.')}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleGenerateAI}
                  disabled={isGeneratingAI}
                  className="ml-4"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {copy(locale, 'Generating...', 'Genererar...')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {copy(locale, 'Generate AI plan', 'Generera AI-plan')}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
