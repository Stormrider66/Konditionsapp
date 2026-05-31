'use client'

/**
 * Intensity Targets Editor
 *
 * Allows athletes to customize their training intensity distribution targets.
 * Features:
 * - Three sliders for easy/moderate/hard percentages (must sum to 100%)
 * - Methodology preset dropdown (Polarized, Threshold-Focused, etc.)
 * - Reset to sport defaults button
 * - Live preview pie chart
 */

import { useState, useEffect } from 'react'
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
import { Target, RotateCcw, Save, Zap, Loader2 } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { SportType, IntensityTargets, IntensityMethodology } from '@/types'
import {
  getDefaultTargetsForSport,
  METHODOLOGY_PRESETS,
  validateTargets,
  normalizeTargets,
} from '@/lib/training/intensity-targets'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'

interface IntensityTargetsEditorProps {
  /** The sport type this editor is for */
  sport: SportType
  /** Current custom targets (if any) */
  currentTargets?: IntensityTargets | null
  /** Callback when targets are saved */
  onSave: (targets: IntensityTargets) => Promise<void>
  /** UI variant */
  variant?: 'default' | 'glass'
  /** Client ID for saving */
  clientId: string
}

const INTENSITY_COLORS = {
  easy: '#10B981',    // Green
  moderate: '#F59E0B', // Yellow
  hard: '#EF4444',    // Red
}

const METHODOLOGY_OPTIONS: { value: IntensityMethodology; labelKey: string; descriptionKey: string }[] = [
  { value: 'POLARIZED', labelKey: 'methodology.polarized.label', descriptionKey: 'methodology.polarized.description' },
  { value: 'THRESHOLD_FOCUSED', labelKey: 'methodology.thresholdFocused.label', descriptionKey: 'methodology.thresholdFocused.description' },
  { value: 'PYRAMIDAL', labelKey: 'methodology.pyramidal.label', descriptionKey: 'methodology.pyramidal.description' },
  { value: 'HIGH_INTENSITY', labelKey: 'methodology.highIntensity.label', descriptionKey: 'methodology.highIntensity.description' },
  { value: 'BALANCED', labelKey: 'methodology.balanced.label', descriptionKey: 'methodology.balanced.description' },
  { value: 'CUSTOM', labelKey: 'methodology.custom.label', descriptionKey: 'methodology.custom.description' },
]

function PreviewPieChart({ targets }: { targets: IntensityTargets }) {
  const t = useTranslations('components.intensityTargetsEditor')
  const data = [
    { name: t('chart.easy'), value: targets.easyPercent, color: INTENSITY_COLORS.easy },
    { name: t('chart.moderate'), value: targets.moderatePercent, color: INTENSITY_COLORS.moderate },
    { name: t('chart.hard'), value: targets.hardPercent, color: INTENSITY_COLORS.hard },
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

export function IntensityTargetsEditor({
  sport,
  currentTargets,
  onSave,
  variant = 'default',
  clientId: _clientId,
}: IntensityTargetsEditorProps) {
  const t = useTranslations('components.intensityTargetsEditor')
  const defaults = getDefaultTargetsForSport(sport)

  const [targets, setTargets] = useState<IntensityTargets>(
    currentTargets || defaults
  )
  const [selectedMethodology, setSelectedMethodology] = useState<IntensityMethodology>(
    currentTargets?.methodology || defaults.methodology || 'CUSTOM'
  )
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Track if current targets differ from saved
  useEffect(() => {
    const saved = currentTargets || defaults
    const changed =
      targets.easyPercent !== saved.easyPercent ||
      targets.moderatePercent !== saved.moderatePercent ||
      targets.hardPercent !== saved.hardPercent
    setHasChanges(changed)
  }, [targets, currentTargets, defaults])

  // When methodology changes, apply preset
  function handleMethodologyChange(methodology: IntensityMethodology) {
    setSelectedMethodology(methodology)
    if (methodology !== 'CUSTOM') {
      const preset = METHODOLOGY_PRESETS[methodology]
      setTargets({
        ...preset,
        methodology,
      })
    } else {
      setTargets(prev => ({
        ...prev,
        methodology: 'CUSTOM',
        label: 'CUSTOM',
      }))
    }
  }

  // Update a single value and adjust others to maintain sum = 100
  function handleSliderChange(field: 'easyPercent' | 'moderatePercent' | 'hardPercent', value: number) {
    const newTargets = { ...targets, [field]: value }

    // Redistribute remaining percentage among other fields
    const sum = newTargets.easyPercent + newTargets.moderatePercent + newTargets.hardPercent
    const diff = 100 - sum

    if (diff !== 0) {
      // Distribute the difference to the other two fields proportionally
      const fields = ['easyPercent', 'moderatePercent', 'hardPercent'] as const
      const otherFields = fields.filter(f => f !== field)
      const otherSum = otherFields.reduce((acc, f) => acc + newTargets[f], 0)

      if (otherSum > 0) {
        otherFields.forEach(f => {
          const proportion = newTargets[f] / otherSum
          newTargets[f] = Math.max(0, Math.round(newTargets[f] + diff * proportion))
        })
      } else {
        // If other fields are 0, split equally
        otherFields.forEach(f => {
          newTargets[f] = Math.max(0, Math.round(diff / 2))
        })
      }

      // Ensure sum is exactly 100 (handle rounding errors)
      const finalSum = newTargets.easyPercent + newTargets.moderatePercent + newTargets.hardPercent
      if (finalSum !== 100) {
        newTargets[otherFields[0]] += 100 - finalSum
      }
    }

    // Mark as custom when manually adjusted
    if (selectedMethodology !== 'CUSTOM') {
      setSelectedMethodology('CUSTOM')
      newTargets.methodology = 'CUSTOM'
      newTargets.label = 'CUSTOM'
    }

    setTargets(newTargets)
  }

  function handleReset() {
    setTargets(defaults)
    setSelectedMethodology(defaults.methodology || 'POLARIZED')
  }

  async function handleSave() {
    if (!validateTargets(targets)) {
      const normalized = normalizeTargets(targets)
      setTargets(normalized)
    }

    setIsSaving(true)
    try {
      await onSave({
        ...targets,
        methodology: selectedMethodology,
        label: selectedMethodology === 'CUSTOM'
          ? `${targets.easyPercent}/${targets.moderatePercent}/${targets.hardPercent}`
          : selectedMethodologyLabel,
      })
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save intensity targets:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const CardComponent = variant === 'glass' ? GlassCard : Card
  const CardHeaderComponent = variant === 'glass' ? GlassCardHeader : CardHeader
  const CardTitleComponent = variant === 'glass' ? GlassCardTitle : CardTitle
  const CardContentComponent = variant === 'glass' ? GlassCardContent : CardContent
  const selectedMethodologyOption = METHODOLOGY_OPTIONS.find(o => o.value === selectedMethodology)
  const selectedMethodologyLabel = selectedMethodologyOption
    ? t(selectedMethodologyOption.labelKey)
    : targets.label || `${targets.easyPercent}/${targets.moderatePercent}/${targets.hardPercent}`
  const defaultMethodologyOption = METHODOLOGY_OPTIONS.find(o => o.value === (defaults.methodology || 'POLARIZED'))
  const defaultMethodologyLabel = defaultMethodologyOption
    ? t(defaultMethodologyOption.labelKey)
    : defaults.label || `${defaults.easyPercent}/${defaults.moderatePercent}/${defaults.hardPercent}`

  return (
    <CardComponent>
      <CardHeaderComponent>
        <div className="flex items-center justify-between">
          <CardTitleComponent className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-orange-500" />
            {t('title')}
          </CardTitleComponent>
          {hasChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              {t('unsavedChanges')}
            </Badge>
          )}
        </div>
      </CardHeaderComponent>
      <CardContentComponent className="space-y-6">
        {/* Methodology Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('methodologyLabel')}
          </label>
          <Select value={selectedMethodology} onValueChange={handleMethodologyChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('methodologyPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {METHODOLOGY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span>{t(option.labelKey)}</span>
                    <span className="text-xs text-muted-foreground">{t(option.descriptionKey)}</span>
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
            <PreviewPieChart targets={targets} />
            <p className="text-center text-xs text-muted-foreground mt-2">
              {t('preview')}
            </p>
          </div>

          {/* Sliders */}
          <div className="flex-1 space-y-4">
            {/* Easy (Zone 1-2) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">{t('intensity.easy.title')}</span>
                </div>
                <span className="text-sm font-mono font-bold text-green-600">
                  {targets.easyPercent}%
                </span>
              </div>
              <Slider
                value={[targets.easyPercent]}
                onValueChange={([value]) => handleSliderChange('easyPercent', value)}
                max={100}
                step={5}
                className={cn(
                  "[&_[role=slider]]:bg-green-500",
                  "[&_[role=slider]]:border-green-600",
                  "[&_.range]:bg-green-500"
                )}
              />
              <p className="text-[10px] text-muted-foreground">
                {t('intensity.easy.description')}
              </p>
            </div>

            {/* Moderate (Zone 3) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-sm font-medium">{t('intensity.moderate.title')}</span>
                </div>
                <span className="text-sm font-mono font-bold text-yellow-600">
                  {targets.moderatePercent}%
                </span>
              </div>
              <Slider
                value={[targets.moderatePercent]}
                onValueChange={([value]) => handleSliderChange('moderatePercent', value)}
                max={100}
                step={5}
                className={cn(
                  "[&_[role=slider]]:bg-yellow-500",
                  "[&_[role=slider]]:border-yellow-600",
                  "[&_.range]:bg-yellow-500"
                )}
              />
              <p className="text-[10px] text-muted-foreground">
                {t('intensity.moderate.description')}
              </p>
            </div>

            {/* Hard (Zone 4-5) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm font-medium">{t('intensity.hard.title')}</span>
                </div>
                <span className="text-sm font-mono font-bold text-red-600">
                  {targets.hardPercent}%
                </span>
              </div>
              <Slider
                value={[targets.hardPercent]}
                onValueChange={([value]) => handleSliderChange('hardPercent', value)}
                max={100}
                step={5}
                className={cn(
                  "[&_[role=slider]]:bg-red-500",
                  "[&_[role=slider]]:border-red-600",
                  "[&_.range]:bg-red-500"
                )}
              />
              <p className="text-[10px] text-muted-foreground">
                {t('intensity.hard.description')}
              </p>
            </div>
          </div>
        </div>

        {/* Current Label Display */}
        <div className="flex items-center justify-center gap-2 py-2 bg-muted/30 rounded-lg">
          <Zap className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium">
            {selectedMethodology !== 'CUSTOM'
              ? selectedMethodologyLabel
              : `${targets.easyPercent}/${targets.moderatePercent}/${targets.hardPercent}`}
          </span>
          {selectedMethodology !== 'CUSTOM' && (
            <Badge variant="outline" className="text-xs">
              {selectedMethodologyLabel}
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
            {t('actions.reset', { label: defaultMethodologyLabel })}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {t('actions.save')}
          </Button>
        </div>
      </CardContentComponent>
    </CardComponent>
  )
}
