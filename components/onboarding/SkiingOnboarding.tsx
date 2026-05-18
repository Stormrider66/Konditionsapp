'use client'

import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from 'next-intl'

// Skiing-specific options
const SKI_TECHNIQUES = [
  { id: 'classic', label: 'techniques.classic', icon: '⛷️' },
  { id: 'skating', label: 'techniques.skating', icon: '🎿' },
  { id: 'both', label: 'techniques.both', icon: '⛷️🎿' },
]

const SKIING_DISCIPLINES = [
  { id: 'distance', label: 'disciplines.distance' },
  { id: 'sprint', label: 'disciplines.sprint' },
  { id: 'skiathlon', label: 'disciplines.skiathlon' },
  { id: 'biathlon', label: 'disciplines.biathlon' },
  { id: 'recreational', label: 'disciplines.recreational' },
  { id: 'touring', label: 'disciplines.touring' },
  { id: 'orienteering', label: 'disciplines.orienteering' },
]

const TERRAIN_TYPES = [
  { id: 'flat', label: 'terrainTypes.flat' },
  { id: 'hilly', label: 'terrainTypes.hilly' },
  { id: 'mountainous', label: 'terrainTypes.mountainous' },
  { id: 'mixed', label: 'terrainTypes.mixed' },
]

const TRAINING_METHODS = [
  { id: 'on_snow', label: 'trainingMethods.onSnow', icon: '❄️' },
  { id: 'roller_ski', label: 'trainingMethods.rollerSki', icon: '🛼' },
  { id: 'ski_treadmill', label: 'trainingMethods.skiTreadmill', icon: '🏃' },
  { id: 'running', label: 'trainingMethods.running', icon: '🏃‍♂️' },
  { id: 'cycling', label: 'trainingMethods.cycling', icon: '🚴' },
  { id: 'strength', label: 'trainingMethods.strength', icon: '💪' },
]

export interface SkiingSettings {
  technique: string
  primaryDiscipline: string
  terrainPreference: string
  trainingMethods: string[]
  currentThresholdPace: number | null // min/km
  thresholdTestDate: string | null
  weeklyHours: number
  onSnowAccessMonths: number // months per year with snow access
  hasHeartRateMonitor: boolean
  hasPoleStraps: boolean // for technique
  weight: number | null
  targetRaces: string[]
}

interface SkiingOnboardingProps {
  value: SkiingSettings
  onChange: (settings: SkiingSettings) => void
  locale?: 'en' | 'sv'
}

export function SkiingOnboarding({
  value,
  onChange,
}: SkiingOnboardingProps) {
  const t = useTranslations('components.onboarding.skiing')

  const updateSettings = (updates: Partial<SkiingSettings>) => {
    onChange({ ...value, ...updates })
  }

  const toggleTrainingMethod = (methodId: string) => {
    const newMethods = value.trainingMethods.includes(methodId)
      ? value.trainingMethods.filter((m) => m !== methodId)
      : [...value.trainingMethods, methodId]
    updateSettings({ trainingMethods: newMethods })
  }

  return (
    <div className="space-y-8">
      {/* Ski Technique */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">
          {t('labels.technique')}
        </Label>
        <RadioGroup
          value={value.technique}
          onValueChange={(val) => updateSettings({ technique: val })}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {SKI_TECHNIQUES.map((tech) => (
            <Label
              key={tech.id}
              htmlFor={`tech-${tech.id}`}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors',
                value.technique === tech.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              )}
            >
              <RadioGroupItem value={tech.id} id={`tech-${tech.id}`} />
              <span className="text-2xl">{tech.icon}</span>
              <span className="font-medium">{t(tech.label)}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Primary Discipline */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">
          {t('labels.primaryDiscipline')}
        </Label>
        <RadioGroup
          value={value.primaryDiscipline}
          onValueChange={(val) => updateSettings({ primaryDiscipline: val })}
          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          {SKIING_DISCIPLINES.map((disc) => (
            <Label
              key={disc.id}
              htmlFor={`disc-${disc.id}`}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                value.primaryDiscipline === disc.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              )}
            >
              <RadioGroupItem value={disc.id} id={`disc-${disc.id}`} />
              <span className="text-sm">{t(disc.label)}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Terrain Preference */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">
          {t('labels.terrain')}
        </Label>
        <RadioGroup
          value={value.terrainPreference}
          onValueChange={(val) => updateSettings({ terrainPreference: val })}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {TERRAIN_TYPES.map((terrain) => (
            <Label
              key={terrain.id}
              htmlFor={`terrain-${terrain.id}`}
              className={cn(
                'flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors',
                value.terrainPreference === terrain.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              )}
            >
              <RadioGroupItem value={terrain.id} id={`terrain-${terrain.id}`} />
              <span className="text-sm">{t(terrain.label)}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Threshold Pace Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('titles.performanceData')}
          </CardTitle>
          <CardDescription>
            {t('descriptions.performanceData')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Threshold Pace Input */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('labels.thresholdPace')}</Label>
              <Input
                type="number"
                step="0.1"
                placeholder={t('placeholders.thresholdPace')}
                value={value.currentThresholdPace || ''}
                onChange={(e) =>
                  updateSettings({ currentThresholdPace: e.target.value ? parseFloat(e.target.value) : null })
                }
              />
              <p className="text-xs text-muted-foreground">
                {t('descriptions.thresholdPace')}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t('labels.lastThresholdTest')}</Label>
              <Input
                type="date"
                value={value.thresholdTestDate || ''}
                onChange={(e) => updateSettings({ thresholdTestDate: e.target.value || null })}
              />
            </div>
          </div>

          {/* Weight */}
          <div className="space-y-2">
            <Label>{t('labels.bodyWeight')}</Label>
            <Input
              type="number"
              placeholder={t('placeholders.bodyWeight')}
              className="max-w-[150px]"
              value={value.weight || ''}
              onChange={(e) =>
                updateSettings({ weight: e.target.value ? parseFloat(e.target.value) : null })
              }
            />
          </div>

          {/* HR Monitor */}
          <Label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={value.hasHeartRateMonitor}
              onCheckedChange={(checked) => updateSettings({ hasHeartRateMonitor: !!checked })}
            />
            <span>{t('labels.heartRateMonitor')}</span>
          </Label>
        </CardContent>
      </Card>

      {/* Training Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('titles.trainingSetup')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Training Methods */}
          <div className="space-y-2">
            <Label>{t('labels.trainingMethods')}</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TRAINING_METHODS.map((method) => (
                <Label
                  key={method.id}
                  htmlFor={`method-${method.id}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors text-sm',
                    value.trainingMethods.includes(method.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  )}
                >
                  <Checkbox
                    id={`method-${method.id}`}
                    checked={value.trainingMethods.includes(method.id)}
                    onCheckedChange={() => toggleTrainingMethod(method.id)}
                  />
                  <span className="text-lg">{method.icon}</span>
                  <span>{t(method.label)}</span>
              </Label>
            ))}
            </div>
          </div>

          {/* Weekly Hours */}
          <div className="space-y-2">
            <Label>{t('labels.weeklyHours')}</Label>
            <Input
              type="number"
              min={1}
              max={40}
              className="max-w-[150px]"
              value={value.weeklyHours}
              onChange={(e) => updateSettings({ weeklyHours: parseInt(e.target.value) || 6 })}
            />
          </div>

          {/* Snow Access */}
          <div className="space-y-2">
            <Label>
              {t('labels.onSnowAccessMonths')}: {value.onSnowAccessMonths} {t('units.months')}
            </Label>
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={value.onSnowAccessMonths}
              onChange={(e) => updateSettings({ onSnowAccessMonths: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('snowAccess.rollerOnly')}</span>
              <span>{t('snowAccess.yearRound')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Default skiing settings
export const DEFAULT_SKIING_SETTINGS: SkiingSettings = {
  technique: '',
  primaryDiscipline: '',
  terrainPreference: '',
  trainingMethods: [],
  currentThresholdPace: null,
  thresholdTestDate: null,
  weeklyHours: 6,
  onSnowAccessMonths: 5,
  hasHeartRateMonitor: false,
  hasPoleStraps: true,
  weight: null,
  targetRaces: [],
}
