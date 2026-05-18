'use client'

import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'

// Power zone calculation based on FTP (Coggan zones)
function calculatePowerZones(ftp: number) {
  return [
    { zone: 1, name: 'powerZones.activeRecovery', min: 0, max: Math.round(ftp * 0.55), color: 'bg-gray-200' },
    { zone: 2, name: 'powerZones.endurance', min: Math.round(ftp * 0.56), max: Math.round(ftp * 0.75), color: 'bg-blue-200' },
    { zone: 3, name: 'powerZones.tempo', min: Math.round(ftp * 0.76), max: Math.round(ftp * 0.90), color: 'bg-green-200' },
    { zone: 4, name: 'powerZones.threshold', min: Math.round(ftp * 0.91), max: Math.round(ftp * 1.05), color: 'bg-yellow-200' },
    { zone: 5, name: 'powerZones.vo2max', min: Math.round(ftp * 1.06), max: Math.round(ftp * 1.20), color: 'bg-orange-200' },
    { zone: 6, name: 'powerZones.anaerobic', min: Math.round(ftp * 1.21), max: Math.round(ftp * 1.50), color: 'bg-red-200' },
    { zone: 7, name: 'powerZones.neuromuscular', min: Math.round(ftp * 1.51), max: null, color: 'bg-purple-200' },
  ]
}

// Cycling-specific options
const BIKE_TYPES = [
  { id: 'road', label: 'bikeTypes.road', icon: '🚴' },
  { id: 'tt', label: 'bikeTypes.tt', icon: '🚴‍♂️' },
  { id: 'mtb', label: 'bikeTypes.mtb', icon: '🚵' },
  { id: 'gravel', label: 'bikeTypes.gravel', icon: '🚲' },
  { id: 'indoor', label: 'bikeTypes.indoor', icon: '🏠' },
]

const CYCLING_DISCIPLINES = [
  { id: 'endurance', label: 'disciplines.endurance' },
  { id: 'racing', label: 'disciplines.racing' },
  { id: 'tt', label: 'disciplines.timeTrials' },
  { id: 'climbing', label: 'disciplines.climbing' },
  { id: 'crit', label: 'disciplines.crit' },
  { id: 'triathlon', label: 'disciplines.triathlon' },
  { id: 'mtb_xc', label: 'disciplines.mtbXC' },
  { id: 'mtb_enduro', label: 'disciplines.mtbEnduro' },
  { id: 'gravel', label: 'disciplines.gravel' },
  { id: 'recreational', label: 'disciplines.recreational' },
]

const POWER_METER_TYPES = [
  { id: 'none', label: 'powerMeters.none' },
  { id: 'pedal', label: 'powerMeters.pedal' },
  { id: 'crank', label: 'powerMeters.crank' },
  { id: 'hub', label: 'powerMeters.hub' },
  { id: 'smart_trainer', label: 'powerMeters.smartTrainer' },
]

const TRAINING_PLATFORMS = [
  { id: 'zwift', label: 'platforms.zwift' },
  { id: 'trainerroad', label: 'platforms.trainerRoad' },
  { id: 'wahoo_systm', label: 'platforms.wahooSystem' },
  { id: 'rouvy', label: 'platforms.rouvy' },
  { id: 'none', label: 'platforms.none' },
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
}: CyclingOnboardingProps) {
  const t = useTranslations('components.onboarding.cycling')

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
          {t('labels.bikeTypes')}
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
              <span className="text-sm">{t(bike.label)}</span>
            </Label>
          ))}
        </div>
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
              <span className="text-sm">{t(disc.label)}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* FTP and Power Meter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('titles.powerData')}
          </CardTitle>
          <CardDescription>
            {t('descriptions.powerData')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Power Meter Type */}
          <div className="space-y-2">
            <Label>{t('labels.powerMeterType')}</Label>
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
                  <span>{t(pm.label)}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* FTP Input */}
          {value.powerMeterType !== 'none' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('labels.currentFtp')}</Label>
                <Input
                  type="number"
                  placeholder={t('placeholders.ftp')}
                  value={value.currentFtp || ''}
                  onChange={(e) =>
                    updateSettings({ currentFtp: e.target.value ? parseInt(e.target.value) : null })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('labels.lastFtpTest')}</Label>
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
            {value.currentFtp && value.weight && (
              <p className="text-sm text-muted-foreground">
                {t('units.wKg')}: <span className="font-semibold">{(value.currentFtp / value.weight).toFixed(2)}</span>
              </p>
            )}
          </div>

          {/* Power Zones Display */}
          {value.currentFtp && value.currentFtp > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-semibold">
                {t('labels.powerZones')}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {calculatePowerZones(value.currentFtp).map((zone) => (
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
                      {zone.max ? `${zone.min}-${zone.max}W` : `>${zone.min}W`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
          {/* Training Platforms */}
          <div className="space-y-2">
            <Label>{t('labels.trainingPlatforms')}</Label>
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
                  <span>{t(platform.label)}</span>
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

          {/* Indoor/Outdoor Split */}
          <div className="space-y-2">
            <Label>
              {t('labels.indoorOutdoorTraining')}: {value.indoorOutdoorSplit}% {t('units.indoor')}
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
              <span>{t('labels.outdoor100')}</span>
              <span>{t('labels.indoor100')}</span>
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
