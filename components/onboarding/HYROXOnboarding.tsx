'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dumbbell, Timer, Footprints, Target } from 'lucide-react'
import { useTranslations } from '@/i18n/client'

export interface HYROXSettings {
  // Race category
  raceCategory: 'open' | 'pro' | 'doubles' | 'relay'
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite'
  targetRaceDate: string | null

  // Running fitness
  fiveKmTime: number | null // seconds
  tenKmTime: number | null // seconds
  currentWeeklyRunKm: number

  // Station benchmarks (times in seconds, or reps)
  skiErgTime: number | null // 1km time
  sledPushTime: number | null // 50m time
  sledPullTime: number | null // 50m time
  burpeeBroadJumpTime: number | null // 80m time
  rowingTime: number | null // 1km time
  farmersCarryTime: number | null // 200m time
  sandbagLungeTime: number | null // 100m time
  wallBallTime: number | null // 75/100 reps time

  // Strengths and weaknesses
  strongestStation: string
  weakestStation: string

  // Training preferences
  weeklyTrainingHours: number
  runningSessionsPerWeek: number
  strengthSessionsPerWeek: number
  hyroxSpecificSessionsPerWeek: number

  // Equipment access
  hasSkiErg: boolean
  hasRower: boolean
  hasSled: boolean
  hasWallBall: boolean
  hasSandbag: boolean
  hasFarmersCarryHandles: boolean
  gymAccess: boolean
}

export const DEFAULT_HYROX_SETTINGS: HYROXSettings = {
  raceCategory: 'open',
  experienceLevel: 'beginner',
  targetRaceDate: null,

  fiveKmTime: null,
  tenKmTime: null,
  currentWeeklyRunKm: 20,

  skiErgTime: null,
  sledPushTime: null,
  sledPullTime: null,
  burpeeBroadJumpTime: null,
  rowingTime: null,
  farmersCarryTime: null,
  sandbagLungeTime: null,
  wallBallTime: null,

  strongestStation: '',
  weakestStation: '',

  weeklyTrainingHours: 8,
  runningSessionsPerWeek: 3,
  strengthSessionsPerWeek: 2,
  hyroxSpecificSessionsPerWeek: 1,

  hasSkiErg: false,
  hasRower: false,
  hasSled: false,
  hasWallBall: false,
  hasSandbag: false,
  hasFarmersCarryHandles: false,
  gymAccess: true,
}

const RACE_CATEGORIES = [
  { value: 'open', label: 'raceCategories.open.label', description: 'raceCategories.open.description' },
  { value: 'pro', label: 'raceCategories.pro.label', description: 'raceCategories.pro.description' },
  { value: 'doubles', label: 'raceCategories.doubles.label', description: 'raceCategories.doubles.description' },
  { value: 'relay', label: 'raceCategories.relay.label', description: 'raceCategories.relay.description' },
]

const EXPERIENCE_LEVELS = [
  {
    value: 'beginner',
    label: 'experienceLevels.beginner.label',
    description: 'experienceLevels.beginner.description',
  },
  {
    value: 'intermediate',
    label: 'experienceLevels.intermediate.label',
    description: 'experienceLevels.intermediate.description',
  },
  {
    value: 'advanced',
    label: 'experienceLevels.advanced.label',
    description: 'experienceLevels.advanced.description',
  },
  { value: 'elite', label: 'experienceLevels.elite.label', description: 'experienceLevels.elite.description' },
]

const STATIONS = [
  { value: 'skierg', label: 'stations.skierg' },
  { value: 'sled_push', label: 'stations.sledPush' },
  { value: 'sled_pull', label: 'stations.sledPull' },
  { value: 'burpee_broad_jump', label: 'stations.burpeeBroadJump' },
  { value: 'rowing', label: 'stations.rowing' },
  { value: 'farmers_carry', label: 'stations.farmersCarry' },
  { value: 'sandbag_lunge', label: 'stations.sandbagLunge' },
  { value: 'wall_balls', label: 'stations.wallBalls' },
]

interface HYROXOnboardingProps {
  settings: HYROXSettings
  onUpdate: (settings: HYROXSettings) => void
}

export function HYROXOnboarding({ settings, onUpdate }: HYROXOnboardingProps) {
  const t = useTranslations('components.onboarding.hyrox')

  const updateField = <K extends keyof HYROXSettings>(field: K, value: HYROXSettings[K]) => {
    onUpdate({ ...settings, [field]: value })
  }

  const formatTimeInput = (seconds: number | null): string => {
    if (seconds === null) return ''
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const parseTimeInput = (value: string): number | null => {
    if (!value) return null
    const parts = value.split(':')
    if (parts.length === 2) {
      const mins = parseInt(parts[0]) || 0
      const secs = parseInt(parts[1]) || 0
      return mins * 60 + secs
    }
    return parseInt(value) || null
  }

  return (
    <div className="space-y-6">
      {/* Race Category & Experience */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-500" />
            {t('sections.raceInfo.title')}
          </CardTitle>
          <CardDescription>
            {t('sections.raceInfo.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('fields.raceCategory')}</Label>
              <Select
                value={settings.raceCategory}
                onValueChange={(value) => updateField('raceCategory', value as HYROXSettings['raceCategory'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('placeholders.raceCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {RACE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div>
                        <div className="font-medium">{t(cat.label)}</div>
                        <div className="text-xs text-muted-foreground">{t(cat.description)}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('fields.experienceLevel')}</Label>
              <Select
                value={settings.experienceLevel}
                onValueChange={(value) => updateField('experienceLevel', value as HYROXSettings['experienceLevel'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('placeholders.experienceLevel')} />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div>
                        <div className="font-medium">{t(level.label)}</div>
                        <div className="text-xs text-muted-foreground">{t(level.description)}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('fields.targetRaceDate')}</Label>
            <Input
              type="date"
              value={settings.targetRaceDate || ''}
              onChange={(e) => updateField('targetRaceDate', e.target.value || null)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Running Fitness */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Footprints className="h-5 w-5 text-green-500" />
            {t('sections.runningFitness.title')}
          </CardTitle>
          <CardDescription>
            {t('sections.runningFitness.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('labels.fiveKmBest')}</Label>
              <Input
                placeholder={t('placeholders.timeMMSS')}
                value={formatTimeInput(settings.fiveKmTime)}
                onChange={(e) => updateField('fiveKmTime', parseTimeInput(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.tenKmBest')}</Label>
              <Input
                placeholder={t('placeholders.timeMMSS')}
                value={formatTimeInput(settings.tenKmTime)}
                onChange={(e) => updateField('tenKmTime', parseTimeInput(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.weeklyRunKm')}</Label>
              <Input
                type="number"
                min={0}
                max={200}
                value={settings.currentWeeklyRunKm}
                onChange={(e) => updateField('currentWeeklyRunKm', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Station Benchmarks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-blue-500" />
            {t('sections.stationBenchmarks.title')}
          </CardTitle>
          <CardDescription>
            {t('sections.stationBenchmarks.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{t('labels.skiErgTime')}</Label>
              <Input
                placeholder={t('placeholders.timeMMSS')}
                value={formatTimeInput(settings.skiErgTime)}
                onChange={(e) => updateField('skiErgTime', parseTimeInput(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.sledPushTime')}</Label>
              <Input
                placeholder={t('placeholders.timeMMSS')}
                value={formatTimeInput(settings.sledPushTime)}
                onChange={(e) => updateField('sledPushTime', parseTimeInput(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.sledPullTime')}</Label>
              <Input
                placeholder={t('placeholders.timeMMSS')}
                value={formatTimeInput(settings.sledPullTime)}
                onChange={(e) => updateField('sledPullTime', parseTimeInput(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.burpeeBroadJumpTime')}</Label>
              <Input
                placeholder={t('placeholders.timeMMSS')}
                value={formatTimeInput(settings.burpeeBroadJumpTime)}
                onChange={(e) => updateField('burpeeBroadJumpTime', parseTimeInput(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.rowingTime')}</Label>
              <Input
                placeholder={t('placeholders.timeMMSS')}
                value={formatTimeInput(settings.rowingTime)}
                onChange={(e) => updateField('rowingTime', parseTimeInput(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.farmersCarryTime')}</Label>
              <Input
                placeholder={t('placeholders.timeMMSS')}
                value={formatTimeInput(settings.farmersCarryTime)}
                onChange={(e) => updateField('farmersCarryTime', parseTimeInput(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.sandbagLungeTime')}</Label>
              <Input
                placeholder={t('placeholders.timeMMSS')}
                value={formatTimeInput(settings.sandbagLungeTime)}
                onChange={(e) => updateField('sandbagLungeTime', parseTimeInput(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.wallBallTime')}</Label>
              <Input
                placeholder={t('placeholders.timeMMSS')}
                value={formatTimeInput(settings.wallBallTime)}
                onChange={(e) => updateField('wallBallTime', parseTimeInput(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="space-y-2">
              <Label>{t('labels.strongestStation')}</Label>
              <Select
                value={settings.strongestStation}
                onValueChange={(value) => updateField('strongestStation', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('placeholders.stationSelection')} />
                </SelectTrigger>
                <SelectContent>
                  {STATIONS.map((station) => (
                    <SelectItem key={station.value} value={station.value}>
                      {t(station.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('labels.weakestStation')}</Label>
              <Select
                value={settings.weakestStation}
                onValueChange={(value) => updateField('weakestStation', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('placeholders.stationSelection')} />
                </SelectTrigger>
                <SelectContent>
                  {STATIONS.map((station) => (
                    <SelectItem key={station.value} value={station.value}>
                      {t(station.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-purple-500" />
            {t('sections.trainingPreferences.title')}
          </CardTitle>
          <CardDescription>
            {t('sections.trainingPreferences.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{t('fields.weeklyTrainingHours')}</Label>
              <Input
                type="number"
                min={3}
                max={20}
                value={settings.weeklyTrainingHours}
                onChange={(e) => updateField('weeklyTrainingHours', parseInt(e.target.value) || 8)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fields.runningSessionsPerWeek')}</Label>
              <Input
                type="number"
                min={1}
                max={6}
                value={settings.runningSessionsPerWeek}
                onChange={(e) => updateField('runningSessionsPerWeek', parseInt(e.target.value) || 3)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fields.strengthSessionsPerWeek')}</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={settings.strengthSessionsPerWeek}
                onChange={(e) => updateField('strengthSessionsPerWeek', parseInt(e.target.value) || 2)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fields.hyroxSpecificSessionsPerWeek')}</Label>
              <Input
                type="number"
                min={0}
                max={3}
                value={settings.hyroxSpecificSessionsPerWeek}
                onChange={(e) => updateField('hyroxSpecificSessionsPerWeek', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Access */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.equipment.title')}</CardTitle>
          <CardDescription>
            {t('sections.equipment.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="gym"
                checked={settings.gymAccess}
                onCheckedChange={(checked) => updateField('gymAccess', checked === true)}
              />
              <Label htmlFor="gym" className="text-sm">{t('fields.gymAccess')}</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="skierg"
                checked={settings.hasSkiErg}
                onCheckedChange={(checked) => updateField('hasSkiErg', checked === true)}
              />
              <Label htmlFor="skierg" className="text-sm">{t('fields.hasSkiErg')}</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="rower"
                checked={settings.hasRower}
                onCheckedChange={(checked) => updateField('hasRower', checked === true)}
              />
              <Label htmlFor="rower" className="text-sm">{t('fields.hasRower')}</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sled"
                checked={settings.hasSled}
                onCheckedChange={(checked) => updateField('hasSled', checked === true)}
              />
              <Label htmlFor="sled" className="text-sm">{t('fields.hasSled')}</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="wallball"
                checked={settings.hasWallBall}
                onCheckedChange={(checked) => updateField('hasWallBall', checked === true)}
              />
              <Label htmlFor="wallball" className="text-sm">{t('fields.hasWallBall')}</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sandbag"
                checked={settings.hasSandbag}
                onCheckedChange={(checked) => updateField('hasSandbag', checked === true)}
              />
              <Label htmlFor="sandbag" className="text-sm">{t('fields.hasSandbag')}</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="farmers"
                checked={settings.hasFarmersCarryHandles}
                onCheckedChange={(checked) => updateField('hasFarmersCarryHandles', checked === true)}
              />
              <Label htmlFor="farmers" className="text-sm">{t('fields.hasFarmersCarryHandles')}</Label>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            {t('helpers.noEquipment')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
