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
import { Loader2, X, Plus } from 'lucide-react'

const preferencesSchema = z.object({
  dietaryStyle: z.enum(['OMNIVORE', 'VEGETARIAN', 'VEGAN', 'PESCATARIAN', 'FLEXITARIAN']).optional().nullable(),
  allergies: z.array(z.string()).optional(),
  intolerances: z.array(z.string()).optional(),
  dislikedFoods: z.array(z.string()).optional(),
  preferLowFODMAP: z.boolean().optional(),
  preferWholeGrain: z.boolean().optional(),
  preferSwedishFoods: z.boolean().optional(),
})

type PreferencesFormData = z.infer<typeof preferencesSchema>

const DIETARY_STYLES = [
  { value: 'OMNIVORE', label: 'Allätare', description: 'Äter allt' },
  { value: 'FLEXITARIAN', label: 'Flexitarian', description: 'Mestadels vegetariskt' },
  { value: 'PESCATARIAN', label: 'Pescetarian', description: 'Vegetarisk + fisk' },
  { value: 'VEGETARIAN', label: 'Vegetarian', description: 'Ingen kött eller fisk' },
  { value: 'VEGAN', label: 'Vegan', description: 'Endast växtbaserat' },
]

const COMMON_ALLERGIES = [
  'Nötter',
  'Jordnötter',
  'Skaldjur',
  'Fisk',
  'Ägg',
  'Mjölk',
  'Vete/Gluten',
  'Soja',
  'Selleri',
  'Senap',
  'Sesam',
]

const COMMON_INTOLERANCES = [
  'Laktos',
  'Fruktos',
  'Histamin',
  'Gluten (ej allergi)',
]

interface DietaryPreferencesFormProps {
  initialData?: PreferencesFormData | null
  onSuccess?: () => void
}

export function DietaryPreferencesForm({ initialData, onSuccess }: DietaryPreferencesFormProps) {
  const { toast } = useToast()
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
        throw new Error('Kunde inte spara preferenser')
      }

      toast({
        title: 'Sparat',
        description: 'Dina kostpreferenser har uppdaterats.',
      })

      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Fel',
        description: 'Kunde inte spara preferenser. Försök igen.',
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
            <CardTitle className="text-base">Koststil</CardTitle>
            <CardDescription>Välj din primära koststil</CardDescription>
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
                        <SelectValue placeholder="Välj koststil" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DIETARY_STYLES.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          <div className="flex flex-col">
                            <span>{style.label}</span>
                            <span className="text-xs text-slate-500">{style.description}</span>
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
            <CardTitle className="text-base">Allergier</CardTitle>
            <CardDescription>Välj alla som gäller dig</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGIES.map((allergy) => (
                <Badge
                  key={allergy}
                  variant={allergies.includes(allergy) ? 'default' : 'outline'}
                  className={`cursor-pointer transition-colors ${
                    allergies.includes(allergy)
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'hover:bg-slate-100'
                  }`}
                  onClick={() => toggleAllergy(allergy)}
                >
                  {allergy}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Intolerances */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Intoleranser</CardTitle>
            <CardDescription>Livsmedel som ger dig besvär (men inte är allergi)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {COMMON_INTOLERANCES.map((intolerance) => (
                <Badge
                  key={intolerance}
                  variant={intolerances.includes(intolerance) ? 'default' : 'outline'}
                  className={`cursor-pointer transition-colors ${
                    intolerances.includes(intolerance)
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'hover:bg-slate-100'
                  }`}
                  onClick={() => toggleIntolerance(intolerance)}
                >
                  {intolerance}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Disliked Foods */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ogillade livsmedel</CardTitle>
            <CardDescription>Livsmedel du inte vill ha förslag på</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="T.ex. havregrynsgröt"
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
            <CardTitle className="text-base">Specialpreferenser</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="preferLowFODMAP"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">Låg-FODMAP</FormLabel>
                    <FormDescription className="text-xs">
                      Undvik livsmedel med hög FODMAP (vid IBS)
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
                    <FormLabel className="text-sm">Föredra fullkorn</FormLabel>
                    <FormDescription className="text-xs">
                      Prioritera fullkornsprodukter i förslag
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
                    <FormLabel className="text-sm">Svenska livsmedel</FormLabel>
                    <FormDescription className="text-xs">
                      Prioritera svenska/nordiska livsmedel
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
            'Spara preferenser'
          )}
        </Button>
      </form>
    </Form>
  )
}
