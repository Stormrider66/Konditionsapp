/**
 * Dietary Preferences Form
 *
 * Form for managing athlete dietary preferences including:
 * - Dietary style (omnivore, vegetarian, vegan, etc.)
 * - Allergies and intolerances
 * - Disliked foods
 * - Special preferences (low FODMAP, whole grain, Swedish foods)
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
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Loader2, X, Plus } from 'lucide-react'
import { useTranslations } from '@/i18n/client'

const preferencesSchema = z.object({
  dietaryStyle: z.enum(['OMNIVORE', 'VEGETARIAN', 'VEGAN', 'PESCATARIAN', 'FLEXITARIAN']).optional().nullable(),
  allergies: z.array(z.string()).optional(),
  intolerances: z.array(z.string()).optional(),
  dislikedFoods: z.array(z.string()).optional(),
  preferLowFODMAP: z.boolean().optional(),
  preferWholeGrain: z.boolean().optional(),
  preferSwedishFoods: z.boolean().optional(),
  enhancedMacroAnalysis: z.boolean().optional(),
  memoryEnabled: z.boolean().optional(),
})

type PreferencesFormData = z.infer<typeof preferencesSchema>

const DIETARY_STYLES = [
  { value: 'OMNIVORE', labelKey: 'dietaryStyles.omnivore.label', descriptionKey: 'dietaryStyles.omnivore.description' },
  { value: 'FLEXITARIAN', labelKey: 'dietaryStyles.flexitarian.label', descriptionKey: 'dietaryStyles.flexitarian.description' },
  { value: 'PESCATARIAN', labelKey: 'dietaryStyles.pescatarian.label', descriptionKey: 'dietaryStyles.pescatarian.description' },
  { value: 'VEGETARIAN', labelKey: 'dietaryStyles.vegetarian.label', descriptionKey: 'dietaryStyles.vegetarian.description' },
  { value: 'VEGAN', labelKey: 'dietaryStyles.vegan.label', descriptionKey: 'dietaryStyles.vegan.description' },
]

const COMMON_ALLERGIES = [
  { value: 'Nötter', labelKey: 'allergyOptions.nuts' },
  { value: 'Jordnötter', labelKey: 'allergyOptions.peanuts' },
  { value: 'Skaldjur', labelKey: 'allergyOptions.shellfish' },
  { value: 'Fisk', labelKey: 'allergyOptions.fish' },
  { value: 'Ägg', labelKey: 'allergyOptions.eggs' },
  { value: 'Mjölk', labelKey: 'allergyOptions.milk' },
  { value: 'Vete/Gluten', labelKey: 'allergyOptions.wheatGluten' },
  { value: 'Soja', labelKey: 'allergyOptions.soy' },
  { value: 'Selleri', labelKey: 'allergyOptions.celery' },
  { value: 'Senap', labelKey: 'allergyOptions.mustard' },
  { value: 'Sesam', labelKey: 'allergyOptions.sesame' },
]

const COMMON_INTOLERANCES = [
  { value: 'Laktos', labelKey: 'intoleranceOptions.lactose' },
  { value: 'Fruktos', labelKey: 'intoleranceOptions.fructose' },
  { value: 'Histamin', labelKey: 'intoleranceOptions.histamine' },
  { value: 'Gluten (ej allergi)', labelKey: 'intoleranceOptions.glutenNonAllergy' },
]

interface DietaryPreferencesFormProps {
  initialData?: PreferencesFormData | null
  onSuccess?: () => void
}

export function DietaryPreferencesForm({ initialData, onSuccess }: DietaryPreferencesFormProps) {
  const t = useTranslations('components.dietaryPreferencesForm')
  const { toast } = useToast()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newDislikedFood, setNewDislikedFood] = useState('')

  const form = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      dietaryStyle: initialData?.dietaryStyle || undefined,
      allergies: initialData?.allergies || [],
      intolerances: initialData?.intolerances || [],
      dislikedFoods: initialData?.dislikedFoods || [],
      preferLowFODMAP: initialData?.preferLowFODMAP || false,
      preferWholeGrain: initialData?.preferWholeGrain ?? true,
      preferSwedishFoods: initialData?.preferSwedishFoods ?? true,
      enhancedMacroAnalysis: initialData?.enhancedMacroAnalysis ?? false,
      memoryEnabled: initialData?.memoryEnabled ?? true,
    },
  })

  const allergies = form.watch('allergies') || []
  const intolerances = form.watch('intolerances') || []
  const dislikedFoods = form.watch('dislikedFoods') || []

  const toggleAllergy = (allergy: string) => {
    const current = form.getValues('allergies') || []
    if (current.includes(allergy)) {
      form.setValue('allergies', current.filter((a) => a !== allergy))
    } else {
      form.setValue('allergies', [...current, allergy])
    }
  }

  const toggleIntolerance = (intolerance: string) => {
    const current = form.getValues('intolerances') || []
    if (current.includes(intolerance)) {
      form.setValue('intolerances', current.filter((i) => i !== intolerance))
    } else {
      form.setValue('intolerances', [...current, intolerance])
    }
  }

  const addDislikedFood = () => {
    if (newDislikedFood.trim()) {
      const current = form.getValues('dislikedFoods') || []
      if (!current.includes(newDislikedFood.trim())) {
        form.setValue('dislikedFoods', [...current, newDislikedFood.trim()])
      }
      setNewDislikedFood('')
    }
  }

  const removeDislikedFood = (food: string) => {
    const current = form.getValues('dislikedFoods') || []
    form.setValue('dislikedFoods', current.filter((f) => f !== food))
  }

  async function onSubmit(data: PreferencesFormData) {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/nutrition/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error('Failed to save preferences:', response.status, errorData)
        throw new Error(errorData?.error || t('errors.savePreferences'))
      }

      toast({
        title: t('toast.saved.title'),
        description: t('toast.saved.description'),
      })

      router.refresh()
      onSuccess?.()
    } catch (error) {
      console.error('Save preferences error:', error)
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
        {/* Dietary Style */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dietaryStyle.title')}</CardTitle>
            <CardDescription>{t('dietaryStyle.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="dietaryStyle"
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('dietaryStyle.placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DIETARY_STYLES.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          <div className="flex flex-col">
                            <span>{t(style.labelKey)}</span>
                            <span className="text-xs text-slate-500">{t(style.descriptionKey)}</span>
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

        {/* Allergies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('allergies.title')}</CardTitle>
            <CardDescription>{t('allergies.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGIES.map((allergy) => (
                <Badge
                  key={allergy.value}
                  variant={allergies.includes(allergy.value) ? 'default' : 'outline'}
                  className={`cursor-pointer transition-colors ${
                    allergies.includes(allergy.value)
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'hover:bg-slate-100'
                  }`}
                  onClick={() => toggleAllergy(allergy.value)}
                >
                  {t(allergy.labelKey)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Intolerances */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('intolerances.title')}</CardTitle>
            <CardDescription>{t('intolerances.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {COMMON_INTOLERANCES.map((intolerance) => (
                <Badge
                  key={intolerance.value}
                  variant={intolerances.includes(intolerance.value) ? 'default' : 'outline'}
                  className={`cursor-pointer transition-colors ${
                    intolerances.includes(intolerance.value)
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'hover:bg-slate-100'
                  }`}
                  onClick={() => toggleIntolerance(intolerance.value)}
                >
                  {t(intolerance.labelKey)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Disliked Foods */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dislikedFoods.title')}</CardTitle>
            <CardDescription>{t('dislikedFoods.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder={t('dislikedFoods.placeholder')}
                value={newDislikedFood}
                onChange={(e) => setNewDislikedFood(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addDislikedFood()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addDislikedFood}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {dislikedFoods.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {dislikedFoods.map((food) => (
                  <Badge key={food} variant="secondary" className="gap-1">
                    {food}
                    <button
                      type="button"
                      onClick={() => removeDislikedFood(food)}
                      className="ml-1 hover:text-red-600"
                      aria-label={t('dislikedFoods.removeAria', { food })}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Special Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('specialPreferences.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="preferLowFODMAP"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">{t('specialPreferences.lowFodmap.label')}</FormLabel>
                    <FormDescription className="text-xs">
                      {t('specialPreferences.lowFodmap.description')}
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
              name="preferWholeGrain"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">{t('specialPreferences.wholeGrain.label')}</FormLabel>
                    <FormDescription className="text-xs">
                      {t('specialPreferences.wholeGrain.description')}
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
              name="preferSwedishFoods"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">{t('specialPreferences.swedishFoods.label')}</FormLabel>
                    <FormDescription className="text-xs">
                      {t('specialPreferences.swedishFoods.description')}
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
              name="enhancedMacroAnalysis"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">{t('specialPreferences.enhancedMacroAnalysis.label')}</FormLabel>
                    <FormDescription className="text-xs">
                      {t('specialPreferences.enhancedMacroAnalysis.description')}
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
              name="memoryEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">{t('specialPreferences.memoryEnabled.label')}</FormLabel>
                    <FormDescription className="text-xs">
                      {t('specialPreferences.memoryEnabled.description')}
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
            t('actions.savePreferences')
          )}
        </Button>
      </form>
    </Form>
  )
}
