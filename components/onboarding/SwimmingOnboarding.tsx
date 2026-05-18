'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'

// CSS-based swim zones (pace per 100m)
function calculateSwimZones(css: number) {
  return [
    { zone: 1, name: 'zones.recovery', pct: 125, color: 'bg-gray-200' },
    { zone: 2, name: 'zones.aerobic', pct: 115, color: 'bg-blue-200' },
    { zone: 3, name: 'zones.endurance', pct: 107, color: 'bg-green-200' },
    { zone: 4, name: 'zones.threshold', pct: 100, color: 'bg-yellow-200' },
    { zone: 5, name: 'zones.vo2max', pct: 92, color: 'bg-orange-200' },
    { zone: 6, name: 'zones.sprint', pct: 85, color: 'bg-red-200' },
  ].map(z => ({ ...z, pace: Math.round(css * (z.pct / 100)) }))
}

// Swimming-specific options
const STROKE_TYPES = [
  { id: 'freestyle', label: 'strokeTypes.freestyle', icon: '🏊' },
  { id: 'backstroke', label: 'strokeTypes.backstroke', icon: '🏊‍♂️' },
  { id: 'breaststroke', label: 'strokeTypes.breaststroke', icon: '🏊‍♀️' },
  { id: 'butterfly', label: 'strokeTypes.butterfly', icon: '🦋' },
  { id: 'im', label: 'strokeTypes.im', icon: '🔄' },
]

const SWIMMING_DISCIPLINES = [
  { id: 'pool_distance', label: 'disciplines.poolDistance' },
  { id: 'pool_sprint', label: 'disciplines.poolSprint' },
  { id: 'open_water', label: 'disciplines.openWater' },
  { id: 'triathlon', label: 'disciplines.triathlon' },
  { id: 'masters', label: 'disciplines.masters' },
  { id: 'recreational', label: 'disciplines.recreational' },
]

const POOL_LENGTHS = [
  { id: '25', label: 'poolLengths.shortCourse' },
  { id: '50', label: 'poolLengths.longCourse' },
]

const TRAINING_ENVIRONMENTS = [
  { id: 'pool_indoor', label: 'environments.indoorPool' },
  { id: 'pool_outdoor', label: 'environments.outdoorPool' },
  { id: 'lake', label: 'environments.lake' },
  { id: 'ocean', label: 'environments.ocean' },
  { id: 'endless_pool', label: 'environments.endlessPool' },
]

const EQUIPMENT = [
  { id: 'pull_buoy', label: 'equipment.pullBuoy' },
  { id: 'paddles', label: 'equipment.paddles' },
  { id: 'fins', label: 'equipment.fins' },
  { id: 'snorkel', label: 'equipment.snorkel' },
  { id: 'kickboard', label: 'equipment.kickboard' },
  { id: 'wetsuit', label: 'equipment.wetsuit' },
]

const SWIMMING_EXPERIENCE_OPTIONS = [
  { id: 'beginner', label: 'experience.beginner.label', description: 'experience.beginner.description' },
  { id: 'intermediate', label: 'experience.intermediate.label', description: 'experience.intermediate.description' },
  { id: 'advanced', label: 'experience.advanced.label', description: 'experience.advanced.description' },
  { id: 'elite', label: 'experience.elite.label', description: 'experience.elite.description' },
] as const

const OPEN_WATER_EXPERIENCE_OPTIONS = [
  { id: 'none', label: 'openWaterExperience.none' },
  { id: 'beginner', label: 'openWaterExperience.beginner' },
  { id: 'intermediate', label: 'openWaterExperience.intermediate' },
  { id: 'advanced', label: 'openWaterExperience.advanced' },
] as const

export interface SwimmingSettings {
  strokeTypes: string[]
  primaryStroke: string
  primaryDiscipline: string
  preferredPoolLength: string
  trainingEnvironments: string[]
  currentCss: number | null // Critical Swim Speed in seconds per 100m
  cssTestDate: string | null
  weeklySwimDistance: number // km per week
  weeklySwimSessions: number
  equipment: string[]
  hasHeartRateMonitor: boolean
  openWaterExperience: 'none' | 'beginner' | 'intermediate' | 'advanced'
  swimmingExperience: 'beginner' | 'intermediate' | 'advanced' | 'elite'
}

interface SwimmingOnboardingProps {
  value: SwimmingSettings
  onChange: (settings: SwimmingSettings) => void
  locale?: 'en' | 'sv'
}

// Helper to format CSS time (seconds to mm:ss)
function formatCssTime(seconds: number | null): string {
  if (!seconds) return ''
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Helper to parse CSS time (mm:ss to seconds)
function parseCssTime(timeStr: string): number | null {
  if (!timeStr) return null
  const parts = timeStr.split(':')
  if (parts.length === 2) {
    const mins = parseInt(parts[0]) || 0
    const secs = parseInt(parts[1]) || 0
    return mins * 60 + secs
  }
  return parseInt(timeStr) || null
}

export function SwimmingOnboarding({
  value,
  onChange,
}: SwimmingOnboardingProps) {
  const t = useTranslations('components.onboarding.swimming')
  const [cssInput, setCssInput] = useState(formatCssTime(value.currentCss))

  const updateSettings = (updates: Partial<SwimmingSettings>) => {
    onChange({ ...value, ...updates })
  }

  const toggleStroke = (strokeId: string) => {
    const newStrokes = value.strokeTypes.includes(strokeId)
      ? value.strokeTypes.filter((s) => s !== strokeId)
      : [...value.strokeTypes, strokeId]
    updateSettings({ strokeTypes: newStrokes })
  }

  const toggleEnvironment = (envId: string) => {
    const newEnvs = value.trainingEnvironments.includes(envId)
      ? value.trainingEnvironments.filter((e) => e !== envId)
      : [...value.trainingEnvironments, envId]
    updateSettings({ trainingEnvironments: newEnvs })
  }

  const toggleEquipment = (equipId: string) => {
    const newEquip = value.equipment.includes(equipId)
      ? value.equipment.filter((e) => e !== equipId)
      : [...value.equipment, equipId]
    updateSettings({ equipment: newEquip })
  }

  const handleCssChange = (timeStr: string) => {
    setCssInput(timeStr)
    const seconds = parseCssTime(timeStr)
    updateSettings({ currentCss: seconds })
  }

  return (
    <div className="space-y-8">
      {/* Experience Level */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">
          {t('labels.experience')}
        </Label>
        <RadioGroup
          value={value.swimmingExperience}
          onValueChange={(val) => updateSettings({ swimmingExperience: val as SwimmingSettings['swimmingExperience'] })}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {SWIMMING_EXPERIENCE_OPTIONS.map((exp) => (
            <Label
              key={exp.id}
              htmlFor={`exp-${exp.id}`}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border p-3 cursor-pointer transition-colors text-center',
                value.swimmingExperience === exp.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              )}
            >
              <RadioGroupItem value={exp.id} id={`exp-${exp.id}`} className="sr-only" />
              <span className="font-medium">{t(exp.label)}</span>
              <span className="text-xs text-muted-foreground">{t(exp.description)}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Stroke Types */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">
          {t('labels.strokes')}
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {STROKE_TYPES.map((stroke) => (
            <Label
              key={stroke.id}
              htmlFor={`stroke-${stroke.id}`}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                value.strokeTypes.includes(stroke.id)
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              )}
            >
              <Checkbox
                id={`stroke-${stroke.id}`}
                checked={value.strokeTypes.includes(stroke.id)}
                onCheckedChange={() => toggleStroke(stroke.id)}
              />
              <span className="text-lg">{stroke.icon}</span>
              <span className="text-sm">{t(stroke.label)}</span>
            </Label>
          ))}
        </div>
      </div>

      {/* Primary Stroke */}
      {value.strokeTypes.length > 0 && (
        <div className="space-y-4">
          <Label className="text-base font-semibold">
            {t('labels.primaryStroke')}
          </Label>
          <RadioGroup
            value={value.primaryStroke}
            onValueChange={(val) => updateSettings({ primaryStroke: val })}
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          >
            {STROKE_TYPES.filter((s) => value.strokeTypes.includes(s.id)).map((stroke) => (
              <Label
                key={stroke.id}
                htmlFor={`primary-${stroke.id}`}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                  value.primaryStroke === stroke.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                )}
              >
                <RadioGroupItem value={stroke.id} id={`primary-${stroke.id}`} />
                <span className="text-sm">{t(stroke.label)}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>
      )}

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
          {SWIMMING_DISCIPLINES.map((disc) => (
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

      {/* CSS (Critical Swim Speed) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('titles.css')}
          </CardTitle>
          <CardDescription>
            {t('descriptions.css')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('labels.cssPace')}</Label>
              <Input
                type="text"
                placeholder={t('placeholders.cssPace')}
                value={cssInput}
                onChange={(e) => handleCssChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('helpers.cssFormat')}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t('labels.lastCssTest')}</Label>
              <Input
                type="date"
                value={value.cssTestDate || ''}
                onChange={(e) => updateSettings({ cssTestDate: e.target.value || null })}
              />
            </div>
          </div>

          {value.currentCss && value.currentCss > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-semibold">
                {t('labels.swimZones')}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {calculateSwimZones(value.currentCss).map((zone) => (
                  <div
                    key={zone.zone}
                    className={cn('flex items-center justify-between p-2 rounded-lg', zone.color)}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="w-6 h-6 p-0 flex items-center justify-center">
                        {zone.zone}
                      </Badge>
                      <span className="text-sm font-medium">
                        {t(zone.name)}
                      </span>
                    </div>
                    <span className="text-sm font-mono">
                      {formatCssTime(zone.pace)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pool Length */}
        <div className="space-y-2">
            <Label>{t('labels.preferredPoolLength')}</Label>
            <RadioGroup
              value={value.preferredPoolLength}
              onValueChange={(val) => updateSettings({ preferredPoolLength: val })}
              className="grid grid-cols-2 gap-2"
            >
              {POOL_LENGTHS.map((pool) => (
                <Label
                  key={pool.id}
                  htmlFor={`pool-${pool.id}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors text-sm',
                    value.preferredPoolLength === pool.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value={pool.id} id={`pool-${pool.id}`} />
                  <span>{t(pool.label)}</span>
                </Label>
              ))}
            </RadioGroup>
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
          {/* Training Environments */}
          <div className="space-y-2">
            <Label>{t('labels.trainingEnvironments')}</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TRAINING_ENVIRONMENTS.map((env) => (
                <Label
                  key={env.id}
                  htmlFor={`env-${env.id}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors text-sm',
                    value.trainingEnvironments.includes(env.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  )}
                >
                  <Checkbox
                    id={`env-${env.id}`}
                    checked={value.trainingEnvironments.includes(env.id)}
                    onCheckedChange={() => toggleEnvironment(env.id)}
                  />
                  <span>{t(env.label)}</span>
                </Label>
              ))}
            </div>
          </div>

          {/* Open Water Experience */}
          {value.trainingEnvironments.some((e) => ['lake', 'ocean'].includes(e)) && (
            <div className="space-y-2">
              <Label>{t('labels.openWaterExperience')}</Label>
              <RadioGroup
                value={value.openWaterExperience}
                onValueChange={(val) => updateSettings({ openWaterExperience: val as SwimmingSettings['openWaterExperience'] })}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2"
              >
                {OPEN_WATER_EXPERIENCE_OPTIONS.map((exp) => (
                  <Label
                    key={exp.id}
                    htmlFor={`ow-${exp.id}`}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors text-sm',
                      value.openWaterExperience === exp.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    )}
                  >
                    <RadioGroupItem value={exp.id} id={`ow-${exp.id}`} />
                    <span>{t(exp.label)}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Equipment */}
          <div className="space-y-2">
            <Label>{t('labels.equipment')}</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EQUIPMENT.map((equip) => (
                <Label
                  key={equip.id}
                  htmlFor={`equip-${equip.id}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors text-sm',
                    value.equipment.includes(equip.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  )}
                >
                  <Checkbox
                    id={`equip-${equip.id}`}
                    checked={value.equipment.includes(equip.id)}
                    onCheckedChange={() => toggleEquipment(equip.id)}
                  />
                  <span>{t(equip.label)}</span>
                </Label>
              ))}
            </div>
          </div>

          {/* Weekly Volume */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('labels.weeklySwimSessions')}</Label>
              <Input
                type="number"
                min={1}
                max={14}
                className="max-w-[150px]"
                value={value.weeklySwimSessions}
                onChange={(e) => updateSettings({ weeklySwimSessions: parseInt(e.target.value) || 3 })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('labels.weeklyDistance')}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                className="max-w-[150px]"
                value={value.weeklySwimDistance}
                onChange={(e) => updateSettings({ weeklySwimDistance: parseFloat(e.target.value) || 5 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Default swimming settings
export const DEFAULT_SWIMMING_SETTINGS: SwimmingSettings = {
  strokeTypes: ['freestyle'],
  primaryStroke: 'freestyle',
  primaryDiscipline: '',
  preferredPoolLength: '25',
  trainingEnvironments: ['pool_indoor'],
  currentCss: null,
  cssTestDate: null,
  weeklySwimDistance: 5,
  weeklySwimSessions: 3,
  equipment: [],
  hasHeartRateMonitor: false,
  openWaterExperience: 'none',
  swimmingExperience: 'intermediate',
}
