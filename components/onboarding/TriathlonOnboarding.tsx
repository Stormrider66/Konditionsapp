'use client'

import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Waves, Bike, PersonStanding } from 'lucide-react'
import { useTranslations } from '@/i18n/client'

// Race distances
const RACE_DISTANCES = [
  { id: 'super_sprint', translationKey: 'superSprint', swim: '400m', bike: '10km', run: '2.5km' },
  { id: 'sprint', translationKey: 'sprint', swim: '750m', bike: '20km', run: '5km' },
  { id: 'olympic', translationKey: 'olympic', swim: '1.5km', bike: '40km', run: '10km' },
  { id: 'half_ironman', translationKey: 'halfIronman', swim: '1.9km', bike: '90km', run: '21.1km' },
  { id: 'ironman', translationKey: 'ironman', swim: '3.8km', bike: '180km', run: '42.2km' },
]

// Experience levels
const EXPERIENCE_LEVELS = [
  { id: 'beginner', translationKey: 'beginner' },
  { id: 'intermediate', translationKey: 'intermediate' },
  { id: 'advanced', translationKey: 'advanced' },
  { id: 'elite', translationKey: 'elite' },
]

// Strongest/weakest discipline
const DISCIPLINES = [
  { id: 'swim', translationKey: 'swim' },
  { id: 'bike', translationKey: 'bike' },
  { id: 'run', translationKey: 'run' },
]

// Bike types for triathlon
const TRI_BIKE_TYPES = [
  { id: 'tt_tri', translationKey: 'ttTri' },
  { id: 'road_clip', translationKey: 'roadClip' },
  { id: 'road', translationKey: 'road' },
]

// Wetsuit options
const WETSUIT_OPTIONS = [
  { id: 'fullsuit', translationKey: 'fullsuit' },
  { id: 'sleeveless', translationKey: 'sleeveless' },
  { id: 'swimskin', translationKey: 'swimskin' },
  { id: 'none', translationKey: 'none' },
]

const OPEN_WATER_EXPERIENCE_OPTIONS = ['none', 'beginner', 'intermediate', 'advanced'] as const

export interface TriathlonSettings {
  // Race preferences
  targetRaceDistance: string
  experienceLevel: string

  // Discipline balance
  strongestDiscipline: string
  weakestDiscipline: string

  // Swimming
  currentCss: number | null // Critical Swim Speed in seconds per 100m
  cssTestDate: string | null
  openWaterExperience: 'none' | 'beginner' | 'intermediate' | 'advanced'
  wetsuitType: string

  // Cycling
  currentFtp: number | null // Functional Threshold Power in watts
  ftpTestDate: string | null
  bikeType: string
  hasPowerMeter: boolean

  // Running
  currentThresholdPace: number | null // seconds per km at threshold
  thresholdTestDate: string | null

  // Training
  weeklyHoursAvailable: number
  swimSessions: number
  bikeSessions: number
  runSessions: number
  brickWorkoutsPerWeek: number // Combined bike+run sessions

  // Equipment
  hasHeartRateMonitor: boolean
  hasGpsWatch: boolean
  hasIndoorTrainer: boolean

  // Body
  weight: number | null
}

interface TriathlonOnboardingProps {
  value: TriathlonSettings
  onChange: (settings: TriathlonSettings) => void
  locale?: 'en' | 'sv'
}

// Format seconds to MM:SS
function formatPace(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Parse MM:SS to seconds
function parsePace(value: string): number | null {
  const parts = value.split(':')
  if (parts.length === 2) {
    const mins = parseInt(parts[0]) || 0
    const secs = parseInt(parts[1]) || 0
    return mins * 60 + secs
  }
  return parseInt(value) || null
}

export function TriathlonOnboarding({
  value,
  onChange,
}: TriathlonOnboardingProps) {
  const t = useTranslations('components.triathlonOnboarding')

  const updateSettings = (updates: Partial<TriathlonSettings>) => {
    onChange({ ...value, ...updates })
  }

  const totalWeeklySessions = value.swimSessions + value.bikeSessions + value.runSessions + value.brickWorkoutsPerWeek

  return (
    <div className="space-y-8">
      {/* Race Distance & Experience */}
      <div className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base font-semibold">
            {t('targetRaceDistanceLabel')}
          </Label>
          <RadioGroup
            value={value.targetRaceDistance}
            onValueChange={(val) => updateSettings({ targetRaceDistance: val })}
            className="grid gap-3"
          >
            {RACE_DISTANCES.map((race) => (
              <Label
                key={race.id}
                htmlFor={`race-${race.id}`}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-colors',
                  value.targetRaceDistance === race.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={race.id} id={`race-${race.id}`} />
                  <span className="font-medium">{t(`raceDistances.${race.translationKey}.label`)}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {race.swim} / {race.bike} / {race.run}
                </span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-4">
          <Label className="text-base font-semibold">
            {t('experienceLevelLabel')}
          </Label>
          <RadioGroup
            value={value.experienceLevel}
            onValueChange={(val) => updateSettings({ experienceLevel: val })}
            className="grid grid-cols-2 gap-3"
          >
            {EXPERIENCE_LEVELS.map((level) => (
              <Label
                key={level.id}
                htmlFor={`exp-${level.id}`}
                className={cn(
                  'flex flex-col rounded-lg border p-3 cursor-pointer transition-colors',
                  value.experienceLevel === level.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                )}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={level.id} id={`exp-${level.id}`} />
                  <span className="font-medium">{t(`experienceLevels.${level.translationKey}`)}</span>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </div>
      </div>

      {/* Discipline Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('disciplineBalance.title')}
          </CardTitle>
          <CardDescription>
            {t('disciplineBalance.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>{t('disciplineBalance.strongestDiscipline')}</Label>
              <RadioGroup
                value={value.strongestDiscipline}
                onValueChange={(val) => updateSettings({ strongestDiscipline: val })}
                className="space-y-2"
              >
                {DISCIPLINES.map((disc) => (
                  <Label
                    key={disc.id}
                    htmlFor={`strong-${disc.id}`}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                      value.strongestDiscipline === disc.id
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                        : 'hover:border-primary/50'
                    )}
                  >
                    <RadioGroupItem value={disc.id} id={`strong-${disc.id}`} />
                    {disc.id === 'run' ? (
                      <PersonStanding className="h-4 w-4" />
                    ) : disc.id === 'bike' ? (
                      <Bike className="h-4 w-4" />
                    ) : (
                      <Waves className="h-4 w-4" />
                    )}
                    <span>{t(`disciplines.${disc.translationKey}`)}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-3">
              <Label>{t('disciplineBalance.weakestDiscipline')}</Label>
              <RadioGroup
                value={value.weakestDiscipline}
                onValueChange={(val) => updateSettings({ weakestDiscipline: val })}
                className="space-y-2"
              >
                {DISCIPLINES.map((disc) => (
                  <Label
                    key={disc.id}
                    htmlFor={`weak-${disc.id}`}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                      value.weakestDiscipline === disc.id
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                        : 'hover:border-primary/50'
                    )}
                  >
                    <RadioGroupItem value={disc.id} id={`weak-${disc.id}`} />
                    {disc.id === 'run' ? (
                      <PersonStanding className="h-4 w-4" />
                    ) : disc.id === 'bike' ? (
                      <Bike className="h-4 w-4" />
                    ) : (
                      <Waves className="h-4 w-4" />
                    )}
                    <span>{t(`disciplines.${disc.translationKey}`)}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Swimming */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Waves className="h-5 w-5 text-blue-500" />
            {t('swimming.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('swimming.currentCss')}</Label>
              <Input
                type="text"
                placeholder="1:45"
                value={value.currentCss ? formatPace(value.currentCss) : ''}
                onChange={(e) => updateSettings({ currentCss: parsePace(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">{t('swimming.format')}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('swimming.lastCssTest')}</Label>
              <Input
                type="date"
                value={value.cssTestDate || ''}
                onChange={(e) => updateSettings({ cssTestDate: e.target.value || null })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>{t('swimming.openWaterExperience')}</Label>
            <RadioGroup
              value={value.openWaterExperience}
              onValueChange={(val) => updateSettings({ openWaterExperience: val as typeof OPEN_WATER_EXPERIENCE_OPTIONS[number] })}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2"
            >
              {OPEN_WATER_EXPERIENCE_OPTIONS.map((level) => (
                <Label
                  key={level}
                  htmlFor={`ow-${level}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors text-sm',
                    value.openWaterExperience === level
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value={level} id={`ow-${level}`} />
                  <span>{t(`openWaterExperience.levels.${level}`)}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>{t('swimming.wetsuit')}</Label>
            <RadioGroup
              value={value.wetsuitType}
              onValueChange={(val) => updateSettings({ wetsuitType: val })}
              className="grid grid-cols-2 gap-2"
            >
              {WETSUIT_OPTIONS.map((ws) => (
                <Label
                  key={ws.id}
                  htmlFor={`ws-${ws.id}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors text-sm',
                    value.wetsuitType === ws.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value={ws.id} id={`ws-${ws.id}`} />
                  <span>{t(`wetsuitOptions.${ws.translationKey}`)}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Cycling */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bike className="h-5 w-5 text-yellow-500" />
            {t('cycling.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('cycling.currentFtp')}</Label>
              <Input
                type="number"
                placeholder="250"
                value={value.currentFtp || ''}
                onChange={(e) => updateSettings({ currentFtp: e.target.value ? parseInt(e.target.value) : null })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('cycling.lastFtpTest')}</Label>
              <Input
                type="date"
                value={value.ftpTestDate || ''}
                onChange={(e) => updateSettings({ ftpTestDate: e.target.value || null })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>{t('cycling.setup')}</Label>
            <RadioGroup
              value={value.bikeType}
              onValueChange={(val) => updateSettings({ bikeType: val })}
              className="space-y-2"
            >
              {TRI_BIKE_TYPES.map((bike) => (
                <Label
                  key={bike.id}
                  htmlFor={`bike-${bike.id}`}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                    value.bikeType === bike.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value={bike.id} id={`bike-${bike.id}`} />
                  <span>{t(`triBikeTypes.${bike.translationKey}`)}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <Label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={value.hasPowerMeter}
              onCheckedChange={(checked) => updateSettings({ hasPowerMeter: !!checked })}
            />
            <span>{t('cycling.hasPowerMeter')}</span>
          </Label>
        </CardContent>
      </Card>

      {/* Running */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PersonStanding className="h-5 w-5 text-green-500" />
            {t('running.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('running.thresholdPace')}</Label>
              <Input
                type="text"
                placeholder="4:30"
                value={value.currentThresholdPace ? formatPace(value.currentThresholdPace) : ''}
                onChange={(e) => updateSettings({ currentThresholdPace: parsePace(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">{t('running.format')}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('running.lastThresholdTest')}</Label>
              <Input
                type="date"
                value={value.thresholdTestDate || ''}
                onChange={(e) => updateSettings({ thresholdTestDate: e.target.value || null })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Volume */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('trainingVolume.title')}
          </CardTitle>
          <CardDescription>
            {t('trainingVolume.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t('trainingVolume.weeklyHoursAvailable')}: {value.weeklyHoursAvailable}h</Label>
            <input
              type="range"
              min={4}
              max={25}
              step={1}
              value={value.weeklyHoursAvailable}
              onChange={(e) => updateSettings({ weeklyHoursAvailable: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>4h</span>
              <span>10h</span>
              <span>15h</span>
              <span>20h</span>
              <span>25h</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Waves className="h-4 w-4 text-blue-500" />
                {t('trainingVolume.swim')}
              </Label>
              <Input
                type="number"
                min={0}
                max={7}
                value={value.swimSessions}
                onChange={(e) => updateSettings({ swimSessions: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">{t('trainingVolume.sessionsPerWeek')}</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Bike className="h-4 w-4 text-yellow-500" />
                {t('trainingVolume.bike')}
              </Label>
              <Input
                type="number"
                min={0}
                max={7}
                value={value.bikeSessions}
                onChange={(e) => updateSettings({ bikeSessions: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">{t('trainingVolume.sessionsPerWeek')}</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <PersonStanding className="h-4 w-4 text-green-500" />
                {t('trainingVolume.run')}
              </Label>
              <Input
                type="number"
                min={0}
                max={7}
                value={value.runSessions}
                onChange={(e) => updateSettings({ runSessions: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">{t('trainingVolume.sessionsPerWeek')}</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                {t('trainingVolume.bricks')}
              </Label>
              <Input
                type="number"
                min={0}
                max={3}
                value={value.brickWorkoutsPerWeek}
                onChange={(e) => updateSettings({ brickWorkoutsPerWeek: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">{t('trainingVolume.brickPerWeek')}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {t('trainingVolume.totalSessions')} {totalWeeklySessions}/{t('trainingVolume.week')}
          </p>
        </CardContent>
      </Card>

      {/* Equipment & Body */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('equipmentAndBody.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={value.hasHeartRateMonitor}
                onCheckedChange={(checked) => updateSettings({ hasHeartRateMonitor: !!checked })}
              />
              <span>{t('equipmentAndBody.heartRateMonitor')}</span>
            </Label>
            <Label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={value.hasGpsWatch}
                onCheckedChange={(checked) => updateSettings({ hasGpsWatch: !!checked })}
              />
              <span>{t('equipmentAndBody.gpsWatch')}</span>
            </Label>
            <Label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={value.hasIndoorTrainer}
                onCheckedChange={(checked) => updateSettings({ hasIndoorTrainer: !!checked })}
              />
              <span>{t('equipmentAndBody.indoorTrainer')}</span>
            </Label>
          </div>

          <div className="space-y-2">
            <Label>{t('equipmentAndBody.bodyWeight')}</Label>
            <Input
              type="number"
              placeholder="70"
              className="max-w-[150px]"
              value={value.weight || ''}
              onChange={(e) => updateSettings({ weight: e.target.value ? parseFloat(e.target.value) : null })}
            />
            {value.currentFtp && value.weight && (
              <p className="text-sm text-muted-foreground">
                {t('equipmentAndBody.powerToWeight')} <span className="font-semibold">{(value.currentFtp / value.weight).toFixed(2)} W/kg</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Default triathlon settings
export const DEFAULT_TRIATHLON_SETTINGS: TriathlonSettings = {
  targetRaceDistance: '',
  experienceLevel: '',
  strongestDiscipline: '',
  weakestDiscipline: '',
  currentCss: null,
  cssTestDate: null,
  openWaterExperience: 'none',
  wetsuitType: 'fullsuit',
  currentFtp: null,
  ftpTestDate: null,
  bikeType: 'road',
  hasPowerMeter: false,
  currentThresholdPace: null,
  thresholdTestDate: null,
  weeklyHoursAvailable: 10,
  swimSessions: 2,
  bikeSessions: 3,
  runSessions: 3,
  brickWorkoutsPerWeek: 1,
  hasHeartRateMonitor: false,
  hasGpsWatch: false,
  hasIndoorTrainer: false,
  weight: null,
}
