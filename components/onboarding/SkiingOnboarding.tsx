'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Skiing-specific options
const SKI_TECHNIQUES = [
  { id: 'classic', label: 'Classic', labelSv: 'Klassisk', icon: '⛷️' },
  { id: 'skating', label: 'Skating', labelSv: 'Skate', icon: '🎿' },
  { id: 'both', label: 'Both techniques', labelSv: 'Båda teknikerna', icon: '⛷️🎿' },
]

const SKIING_DISCIPLINES = [
  { id: 'distance', label: 'Distance / Marathon', labelSv: 'Distans / Maraton' },
  { id: 'sprint', label: 'Sprint', labelSv: 'Sprint' },
  { id: 'skiathlon', label: 'Skiathlon', labelSv: 'Skiathlon' },
  { id: 'biathlon', label: 'Biathlon', labelSv: 'Skidskytte' },
  { id: 'recreational', label: 'Recreational', labelSv: 'Motionsskidåkning' },
  { id: 'touring', label: 'Ski Touring', labelSv: 'Skidturism' },
  { id: 'orienteering', label: 'Ski Orienteering', labelSv: 'Skidorientering' },
]

const TERRAIN_TYPES = [
  { id: 'flat', label: 'Flat terrain', labelSv: 'Platt terräng' },
  { id: 'hilly', label: 'Hilly terrain', labelSv: 'Kuperad terräng' },
  { id: 'mountainous', label: 'Mountainous', labelSv: 'Fjällterräng' },
  { id: 'mixed', label: 'Mixed', labelSv: 'Blandad' },
]

const TRAINING_METHODS = [
  { id: 'on_snow', label: 'On-snow skiing', labelSv: 'Snöskidåkning', icon: '❄️' },
  { id: 'roller_ski', label: 'Roller skiing', labelSv: 'Rullskidor', icon: '🛼' },
  { id: 'ski_treadmill', label: 'Ski treadmill', labelSv: 'Skidergometer', icon: '🏃' },
  { id: 'running', label: 'Running', labelSv: 'Löpning', icon: '🏃‍♂️' },
  { id: 'cycling', label: 'Cycling', labelSv: 'Cykling', icon: '🚴' },
  { id: 'strength', label: 'Strength training', labelSv: 'Styrketräning', icon: '💪' },
]

const SEASON_PHASES = [
  { id: 'preparation', label: 'Preparation (Apr-Oct)', labelSv: 'Förberedelse (apr-okt)' },
  { id: 'competition', label: 'Competition (Nov-Mar)', labelSv: 'Tävling (nov-mar)' },
  { id: 'transition', label: 'Transition', labelSv: 'Övergång' },
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
  locale = 'sv',
}: SkiingOnboardingProps) {
  const t = (en: string, sv: string) => (locale === 'sv' ? sv : en)

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
          {t('What skiing technique do you use?', 'Vilken skidteknik använder du?')}
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
              <span className="font-medium">{locale === 'sv' ? tech.labelSv : tech.label}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Primary Discipline */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">
          {t('What is your primary skiing discipline?', 'Vad är din primära skiddisciplin?')}
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
              <span className="text-sm">{locale === 'sv' ? disc.labelSv : disc.label}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Terrain Preference */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">
          {t('What terrain do you typically train on?', 'Vilken terräng tränar du vanligtvis på?')}
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
              <span className="text-sm">{locale === 'sv' ? terrain.labelSv : terrain.label}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Threshold Pace Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('Performance Data', 'Prestationsdata')}
          </CardTitle>
          <CardDescription>
            {t(
              'Your threshold pace helps us calculate training zones',
              'Ditt tröskeltempo hjälper oss beräkna träningszoner'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Threshold Pace Input */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('Threshold pace (min/km)', 'Tröskeltempo (min/km)')}</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 4.5"
                value={value.currentThresholdPace || ''}
                onChange={(e) =>
                  updateSettings({ currentThresholdPace: e.target.value ? parseFloat(e.target.value) : null })
                }
              />
              <p className="text-xs text-muted-foreground">
                {t(
                  'Your sustainable pace for ~1 hour of skiing',
                  'Det tempo du kan hålla i ca 1 timme'
                )}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t('Last threshold test', 'Senaste tröskeltest')}</Label>
              <Input
                type="date"
                value={value.thresholdTestDate || ''}
                onChange={(e) => updateSettings({ thresholdTestDate: e.target.value || null })}
              />
            </div>
          </div>

          {/* Weight */}
          <div className="space-y-2">
            <Label>{t('Body weight (kg)', 'Kroppsvikt (kg)')}</Label>
            <Input
              type="number"
              placeholder="e.g. 70"
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
            <span>{t('I have a heart rate monitor', 'Jag har en pulsmätare')}</span>
          </Label>
        </CardContent>
      </Card>

      {/* Training Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('Training Setup', 'Träningsinställningar')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Training Methods */}
          <div className="space-y-2">
            <Label>{t('Training methods you use', 'Träningsmetoder du använder')}</Label>
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
                  <span>{locale === 'sv' ? method.labelSv : method.label}</span>
                </Label>
              ))}
            </div>
          </div>

          {/* Weekly Hours */}
          <div className="space-y-2">
            <Label>{t('Average weekly training hours', 'Genomsnittliga träningstimmar per vecka')}</Label>
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
              {t('Months with snow access per year', 'Månader med snötillgång per år')}: {value.onSnowAccessMonths} {t('months', 'månader')}
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
              <span>{t('0 months (roller ski only)', '0 mån (endast rullskidor)')}</span>
              <span>{t('12 months (year-round snow)', '12 mån (snö året runt)')}</span>
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
