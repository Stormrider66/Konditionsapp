'use client'

/**
 * Macro Split Editor
 *
 * Allows athletes to customize their macro distribution (protein/carbs/fat percentages).
 * Features:
 * - Three sliders that auto-normalize to 100%
 * - Preset dropdown (Balanced, High Protein, etc.)
 * - Live pie chart preview
 * - g/kg readout for each macro
 * - Save/Reset buttons with toast feedback
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RotateCcw, Save, Loader2, UtensilsCrossed } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface MacroSplitEditorProps {
  clientId: string
  variant?: 'default' | 'glass'
}

interface MacroValues {
  protein: number
  carbs: number
  fat: number
}

interface ClientData {
  weight: number | null
  height: number | null
  gender: string | null
  birthDate: string | null
}

type PresetKey = 'BALANCED' | 'HIGH_PROTEIN' | 'LOW_CARB' | 'ENDURANCE' | 'STRENGTH' | 'KETO' | 'CUSTOM'

const MACRO_PRESETS: Record<Exclude<PresetKey, 'CUSTOM'>, MacroValues> = {
  BALANCED: { protein: 25, carbs: 45, fat: 30 },
  HIGH_PROTEIN: { protein: 35, carbs: 40, fat: 25 },
  LOW_CARB: { protein: 30, carbs: 30, fat: 40 },
  ENDURANCE: { protein: 20, carbs: 55, fat: 25 },
  STRENGTH: { protein: 30, carbs: 45, fat: 25 },
  KETO: { protein: 25, carbs: 5, fat: 70 },
}

const PRESET_OPTIONS: { value: PresetKey; label: string; description: string }[] = [
  { value: 'BALANCED', label: 'Balanserad', description: '25/45/30 — Generell hälsa' },
  { value: 'HIGH_PROTEIN', label: 'Hög protein', description: '35/40/25 — Muskeluppbyggnad' },
  { value: 'LOW_CARB', label: 'Låg kolhydrat', description: '30/30/40 — Viktnedgång' },
  { value: 'ENDURANCE', label: 'Uthållighet', description: '20/55/25 — Konditionsidrott' },
  { value: 'STRENGTH', label: 'Styrka', description: '30/45/25 — Styrketräning' },
  { value: 'KETO', label: 'Keto', description: '25/5/70 — Ketogen kost' },
  { value: 'CUSTOM', label: 'Anpassad', description: 'Definiera din egen fördelning' },
]

const MACRO_COLORS = {
  protein: '#3B82F6',  // blue
  carbs: '#F59E0B',    // amber
  fat: '#F43F5E',      // rose
}

// Calories per gram
const CAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 }

function MacroPieChart({ values }: { values: MacroValues }) {
  const data = [
    { name: 'Protein', value: values.protein, color: MACRO_COLORS.protein },
    { name: 'Kolhydrater', value: values.carbs, color: MACRO_COLORS.carbs },
    { name: 'Fett', value: values.fat, color: MACRO_COLORS.fat },
  ].filter(d => d.value > 0)

  return (
    <div className="relative w-24 h-24 mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={28}
            outerRadius={44}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value}%`, name]}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium text-muted-foreground">
          100%
        </span>
      </div>
    </div>
  )
}

export function MacroSplitEditor({ clientId, variant = 'default' }: MacroSplitEditorProps) {
  const { toast } = useToast()

  const [values, setValues] = useState<MacroValues>({ protein: 25, carbs: 45, fat: 30 })
  const [savedValues, setSavedValues] = useState<MacroValues>({ protein: 25, carbs: 45, fat: 30 })
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('BALANCED')
  const [savedPreset, setSavedPreset] = useState<PresetKey>('BALANCED')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [targetCalories, setTargetCalories] = useState<number | null>(null)

  const hasChanges = values.protein !== savedValues.protein ||
    values.carbs !== savedValues.carbs ||
    values.fat !== savedValues.fat

  // Fetch current goals on mount
  useEffect(() => {
    async function fetchGoals() {
      try {
        const res = await fetch('/api/nutrition/goals')
        if (!res.ok) return
        const data = await res.json()

        if (data.clientData) {
          setClientData(data.clientData)
        }

        if (data.goal) {
          const goal = data.goal
          const profile = (goal.macroProfile || 'BALANCED') as PresetKey

          if (goal.customProteinPercent != null && goal.customCarbsPercent != null && goal.customFatPercent != null) {
            const loaded: MacroValues = {
              protein: Math.round(goal.customProteinPercent),
              carbs: Math.round(goal.customCarbsPercent),
              fat: Math.round(goal.customFatPercent),
            }
            setValues(loaded)
            setSavedValues(loaded)

            // Check if values match a preset
            const matchingPreset = detectPreset(loaded)
            setSelectedPreset(matchingPreset)
            setSavedPreset(matchingPreset)
          } else if (profile !== 'CUSTOM' && profile in MACRO_PRESETS) {
            const presetValues = MACRO_PRESETS[profile as Exclude<PresetKey, 'CUSTOM'>]
            setValues(presetValues)
            setSavedValues(presetValues)
            setSelectedPreset(profile)
            setSavedPreset(profile)
          }

          // Estimate target calories for g/kg display
          if (data.clientData?.weight && data.clientData?.height && data.clientData?.birthDate) {
            const weight = data.clientData.weight
            const height = data.clientData.height
            const birthDate = new Date(data.clientData.birthDate)
            const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            const gender = data.clientData.gender || 'MALE'

            // Mifflin-St Jeor BMR
            const base = (10 * weight) + (6.25 * height) - (5 * age)
            const bmr = gender === 'MALE' ? base + 5 : base - 161

            // Activity multiplier from goal or default
            const activityMultipliers: Record<string, number> = {
              SEDENTARY: 1.2, LIGHTLY_ACTIVE: 1.375, ACTIVE: 1.725,
              VERY_ACTIVE: 1.9, ATHLETE: 2.0,
            }
            const multiplier = activityMultipliers[goal.activityLevel || 'ACTIVE'] || 1.725
            setTargetCalories(Math.round(bmr * multiplier))
          }
        }
      } catch {
        // Silently fail — defaults are fine
      } finally {
        setIsLoading(false)
      }
    }
    fetchGoals()
  }, [])

  function detectPreset(v: MacroValues): PresetKey {
    for (const [key, preset] of Object.entries(MACRO_PRESETS)) {
      if (preset.protein === v.protein && preset.carbs === v.carbs && preset.fat === v.fat) {
        return key as PresetKey
      }
    }
    return 'CUSTOM'
  }

  function handlePresetChange(preset: PresetKey) {
    setSelectedPreset(preset)
    if (preset !== 'CUSTOM') {
      setValues(MACRO_PRESETS[preset])
    }
  }

  const handleSliderChange = useCallback((field: keyof MacroValues, value: number) => {
    setValues(prev => {
      const newValues = { ...prev, [field]: value }

      // Redistribute remaining percentage among other fields
      const fields: (keyof MacroValues)[] = ['protein', 'carbs', 'fat']
      const otherFields = fields.filter(f => f !== field)
      const sum = newValues.protein + newValues.carbs + newValues.fat
      const diff = 100 - sum

      if (diff !== 0) {
        const otherSum = otherFields.reduce((acc, f) => acc + newValues[f], 0)

        if (otherSum > 0) {
          otherFields.forEach(f => {
            const proportion = newValues[f] / otherSum
            newValues[f] = Math.max(0, Math.round(newValues[f] + diff * proportion))
          })
        } else {
          otherFields.forEach(f => {
            newValues[f] = Math.max(0, Math.round(diff / 2))
          })
        }

        // Fix rounding to ensure exactly 100%
        const finalSum = newValues.protein + newValues.carbs + newValues.fat
        if (finalSum !== 100) {
          newValues[otherFields[0]] += 100 - finalSum
        }
      }

      return newValues
    })

    // Auto-switch to custom when manually adjusted
    setSelectedPreset(prev => {
      if (prev !== 'CUSTOM') return 'CUSTOM'
      return prev
    })
  }, [])

  function handleReset() {
    setValues(savedValues)
    setSelectedPreset(savedPreset)
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      // First get current goal data so we don't overwrite other fields
      const getRes = await fetch('/api/nutrition/goals')
      const getData = await getRes.json()

      const currentGoal = getData.goal || {}

      const res = await fetch('/api/nutrition/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalType: currentGoal.goalType || 'MAINTAIN',
          targetWeightKg: currentGoal.targetWeightKg,
          weeklyChangeKg: currentGoal.weeklyChangeKg,
          targetDate: currentGoal.targetDate,
          targetBodyFatPercent: currentGoal.targetBodyFatPercent,
          macroProfile: selectedPreset,
          activityLevel: currentGoal.activityLevel || 'ACTIVE',
          customProteinPerKg: currentGoal.customProteinPerKg,
          customProteinPercent: values.protein,
          customCarbsPercent: values.carbs,
          customFatPercent: values.fat,
          showMacroTargets: currentGoal.showMacroTargets ?? true,
          showHydration: currentGoal.showHydration ?? true,
        }),
      })

      if (!res.ok) throw new Error('Failed to save')

      setSavedValues(values)
      setSavedPreset(selectedPreset)

      toast({
        title: 'Sparad!',
        description: 'Din makrofördelning har uppdaterats.',
      })
    } catch {
      toast({
        title: 'Fel',
        description: 'Kunde inte spara makrofördelningen. Försök igen.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate g/kg for display
  function getGramsPerKg(percent: number, calPerGram: number): string | null {
    if (!clientData?.weight || !targetCalories) return null
    const grams = (targetCalories * percent / 100) / calPerGram
    const perKg = grams / clientData.weight
    return perKg.toFixed(1)
  }

  const CardComponent = variant === 'glass' ? GlassCard : Card
  const CardHeaderComponent = variant === 'glass' ? GlassCardHeader : CardHeader
  const CardTitleComponent = variant === 'glass' ? GlassCardTitle : CardTitle
  const CardContentComponent = variant === 'glass' ? GlassCardContent : CardContent

  if (isLoading) {
    return (
      <CardComponent>
        <CardContentComponent className="flex items-center justify-center p-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContentComponent>
      </CardComponent>
    )
  }

  return (
    <CardComponent>
      <CardHeaderComponent>
        <div className="flex items-center justify-between">
          <CardTitleComponent className="flex items-center gap-2 text-base">
            <UtensilsCrossed className="h-4 w-4 text-emerald-500" />
            Makrofördelning
          </CardTitleComponent>
          {hasChanges && (
            <Badge variant="outline" className="text-emerald-600 border-emerald-300">
              Osparade ändringar
            </Badge>
          )}
        </div>
      </CardHeaderComponent>
      <CardContentComponent className="space-y-6">
        {/* Preset Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Kostprofil
          </label>
          <Select value={selectedPreset} onValueChange={(v) => handlePresetChange(v as PresetKey)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Välj profil" />
            </SelectTrigger>
            <SelectContent>
              {PRESET_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preview and Sliders */}
        <div className="flex gap-6">
          {/* Pie Chart Preview */}
          <div className="flex-shrink-0">
            <MacroPieChart values={values} />
            <p className="text-center text-xs text-muted-foreground mt-2">
              Förhandsvisning
            </p>
          </div>

          {/* Sliders */}
          <div className="flex-1 space-y-4">
            {/* Protein */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MACRO_COLORS.protein }} />
                  <span className="text-sm font-medium">Protein</span>
                </div>
                <span className="text-sm font-mono font-bold text-blue-600">
                  {values.protein}%
                </span>
              </div>
              <Slider
                value={[values.protein]}
                onValueChange={([v]) => handleSliderChange('protein', v)}
                max={100}
                step={5}
                className={cn(
                  "[&_[role=slider]]:bg-blue-500",
                  "[&_[role=slider]]:border-blue-600",
                  "[&_.range]:bg-blue-500"
                )}
              />
              {getGramsPerKg(values.protein, CAL_PER_GRAM.protein) && (
                <p className="text-[10px] text-muted-foreground">
                  {getGramsPerKg(values.protein, CAL_PER_GRAM.protein)} g/kg kroppsvikt
                </p>
              )}
            </div>

            {/* Carbs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MACRO_COLORS.carbs }} />
                  <span className="text-sm font-medium">Kolhydrater</span>
                </div>
                <span className="text-sm font-mono font-bold text-amber-600">
                  {values.carbs}%
                </span>
              </div>
              <Slider
                value={[values.carbs]}
                onValueChange={([v]) => handleSliderChange('carbs', v)}
                max={100}
                step={5}
                className={cn(
                  "[&_[role=slider]]:bg-amber-500",
                  "[&_[role=slider]]:border-amber-600",
                  "[&_.range]:bg-amber-500"
                )}
              />
              {getGramsPerKg(values.carbs, CAL_PER_GRAM.carbs) && (
                <p className="text-[10px] text-muted-foreground">
                  {getGramsPerKg(values.carbs, CAL_PER_GRAM.carbs)} g/kg kroppsvikt
                </p>
              )}
            </div>

            {/* Fat */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MACRO_COLORS.fat }} />
                  <span className="text-sm font-medium">Fett</span>
                </div>
                <span className="text-sm font-mono font-bold text-rose-600">
                  {values.fat}%
                </span>
              </div>
              <Slider
                value={[values.fat]}
                onValueChange={([v]) => handleSliderChange('fat', v)}
                max={100}
                step={5}
                className={cn(
                  "[&_[role=slider]]:bg-rose-500",
                  "[&_[role=slider]]:border-rose-600",
                  "[&_.range]:bg-rose-500"
                )}
              />
              {getGramsPerKg(values.fat, CAL_PER_GRAM.fat) && (
                <p className="text-[10px] text-muted-foreground">
                  {getGramsPerKg(values.fat, CAL_PER_GRAM.fat)} g/kg kroppsvikt
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Current Label Display */}
        <div className="flex items-center justify-center gap-2 py-2 bg-muted/30 rounded-lg">
          <UtensilsCrossed className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-medium">
            {values.protein}/{values.carbs}/{values.fat}
          </span>
          {selectedPreset !== 'CUSTOM' && (
            <Badge variant="outline" className="text-xs">
              {PRESET_OPTIONS.find(o => o.value === selectedPreset)?.label}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Återställ
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Spara
          </Button>
        </div>
      </CardContentComponent>
    </CardComponent>
  )
}
