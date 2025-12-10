'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  Info,
} from 'lucide-react'
import {
  generateNutritionPlan,
  calculateTDEE,
  calculateHydration,
  getProteinRequirements,
  calculateWeightTimeline,
  type ActivityLevel,
  type CaloricGoal,
  type MacroProfile,
  type NutritionPlan,
} from '@/lib/ai/nutrition-calculator'

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

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'SEDENTARY', label: 'Stillasittande', description: 'Lite eller ingen träning' },
  { value: 'LIGHT', label: 'Lätt aktiv', description: 'Träning 1-3 dagar/vecka' },
  { value: 'MODERATE', label: 'Måttligt aktiv', description: 'Träning 3-5 dagar/vecka' },
  { value: 'ACTIVE', label: 'Mycket aktiv', description: 'Hård träning 6-7 dagar/vecka' },
  { value: 'VERY_ACTIVE', label: 'Extremt aktiv', description: 'Mycket hård träning, fysiskt jobb' },
  { value: 'ATHLETE', label: 'Elitidrottare', description: '2 pass/dag, elitträning' },
]

const CALORIC_GOALS: { value: CaloricGoal; label: string; description: string }[] = [
  { value: 'AGGRESSIVE_LOSS', label: 'Snabb viktnedgång', description: '~0.75 kg/vecka' },
  { value: 'MODERATE_LOSS', label: 'Viktnedgång', description: '~0.5 kg/vecka' },
  { value: 'MILD_LOSS', label: 'Lätt viktnedgång', description: '~0.25 kg/vecka' },
  { value: 'MAINTAIN', label: 'Bibehåll vikt', description: 'Balanserat intag' },
  { value: 'MILD_GAIN', label: 'Lätt viktökning', description: '~0.25 kg/vecka' },
  { value: 'MODERATE_GAIN', label: 'Viktökning', description: '~0.5 kg/vecka' },
  { value: 'AGGRESSIVE_GAIN', label: 'Snabb viktökning', description: '~0.75 kg/vecka (bulking)' },
]

const MACRO_PROFILES: { value: MacroProfile; label: string; description: string }[] = [
  { value: 'BALANCED', label: 'Balanserad', description: '25% protein, 45% kolhydrater, 30% fett' },
  { value: 'HIGH_PROTEIN', label: 'Högt protein', description: '35% protein, 40% kolhydrater, 25% fett' },
  { value: 'LOW_CARB', label: 'Låg kolhydrat', description: '30% protein, 30% kolhydrater, 40% fett' },
  { value: 'ENDURANCE', label: 'Uthållighet', description: '20% protein, 55% kolhydrater, 25% fett' },
  { value: 'STRENGTH', label: 'Styrka', description: '30% protein, 45% kolhydrater, 25% fett' },
  { value: 'KETO', label: 'Keto', description: '25% protein, 5% kolhydrater, 70% fett' },
]

export function NutritionRecommendations({
  clientId,
  clientData,
  onGenerateAIPlan,
}: NutritionRecommendationsProps) {
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
  const [customProtein, setCustomProtein] = useState<number | null>(null)

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
        throw new Error(data.error || 'Kunde inte generera plan')
      }

      toast({
        title: 'AI-plan genererad',
        description: 'En personlig näringsplan har skapats.',
      })

      onGenerateAIPlan?.()
    } catch (error) {
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Okänt fel',
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
            Vikt och längd krävs för att beräkna näringsrekommendationer.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Lägg till en kroppssammansättningsmätning först.
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
            Beräkna näringsplan
          </CardTitle>
          <CardDescription>
            Anpassa inställningar för att få personliga rekommendationer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Aktivitetsnivå</Label>
              <Select
                value={activityLevel}
                onValueChange={(v) => setActivityLevel(v as ActivityLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_LEVELS.map((level) => (
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
              <Label>Mål</Label>
              <Select
                value={goal}
                onValueChange={(v) => setGoal(v as CaloricGoal)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CALORIC_GOALS.map((g) => (
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
              <Label>Makroprofil</Label>
              <Select
                value={macroProfile}
                onValueChange={(v) => setMacroProfile(v as MacroProfile)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MACRO_PROFILES.map((profile) => (
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
                Målvikt: {targetWeight || clientData.weight} kg
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
                  Uppskattad tid: {timeline.weeks} veckor med {Math.abs(timeline.dailyDeficit)} kcal/dag{' '}
                  {timeline.dailyDeficit < 0 ? 'underskott' : 'överskott'}
                  {!timeline.achievable && (
                    <span className="text-yellow-600 ml-2">
                      (kan vara för aggressivt)
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
                Dagligt kaloriintag
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">BMR</p>
                  <p className="text-2xl font-bold">{nutritionPlan.bmr}</p>
                  <p className="text-xs text-muted-foreground">kcal/dag i vila</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">TDEE</p>
                  <p className="text-2xl font-bold">{nutritionPlan.tdee}</p>
                  <p className="text-xs text-muted-foreground">total förbrukning</p>
                </div>
                <div className="text-center p-4 bg-primary/10 rounded-lg border-2 border-primary">
                  <p className="text-sm text-muted-foreground">Målkalorier</p>
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
                Makronutrienter
              </CardTitle>
              <CardDescription>
                Rekommenderad fördelning baserat på dina mål
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
                      Rekommenderat: {proteinReqs.min}-{proteinReqs.max}g
                    </p>
                  )}
                </div>

                {/* Carbs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wheat className="h-5 w-5 text-amber-500" />
                      <span className="font-medium">Kolhydrater</span>
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
                      <span className="font-medium">Fett</span>
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
                  <span>Kolhydrater</span>
                  <span>Fett</span>
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
                  Vätskebehov
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-blue-600">
                    {(hydration.withActivityML / 1000).toFixed(1)}L
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>per dag baserat på din aktivitetsnivå</p>
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
                  Varningar
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
                  Rekommendationer
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
                    <p className="font-medium">Vill du ha en mer detaljerad plan?</p>
                    <p className="text-sm text-muted-foreground">
                      AI kan skapa en personlig närings- och måltidsplan baserad på dina mål.
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
                      Genererar...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generera AI-plan
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
