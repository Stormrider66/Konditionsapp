/**
 * Nutrition Goal Form
 *
 * Form for managing athlete nutrition/body composition goals including:
 * - Goal type (weight loss, gain, maintain, recomp)
 * - Target weight and rate of change
 * - Macro profile preferences
 * - Activity level
 */

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { Loader2, TrendingDown, TrendingUp, Minus, Sparkles } from 'lucide-react'

const goalSchema = z.object({
  goalType: z.enum(['WEIGHT_LOSS', 'WEIGHT_GAIN', 'MAINTAIN', 'BODY_RECOMP']),
  targetWeightKg: z.number().min(30).max(200).optional().nullable(),
  weeklyChangeKg: z.number().min(0).max(1).optional().nullable(),
  targetBodyFatPercent: z.number().min(3).max(50).optional().nullable(),
  macroProfile: z.enum(['BALANCED', 'HIGH_PROTEIN', 'LOW_CARB', 'ENDURANCE', 'STRENGTH']).optional().nullable(),
  activityLevel: z.enum(['SEDENTARY', 'LIGHTLY_ACTIVE', 'ACTIVE', 'VERY_ACTIVE', 'ATHLETE']).optional(),
  showMacroTargets: z.boolean().optional(),
  showHydration: z.boolean().optional(),
})

type GoalFormData = z.infer<typeof goalSchema>

const GOAL_TYPES = [
  {
    value: 'WEIGHT_LOSS',
    label: 'Gå ner i vikt',
    description: 'Minska kroppsvikt medan du behåller muskelmassa',
    icon: TrendingDown,
    color: 'text-blue-600',
  },
  {
    value: 'WEIGHT_GAIN',
    label: 'Gå upp i vikt',
    description: 'Öka muskelmassa och kroppsvikt',
    icon: TrendingUp,
    color: 'text-green-600',
  },
  {
    value: 'MAINTAIN',
    label: 'Behålla vikt',
    description: 'Håll stabil vikt och fokusera på prestation',
    icon: Minus,
    color: 'text-slate-600',
  },
  {
    value: 'BODY_RECOMP',
    label: 'Kroppsrekompositon',
    description: 'Minska fett och öka muskelmassa samtidigt',
    icon: Sparkles,
    color: 'text-purple-600',
  },
]

const MACRO_PROFILES = [
  { value: 'BALANCED', label: 'Balanserad', description: '40% kolhydrater, 30% protein, 30% fett' },
  { value: 'HIGH_PROTEIN', label: 'Hög protein', description: 'Extra protein för muskeluppbyggnad' },
  { value: 'LOW_CARB', label: 'Lägre kolhydrater', description: 'För fettanpassad träning' },
  { value: 'ENDURANCE', label: 'Uthållighet', description: 'Högre kolhydrater för långdistans' },
  { value: 'STRENGTH', label: 'Styrka', description: 'Optimerat för styrketräning' },
]

const ACTIVITY_LEVELS = [
  { value: 'SEDENTARY', label: 'Stillasittande', description: 'Kontorsarbete, lite rörelse' },
  { value: 'LIGHTLY_ACTIVE', label: 'Lätt aktiv', description: '1-2 träningspass/vecka' },
  { value: 'ACTIVE', label: 'Aktiv', description: '3-4 träningspass/vecka' },
  { value: 'VERY_ACTIVE', label: 'Mycket aktiv', description: '5-6 träningspass/vecka' },
  { value: 'ATHLETE', label: 'Idrottare', description: 'Daglig träning, ibland dubbelpass' },
]

interface NutritionGoalFormProps {
  initialData?: GoalFormData | null
  currentWeightKg?: number
  onSuccess?: () => void
}

export function NutritionGoalForm({ initialData, currentWeightKg, onSuccess }: NutritionGoalFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      goalType: initialData?.goalType || 'MAINTAIN',
      targetWeightKg: initialData?.targetWeightKg || currentWeightKg || undefined,
      weeklyChangeKg: initialData?.weeklyChangeKg || 0.5,
      targetBodyFatPercent: initialData?.targetBodyFatPercent || undefined,
      macroProfile: initialData?.macroProfile || 'BALANCED',
      activityLevel: initialData?.activityLevel || 'ACTIVE',
      showMacroTargets: initialData?.showMacroTargets ?? true,
      showHydration: initialData?.showHydration ?? true,
    },
  })

  const goalType = form.watch('goalType')
  const showWeightTarget = goalType === 'WEIGHT_LOSS' || goalType === 'WEIGHT_GAIN'

  async function onSubmit(data: GoalFormData) {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/nutrition/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Kunde inte spara mål')
      }

      toast({
        title: 'Sparat',
        description: 'Dina näringsmål har uppdaterats.',
      })

      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte spara mål. Försök igen.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Goal Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mål</CardTitle>
            <CardDescription>Vad är ditt primära mål?</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="goalType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                      {GOAL_TYPES.map((goal) => {
                        const Icon = goal.icon
                        return (
                          <FormItem key={goal.value}>
                            <FormControl>
                              <label
                                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                  field.value === goal.value
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : 'border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <RadioGroupItem value={goal.value} className="mt-0.5" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Icon className={`h-4 w-4 ${goal.color}`} />
                                    <span className="font-medium text-sm">{goal.label}</span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {goal.description}
                                  </p>
                                </div>
                              </label>
                            </FormControl>
                          </FormItem>
                        )
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Weight Target - only show for weight loss/gain */}
        {showWeightTarget && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Viktmål</CardTitle>
              <CardDescription>
                {goalType === 'WEIGHT_LOSS'
                  ? 'Sätt ett realistiskt mål (0.25-0.5 kg/vecka rekommenderas)'
                  : 'Sätt ett realistiskt mål (0.25-0.5 kg/vecka rekommenderas)'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="targetWeightKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Målvikt (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="T.ex. 75"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    {currentWeightKg && field.value && (
                      <FormDescription>
                        {Math.abs(field.value - currentWeightKg).toFixed(1)} kg{' '}
                        {field.value < currentWeightKg ? 'att gå ner' : 'att gå upp'}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weeklyChangeKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Takt per vecka (kg)</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(parseFloat(v))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj takt" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0.25">0.25 kg/vecka (långsam, säker)</SelectItem>
                        <SelectItem value="0.5">0.5 kg/vecka (rekommenderad)</SelectItem>
                        <SelectItem value="0.75">0.75 kg/vecka (snabbare)</SelectItem>
                        <SelectItem value="1">1 kg/vecka (aggressiv)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Body Fat Target - for recomp */}
        {goalType === 'BODY_RECOMP' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kroppsfettmål</CardTitle>
              <CardDescription>Valfritt - sätt ett mål för kroppsfettsprocent</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="targetBodyFatPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mål kroppsfett (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.5"
                        placeholder="T.ex. 15"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Typiska värden: Män 10-20%, Kvinnor 18-28%
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Macro Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Makroprofil</CardTitle>
            <CardDescription>Välj fördelning av kolhydrater, protein och fett</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="macroProfile"
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj makroprofil" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MACRO_PROFILES.map((profile) => (
                        <SelectItem key={profile.value} value={profile.value}>
                          <div className="flex flex-col">
                            <span>{profile.label}</span>
                            <span className="text-xs text-slate-500">{profile.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Activity Level */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aktivitetsnivå</CardTitle>
            <CardDescription>Hur aktiv är du i vardagen och träning?</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="activityLevel"
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj aktivitetsnivå" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACTIVITY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex flex-col">
                            <span>{level.label}</span>
                            <span className="text-xs text-slate-500">{level.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Display Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visningsinställningar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="showMacroTargets"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">Visa makromål</FormLabel>
                    <FormDescription className="text-xs">
                      Visa dagliga mål för protein, kolhydrater och fett
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showHydration"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">Visa vätskemål</FormLabel>
                    <FormDescription className="text-xs">
                      Visa dagligt vätskeintag baserat på kroppsvikt och träning
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sparar...
            </>
          ) : (
            'Spara mål'
          )}
        </Button>
      </form>
    </Form>
  )
}
