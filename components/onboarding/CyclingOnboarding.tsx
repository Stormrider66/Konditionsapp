'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Cycling-specific options
const BIKE_TYPES = [
  { id: 'road', label: 'Road Bike', labelSv: 'Landsvägscykel', icon: '🚴' },
  { id: 'tt', label: 'Time Trial / Triathlon', labelSv: 'Temposykel / Triathlon', icon: '🚴‍♂️' },
  { id: 'mtb', label: 'Mountain Bike', labelSv: 'Mountainbike', icon: '🚵' },
  { id: 'gravel', label: 'Gravel / CX', labelSv: 'Gravel / CX', icon: '🚲' },
  { id: 'indoor', label: 'Indoor / Smart Trainer', labelSv: 'Inomhus / Smart Trainer', icon: '🏠' },
]

const CYCLING_DISCIPLINES = [
  { id: 'endurance', label: 'Endurance / Gran Fondo', labelSv: 'Uthållighet / Gran Fondo' },
  { id: 'racing', label: 'Road Racing', labelSv: 'Tävlingscykling' },
  { id: 'tt', label: 'Time Trials', labelSv: 'Tempo' },
  { id: 'climbing', label: 'Climbing', labelSv: 'Klättring' },
  { id: 'crit', label: 'Criterium', labelSv: 'Criterium' },
  { id: 'triathlon', label: 'Triathlon', labelSv: 'Triathlon' },
  { id: 'mtb_xc', label: 'MTB XC', labelSv: 'MTB XC' },
  { id: 'mtb_enduro', label: 'MTB Enduro', labelSv: 'MTB Enduro' },
  { id: 'gravel', label: 'Gravel Racing', labelSv: 'Graveltävling' },
  { id: 'recreational', label: 'Recreational', labelSv: 'Motionscykling' },
]

const POWER_METER_TYPES = [
  { id: 'none', label: 'No power meter', labelSv: 'Ingen wattmätare' },
  { id: 'pedal', label: 'Pedal-based', labelSv: 'Pedalbaserad' },
  { id: 'crank', label: 'Crank-based', labelSv: 'Vevbaserad' },
  { id: 'hub', label: 'Hub-based', labelSv: 'Navbaserad' },
  { id: 'smart_trainer', label: 'Smart Trainer', labelSv: 'Smart Trainer' },
]

const TRAINING_PLATFORMS = [
  { id: 'zwift', label: 'Zwift', labelSv: 'Zwift' },
  { id: 'trainerroad', label: 'TrainerRoad', labelSv: 'TrainerRoad' },
  { id: 'wahoo_systm', label: 'Wahoo SYSTM', labelSv: 'Wahoo SYSTM' },
  { id: 'rouvy', label: 'Rouvy', labelSv: 'Rouvy' },
  { id: 'none', label: 'None / Outdoor only', labelSv: 'Ingen / Endast utomhus' },
]

export interface CyclingSettings {
  bikeTypes: string[]
  primaryDiscipline: string
  currentFtp: number | null
  ftpTestDate: string | null
  powerMeterType: string
  trainingPlatforms: string[]
  weeklyHours: number
  indoorOutdoorSplit: number // 0-100, percentage indoor
  hasHeartRateMonitor: boolean
  weight: number | null
}

interface CyclingOnboardingProps {
  value: CyclingSettings
  onChange: (settings: CyclingSettings) => void
  locale?: 'en' | 'sv'
}

export function CyclingOnboarding({
  value,
  onChange,
  locale = 'sv',
}: CyclingOnboardingProps) {
  const t = (en: string, sv: string) => (locale === 'sv' ? sv : en)

  const updateSettings = (updates: Partial<CyclingSettings>) => {
    onChange({ ...value, ...updates })
  }

  const toggleBikeType = (bikeId: string) => {
    const newTypes = value.bikeTypes.includes(bikeId)
      ? value.bikeTypes.filter((t) => t !== bikeId)
      : [...value.bikeTypes, bikeId]
    updateSettings({ bikeTypes: newTypes })
  }

  const togglePlatform = (platformId: string) => {
    const newPlatforms = value.trainingPlatforms.includes(platformId)
      ? value.trainingPlatforms.filter((p) => p !== platformId)
      : [...value.trainingPlatforms, platformId]
    updateSettings({ trainingPlatforms: newPlatforms })
  }

  return (
    <div className="space-y-8">
      {/* Bike Types */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">
          {t('What types of bikes do you ride?', 'Vilka typer av cyklar har du?')}
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {BIKE_TYPES.map((bike) => (
            <Label
              key={bike.id}
              htmlFor={`bike-${bike.id}`}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                value.bikeTypes.includes(bike.id)
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              )}
            >
              <Checkbox
                id={`bike-${bike.id}`}
                checked={value.bikeTypes.includes(bike.id)}
                onCheckedChange={() => toggleBikeType(bike.id)}
              />
              <span className="text-lg">{bike.icon}</span>
              <span className="text-sm">{locale === 'sv' ? bike.labelSv : bike.label}</span>
            </Label>
          ))}
        </div>
      </div>

      {/* Primary Discipline */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">
          {t('What is your primary cycling discipline?', 'Vad är din primära cyklingsdisciplin?')}
        </Label>
        <RadioGroup
          value={value.primaryDiscipline}
          onValueChange={(val) => updateSettings({ primaryDiscipline: val })}
          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          {CYCLING_DISCIPLINES.map((disc) => (
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

      {/* FTP and Power Meter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('Power Data', 'Effektdata')}
          </CardTitle>
          <CardDescription>
            {t(
              'Your FTP (Functional Threshold Power) helps us calculate training zones',
              'Din FTP (Functional Threshold Power) hjälper oss beräkna träningszoner'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Power Meter Type */}
          <div className="space-y-2">
            <Label>{t('Power meter type', 'Typ av wattmätare')}</Label>
            <RadioGroup
              value={value.powerMeterType}
              onValueChange={(val) => updateSettings({ powerMeterType: val })}
              className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            >
              {POWER_METER_TYPES.map((pm) => (
                <Label
                  key={pm.id}
                  htmlFor={`pm-${pm.id}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors text-sm',
                    value.powerMeterType === pm.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value={pm.id} id={`pm-${pm.id}`} />
                  <span>{locale === 'sv' ? pm.labelSv : pm.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* FTP Input */}
          {value.powerMeterType !== 'none' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Current FTP (watts)', 'Nuvarande FTP (watt)')}</Label>
                <Input
                  type="number"
                  placeholder="e.g. 250"
                  value={value.currentFtp || ''}
                  onChange={(e) =>
                    updateSettings({ currentFtp: e.target.value ? parseInt(e.target.value) : null })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Last FTP test date', 'Senaste FTP-test')}</Label>
                <Input
                  type="date"
                  value={value.ftpTestDate || ''}
                  onChange={(e) => updateSettings({ ftpTestDate: e.target.value || null })}
                />
              </div>
            </div>
          )}

          {/* Weight for W/kg */}
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
            {value.currentFtp && value.weight && (
              <p className="text-sm text-muted-foreground">
                W/kg: <span className="font-semibold">{(value.currentFtp / value.weight).toFixed(2)}</span>
              </p>
            )}
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
          {/* Training Platforms */}
          <div className="space-y-2">
            <Label>{t('Training platforms used', 'Träningsplattformar')}</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TRAINING_PLATFORMS.map((platform) => (
                <Label
                  key={platform.id}
                  htmlFor={`platform-${platform.id}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors text-sm',
                    value.trainingPlatforms.includes(platform.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  )}
                >
                  <Checkbox
                    id={`platform-${platform.id}`}
                    checked={value.trainingPlatforms.includes(platform.id)}
                    onCheckedChange={() => togglePlatform(platform.id)}
                  />
                  <span>{locale === 'sv' ? platform.labelSv : platform.label}</span>
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

          {/* Indoor/Outdoor Split */}
          <div className="space-y-2">
            <Label>
              {t('Indoor vs outdoor training', 'Inomhus vs utomhusträning')}: {value.indoorOutdoorSplit}% {t('indoor', 'inomhus')}
            </Label>
            <input
              type="range"
              min={0}
              max={100}
              step={10}
              value={value.indoorOutdoorSplit}
              onChange={(e) => updateSettings({ indoorOutdoorSplit: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('100% Outdoor', '100% Utomhus')}</span>
              <span>{t('100% Indoor', '100% Inomhus')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Default cycling settings
export const DEFAULT_CYCLING_SETTINGS: CyclingSettings = {
  bikeTypes: [],
  primaryDiscipline: '',
  currentFtp: null,
  ftpTestDate: null,
  powerMeterType: 'none',
  trainingPlatforms: [],
  weeklyHours: 6,
  indoorOutdoorSplit: 30,
  hasHeartRateMonitor: false,
  weight: null,
}
