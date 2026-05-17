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
import { useRouter } from 'next/navigation'
import { Loader2, TrendingDown, TrendingUp, Minus, Sparkles, Flame } from 'lucide-react'
import { useTranslations } from '@/i18n/client'

const goalSchema = z.object({
  goalType: z.enum(['WEIGHT_LOSS', 'WEIGHT_GAIN', 'MAINTAIN', 'BODY_RECOMP']),
  targetWeightKg: z.number().min(30).max(200).optional().nullable(),
  weeklyChangeKg: z.number().min(0).max(1).optional().nullable(),
  targetBodyFatPercent: z.number().min(3).max(50).optional().nullable(),
  macroProfile: z.enum(['BALANCED', 'HIGH_PROTEIN', 'LOW_CARB', 'ENDURANCE', 'STRENGTH']).optional().nullable(),
  activityLevel: z.enum(['SEDENTARY', 'LIGHTLY_ACTIVE', 'ACTIVE', 'VERY_ACTIVE', 'ATHLETE']).optional(),
  customBmrKcal: z.number().int().min(500).max(5000).optional().nullable(),
  showMacroTargets: z.boolean().optional(),
  showHydration: z.boolean().optional(),
})

type GoalFormData = z.infer<typeof goalSchema>

const GOAL_TYPES = [
  {
    value: 'WEIGHT_LOSS',
    labelKey: 'goalTypes.weightLoss.label',
    descriptionKey: 'goalTypes.weightLoss.description',
    icon: TrendingDown,
    color: 'text-blue-600',
  },
  {
    value: 'WEIGHT_GAIN',
    labelKey: 'goalTypes.weightGain.label',
    descriptionKey: 'goalTypes.weightGain.description',
    icon: TrendingUp,
    color: 'text-green-600',
  },
  {
    value: 'MAINTAIN',
    labelKey: 'goalTypes.maintain.label',
    descriptionKey: 'goalTypes.maintain.description',
    icon: Minus,
    color: 'text-slate-600',
  },
  {
    value: 'BODY_RECOMP',
    labelKey: 'goalTypes.bodyRecomp.label',
    descriptionKey: 'goalTypes.bodyRecomp.description',
    icon: Sparkles,
    color: 'text-purple-600',
  },
]

const MACRO_PROFILES = [
  { value: 'BALANCED', labelKey: 'macroProfiles.balanced.label', descriptionKey: 'macroProfiles.balanced.description' },
  { value: 'HIGH_PROTEIN', labelKey: 'macroProfiles.highProtein.label', descriptionKey: 'macroProfiles.highProtein.description' },
  { value: 'LOW_CARB', labelKey: 'macroProfiles.lowCarb.label', descriptionKey: 'macroProfiles.lowCarb.description' },
  { value: 'ENDURANCE', labelKey: 'macroProfiles.endurance.label', descriptionKey: 'macroProfiles.endurance.description' },
  { value: 'STRENGTH', labelKey: 'macroProfiles.strength.label', descriptionKey: 'macroProfiles.strength.description' },
]

// NOTE: the previous "Aktivitetsnivå" picker (SEDENTARY → ATHLETE) was
// removed from this form because it overlapped visually with the new
// "Livsstil & vardagsaktivitet" selector that drives the daily dashboard
// targets. The DB column NutritionGoal.activityLevel still exists (read by
// the AI nutrition plan generator); existing values are preserved. New
// athletes get the schema default until we migrate that path to read
// SportProfile.lifestyleActivity.

interface NutritionGoalFormProps {
  initialData?: GoalFormData | null
  currentWeightKg?: number
  onSuccess?: () => void
}

export function NutritionGoalForm({ initialData, currentWeightKg, onSuccess }: NutritionGoalFormProps) {
  const t = useTranslations('components.nutritionGoalForm')
  const { toast } = useToast()
  const router = useRouter()
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
      customBmrKcal: initialData?.customBmrKcal || undefined,
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
        const errorData = await response.json().catch(() => null)
        console.error('Failed to save goals:', response.status, errorData)
        throw new Error(errorData?.error || t('errors.saveGoals'))
      }

      toast({
        title: t('toast.saved.title'),
        description: t('toast.saved.description'),
      })

      router.refresh()
      onSuccess?.()
    } catch (error) {
      console.error('Save goals error:', error)
      toast({
        title: t('toast.error.title'),
        description: error instanceof Error ? error.message : t('toast.error.description'),
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
            <CardTitle className="text-base">{t('goal.title')}</CardTitle>
            <CardDescription>{t('goal.description')}</CardDescription>
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
                                    <span className="font-medium text-sm">{t(goal.labelKey)}</span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {t(goal.descriptionKey)}
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
              <CardTitle className="text-base">{t('weightTarget.title')}</CardTitle>
              <CardDescription>{t('weightTarget.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="targetWeightKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('weightTarget.targetWeightLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder={t('weightTarget.targetWeightPlaceholder')}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    {currentWeightKg && field.value && (
                      <FormDescription>
                        {Math.abs(field.value - currentWeightKg).toFixed(1)} kg{' '}
                        {field.value < currentWeightKg ? t('weightTarget.toLose') : t('weightTarget.toGain')}
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
                    <FormLabel>{t('weightTarget.weeklyRateLabel')}</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(parseFloat(v))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('weightTarget.weeklyRatePlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0.25">{t('weightTarget.rates.slow')}</SelectItem>
                        <SelectItem value="0.5">{t('weightTarget.rates.recommended')}</SelectItem>
                        <SelectItem value="0.75">{t('weightTarget.rates.faster')}</SelectItem>
                        <SelectItem value="1">{t('weightTarget.rates.aggressive')}</SelectItem>
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
              <CardTitle className="text-base">{t('bodyFatTarget.title')}</CardTitle>
              <CardDescription>{t('bodyFatTarget.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="targetBodyFatPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('bodyFatTarget.label')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.5"
                        placeholder={t('bodyFatTarget.placeholder')}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('bodyFatTarget.typicalValues')}
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
            <CardTitle className="text-base">{t('macroProfile.title')}</CardTitle>
            <CardDescription>{t('macroProfile.description')}</CardDescription>
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
                        <SelectValue placeholder={t('macroProfile.placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MACRO_PROFILES.map((profile) => (
                        <SelectItem key={profile.value} value={profile.value}>
                          <div className="flex flex-col">
                            <span>{t(profile.labelKey)}</span>
                            <span className="text-xs text-slate-500">{t(profile.descriptionKey)}</span>
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

        {/* Custom BMR */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              {t('bmr.title')}
            </CardTitle>
            <CardDescription>
              {t('bmr.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="customBmrKcal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('bmr.label')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      placeholder={t('bmr.placeholder')}
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('bmr.helper')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Display Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('displayPreferences.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="showMacroTargets"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">{t('displayPreferences.showMacroTargets.label')}</FormLabel>
                    <FormDescription className="text-xs">
                      {t('displayPreferences.showMacroTargets.description')}
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
                    <FormLabel className="text-sm">{t('displayPreferences.showHydration.label')}</FormLabel>
                    <FormDescription className="text-xs">
                      {t('displayPreferences.showHydration.description')}
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
              {t('actions.saving')}
            </>
          ) : (
            t('actions.saveGoals')
          )}
        </Button>
      </form>
    </Form>
  )
}
