'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useTranslations } from 'next-intl'
import {
  ChevronLeft,
  ChevronRight,
  Target,
  Activity,
  Trophy,
  Zap,
  Heart,
  Dumbbell,
} from 'lucide-react'

export interface TennisSettings {
  playStyle: 'aggressive_baseliner' | 'serve_and_volleyer' | 'all_court' | 'counter_puncher' | 'big_server'
  clubName: string
  leagueLevel: 'recreational' | 'club' | 'division_4' | 'division_3' | 'division_2' | 'division_1' | 'elitserien' | 'atp_wta'
  seasonPhase: 'off_season' | 'pre_season' | 'in_season' | 'tournament'
  matchesPerWeek: number
  yearsPlaying: number
  preferredSurface: 'hard' | 'clay' | 'grass' | 'indoor' | 'all'
  benchmarks: {
    sprint5m: number | null
    sprint10m: number | null
    sprint20m: number | null
    agilitySpider: number | null
    agility505: number | null
    verticalJump: number | null
    medicineBallThrow: number | null
    yoyoIR1Level: number | null
    shoulderStrengthRatio: number | null
    gripStrength: number | null
  }
  strengthFocus: string[]
  weaknesses: string[]
  injuryHistory: string[]
  weeklyTrainingSessions: number
  hasAccessToGym: boolean
  dominantHand: 'right' | 'left'
  height: number | null
  serveSpeed: number | null
  forehandGrip: 'eastern' | 'semi_western' | 'western' | 'continental'
  backhandType: 'one_handed' | 'two_handed'
}

export const DEFAULT_TENNIS_SETTINGS: TennisSettings = {
  playStyle: 'aggressive_baseliner',
  clubName: '',
  leagueLevel: 'club',
  seasonPhase: 'in_season',
  matchesPerWeek: 1,
  yearsPlaying: 1,
  preferredSurface: 'hard',
  benchmarks: {
    sprint5m: null,
    sprint10m: null,
    sprint20m: null,
    agilitySpider: null,
    agility505: null,
    verticalJump: null,
    medicineBallThrow: null,
    yoyoIR1Level: null,
    shoulderStrengthRatio: null,
    gripStrength: null,
  },
  strengthFocus: [],
  weaknesses: [],
  injuryHistory: [],
  weeklyTrainingSessions: 3,
  hasAccessToGym: true,
  dominantHand: 'right',
  height: null,
  serveSpeed: null,
  forehandGrip: 'semi_western',
  backhandType: 'two_handed',
}

interface TennisOnboardingProps {
  settings: TennisSettings
  onUpdate: (settings: TennisSettings) => void
}

const PLAY_STYLES = [
  { value: 'aggressive_baseliner', labelKey: 'playStyles.aggressiveBaseliner.label', descriptionKey: 'playStyles.aggressiveBaseliner.description' },
  { value: 'serve_and_volleyer', labelKey: 'playStyles.serveAndVolleyer.label', descriptionKey: 'playStyles.serveAndVolleyer.description' },
  { value: 'all_court', labelKey: 'playStyles.allCourt.label', descriptionKey: 'playStyles.allCourt.description' },
  { value: 'counter_puncher', labelKey: 'playStyles.counterPuncher.label', descriptionKey: 'playStyles.counterPuncher.description' },
  { value: 'big_server', labelKey: 'playStyles.bigServer.label', descriptionKey: 'playStyles.bigServer.description' },
]

const LEAGUE_LEVELS = [
  { value: 'recreational', labelKey: 'leagueLevels.recreational' },
  { value: 'club', labelKey: 'leagueLevels.club' },
  { value: 'division_4', labelKey: 'leagueLevels.division4' },
  { value: 'division_3', labelKey: 'leagueLevels.division3' },
  { value: 'division_2', labelKey: 'leagueLevels.division2' },
  { value: 'division_1', labelKey: 'leagueLevels.division1' },
  { value: 'elitserien', labelKey: 'leagueLevels.elitserien' },
  { value: 'atp_wta', labelKey: 'leagueLevels.atpWta' },
]

const SEASON_PHASES = [
  { value: 'off_season', labelKey: 'seasonPhases.offSeason.label', descriptionKey: 'seasonPhases.offSeason.description' },
  { value: 'pre_season', labelKey: 'seasonPhases.preSeason.label', descriptionKey: 'seasonPhases.preSeason.description' },
  { value: 'in_season', labelKey: 'seasonPhases.inSeason.label', descriptionKey: 'seasonPhases.inSeason.description' },
  { value: 'tournament', labelKey: 'seasonPhases.tournament.label', descriptionKey: 'seasonPhases.tournament.description' },
]

const SURFACES = [
  { value: 'hard', labelKey: 'surfaces.hard' },
  { value: 'clay', labelKey: 'surfaces.clay' },
  { value: 'grass', labelKey: 'surfaces.grass' },
  { value: 'indoor', labelKey: 'surfaces.indoor' },
  { value: 'all', labelKey: 'surfaces.all' },
]

const FOREHAND_GRIPS = [
  { value: 'eastern', labelKey: 'forehandGrips.eastern' },
  { value: 'semi_western', labelKey: 'forehandGrips.semiWestern' },
  { value: 'western', labelKey: 'forehandGrips.western' },
  { value: 'continental', labelKey: 'forehandGrips.continental' },
]

const BACKHAND_TYPES = [
  { value: 'one_handed', labelKey: 'backhandTypes.oneHanded' },
  { value: 'two_handed', labelKey: 'backhandTypes.twoHanded' },
]

const STRENGTHS = [
  { id: 'serve', labelKey: 'strengths.serve' },
  { id: 'forehand', labelKey: 'strengths.forehand' },
  { id: 'backhand', labelKey: 'strengths.backhand' },
  { id: 'volley', labelKey: 'strengths.volley' },
  { id: 'return', labelKey: 'strengths.return' },
  { id: 'movement', labelKey: 'strengths.movement' },
  { id: 'mental', labelKey: 'strengths.mental' },
  { id: 'endurance', labelKey: 'strengths.endurance' },
]

const INJURY_TYPES = [
  { id: 'shoulder', labelKey: 'injuries.shoulder' },
  { id: 'elbow', labelKey: 'injuries.elbow' },
  { id: 'wrist', labelKey: 'injuries.wrist' },
  { id: 'back', labelKey: 'injuries.back' },
  { id: 'knee', labelKey: 'injuries.knee' },
  { id: 'ankle', labelKey: 'injuries.ankle' },
  { id: 'hip', labelKey: 'injuries.hip' },
  { id: 'abdominal', labelKey: 'injuries.abdominal' },
]

export function TennisOnboarding({
  settings,
  onUpdate,
}: TennisOnboardingProps) {
  const [step, setStep] = useState(1)
  const [localSettings, setLocalSettings] = useState<TennisSettings>(settings)
  const t = useTranslations('components.onboarding.tennis')

  const totalSteps = 7
  const progress = (step / totalSteps) * 100

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const updateLocalSettings = (updates: Partial<TennisSettings>) => {
    const newSettings = { ...localSettings, ...updates }
    setLocalSettings(newSettings)
    onUpdate(newSettings)
  }

  const updateBenchmarks = (updates: Partial<TennisSettings['benchmarks']>) => {
    const newSettings = {
      ...localSettings,
      benchmarks: { ...localSettings.benchmarks, ...updates },
    }
    setLocalSettings(newSettings)
    onUpdate(newSettings)
  }

  const toggleArrayItem = (
    field: 'strengthFocus' | 'weaknesses' | 'injuryHistory',
    value: string
  ) => {
    const array = localSettings[field]
    const newArray = array.includes(value)
      ? array.filter((item) => item !== value)
      : [...array, value]
    const newSettings = { ...localSettings, [field]: newArray }
    setLocalSettings(newSettings)
    onUpdate(newSettings)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-green-600">
            {t('badge')}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {t('stepProgress', { step, totalSteps })}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <CardTitle className="mt-4">
          {step === 1 && t('stepTitles.playStyle')}
          {step === 2 && t('stepTitles.clubAndLevel')}
          {step === 3 && t('stepTitles.techniqueAndPhysical')}
          {step === 4 && t('stepTitles.speedTests')}
          {step === 5 && t('stepTitles.strengthAndEndurance')}
          {step === 6 && t('stepTitles.strengthsAndWeaknesses')}
          {step === 7 && t('stepTitles.injuriesAndTraining')}
        </CardTitle>
        <CardDescription>
          {step === 1 && t('stepDescriptions.playStyle')}
          {step === 2 && t('stepDescriptions.clubAndLevel')}
          {step === 3 && t('stepDescriptions.techniqueAndPhysical')}
          {step === 4 && t('stepDescriptions.speedTests')}
          {step === 5 && t('stepDescriptions.strengthAndEndurance')}
          {step === 6 && t('stepDescriptions.strengthsAndWeaknesses')}
          {step === 7 && t('stepDescriptions.injuriesAndTraining')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Play Style */}
        {step === 1 && (
          <RadioGroup
            value={localSettings.playStyle}
            onValueChange={(value) =>
              updateLocalSettings({ playStyle: value as TennisSettings['playStyle'] })
            }
            className="space-y-3"
          >
            {PLAY_STYLES.map((style) => (
              <div key={style.value} className="flex items-center space-x-3">
                <RadioGroupItem value={style.value} id={style.value} />
                <Label htmlFor={style.value} className="flex-1 cursor-pointer">
                  <div className="font-medium">{t(style.labelKey)}</div>
                  <div className="text-sm text-muted-foreground">{t(style.descriptionKey)}</div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {/* Step 2: Club and Level */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="clubName">{t('fields.clubName')}</Label>
              <Input
                id="clubName"
                value={localSettings.clubName}
                onChange={(e) => updateLocalSettings({ clubName: e.target.value })}
                placeholder={t('placeholders.clubName')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fields.leagueLevel')}</Label>
              <RadioGroup
                value={localSettings.leagueLevel}
                onValueChange={(value) =>
                  updateLocalSettings({ leagueLevel: value as TennisSettings['leagueLevel'] })
                }
                className="space-y-2"
              >
                {LEAGUE_LEVELS.map((level) => (
                  <div key={level.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={level.value} id={`league-${level.value}`} />
                    <Label htmlFor={`league-${level.value}`}>{t(level.labelKey)}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>{t('fields.seasonPhase')}</Label>
              <RadioGroup
                value={localSettings.seasonPhase}
                onValueChange={(value) =>
                  updateLocalSettings({ seasonPhase: value as TennisSettings['seasonPhase'] })
                }
                className="space-y-2"
              >
                {SEASON_PHASES.map((phase) => (
                  <div key={phase.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={phase.value} id={`phase-${phase.value}`} />
                    <Label htmlFor={`phase-${phase.value}`} className="cursor-pointer">
                      <div>{t(phase.labelKey)}</div>
                      <div className="text-xs text-muted-foreground">{t(phase.descriptionKey)}</div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="matchesPerWeek">{t('fields.matchesPerWeek')}</Label>
                <Input
                  id="matchesPerWeek"
                  type="number"
                  min={0}
                  max={10}
                  value={localSettings.matchesPerWeek}
                  onChange={(e) =>
                    updateLocalSettings({ matchesPerWeek: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearsPlaying">{t('fields.yearsPlaying')}</Label>
                <Input
                  id="yearsPlaying"
                  type="number"
                  min={0}
                  max={50}
                  value={localSettings.yearsPlaying}
                  onChange={(e) =>
                    updateLocalSettings({ yearsPlaying: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Technique and Physical */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>{t('fields.preferredSurface')}</Label>
              <RadioGroup
                value={localSettings.preferredSurface}
                onValueChange={(value) =>
                  updateLocalSettings({ preferredSurface: value as TennisSettings['preferredSurface'] })
                }
                className="flex flex-wrap gap-4"
              >
                {SURFACES.map((surface) => (
                  <div key={surface.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={surface.value} id={`surface-${surface.value}`} />
                    <Label htmlFor={`surface-${surface.value}`}>{t(surface.labelKey)}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>{t('fields.dominantHand')}</Label>
              <RadioGroup
                value={localSettings.dominantHand}
                onValueChange={(value) =>
                  updateLocalSettings({ dominantHand: value as 'right' | 'left' })
                }
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="right" id="hand-right" />
                  <Label htmlFor="hand-right">{t('handedness.right')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="left" id="hand-left" />
                  <Label htmlFor="hand-left">{t('handedness.left')}</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>{t('fields.forehandGrip')}</Label>
              <RadioGroup
                value={localSettings.forehandGrip}
                onValueChange={(value) =>
                  updateLocalSettings({ forehandGrip: value as TennisSettings['forehandGrip'] })
                }
                className="flex flex-wrap gap-4"
              >
                {FOREHAND_GRIPS.map((grip) => (
                  <div key={grip.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={grip.value} id={`grip-${grip.value}`} />
                    <Label htmlFor={`grip-${grip.value}`}>{t(grip.labelKey)}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>{t('fields.backhandType')}</Label>
              <RadioGroup
                value={localSettings.backhandType}
                onValueChange={(value) =>
                  updateLocalSettings({ backhandType: value as 'one_handed' | 'two_handed' })
                }
                className="flex space-x-4"
              >
                {BACKHAND_TYPES.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={type.value} id={`bh-${type.value}`} />
                    <Label htmlFor={`bh-${type.value}`}>{t(type.labelKey)}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">{t('fields.height')}</Label>
                <Input
                  id="height"
                  type="number"
                  min={140}
                  max={220}
                  value={localSettings.height ?? ''}
                  onChange={(e) =>
                    updateLocalSettings({
                      height: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.height')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serveSpeed">{t('fields.serveSpeed')}</Label>
                <Input
                  id="serveSpeed"
                  type="number"
                  min={80}
                  max={260}
                  value={localSettings.serveSpeed ?? ''}
                  onChange={(e) =>
                    updateLocalSettings({
                      serveSpeed: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.serveSpeed')}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Speed Tests */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-green-500" />
              <span className="font-medium">{t('sections.speedTests')}</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sprint5m">{t('fields.sprint5m')}</Label>
                <Input
                  id="sprint5m"
                  type="number"
                  step="0.01"
                  value={localSettings.benchmarks.sprint5m ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      sprint5m: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.sprint5m')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sprint10m">{t('fields.sprint10m')}</Label>
                <Input
                  id="sprint10m"
                  type="number"
                  step="0.01"
                  value={localSettings.benchmarks.sprint10m ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      sprint10m: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.sprint10m')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sprint20m">{t('fields.sprint20m')}</Label>
                <Input
                  id="sprint20m"
                  type="number"
                  step="0.01"
                  value={localSettings.benchmarks.sprint20m ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      sprint20m: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.sprint20m')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agilitySpider">{t('fields.agilitySpider')}</Label>
                <Input
                  id="agilitySpider"
                  type="number"
                  step="0.1"
                  value={localSettings.benchmarks.agilitySpider ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      agilitySpider: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.agilitySpider')}
                />
                <p className="text-xs text-muted-foreground">{t('helpers.agilityTest')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="agility505">{t('fields.agility505')}</Label>
                <Input
                  id="agility505"
                  type="number"
                  step="0.01"
                  value={localSettings.benchmarks.agility505 ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      agility505: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.agility505')}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Power and Endurance */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Dumbbell className="h-5 w-5 text-green-500" />
              <span className="font-medium">{t('sections.strengthAndEndurance')}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="verticalJump">{t('fields.verticalJump')}</Label>
                <Input
                  id="verticalJump"
                  type="number"
                  value={localSettings.benchmarks.verticalJump ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      verticalJump: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.verticalJump')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medicineBallThrow">{t('fields.medicineBallThrow')}</Label>
                <Input
                  id="medicineBallThrow"
                  type="number"
                  step="0.1"
                  value={localSettings.benchmarks.medicineBallThrow ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      medicineBallThrow: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.medicineBallThrow')}
                />
                <p className="text-xs text-muted-foreground">{t('helpers.medicineBallThrow')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gripStrength">{t('fields.gripStrength')}</Label>
                <Input
                  id="gripStrength"
                  type="number"
                  value={localSettings.benchmarks.gripStrength ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      gripStrength: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.gripStrength')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shoulderRatio">{t('fields.shoulderStrengthRatio')}</Label>
                <Input
                  id="shoulderRatio"
                  type="number"
                  value={localSettings.benchmarks.shoulderStrengthRatio ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      shoulderStrengthRatio: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.shoulderStrengthRatio')}
                />
                <p className="text-xs text-muted-foreground">{t('helpers.shoulderRatio')}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yoyoIR1Level">{t('fields.yoyoIR1Level')}</Label>
              <Input
                id="yoyoIR1Level"
                type="number"
                step="0.1"
                value={localSettings.benchmarks.yoyoIR1Level ?? ''}
                onChange={(e) =>
                  updateBenchmarks({
                    yoyoIR1Level: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder={t('placeholders.yoyoIR1Level')}
              />
            </div>
          </div>
        )}

        {/* Step 6: Strengths and Weaknesses */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-green-500" />
                <span className="font-medium">{t('sections.strengths')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {STRENGTHS.map((strength) => (
                  <div key={strength.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`strength-${strength.id}`}
                      checked={localSettings.strengthFocus.includes(strength.id)}
                      onCheckedChange={() => toggleArrayItem('strengthFocus', strength.id)}
                    />
                    <Label htmlFor={`strength-${strength.id}`} className="text-sm cursor-pointer">
                      {t(strength.labelKey)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-blue-500" />
                <span className="font-medium">{t('sections.weaknesses')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {STRENGTHS.map((strength) => (
                  <div key={strength.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`weakness-${strength.id}`}
                      checked={localSettings.weaknesses.includes(strength.id)}
                      onCheckedChange={() => toggleArrayItem('weaknesses', strength.id)}
                    />
                    <Label htmlFor={`weakness-${strength.id}`} className="text-sm cursor-pointer">
                      {t(strength.labelKey)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Injury History and Training */}
        {step === 7 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-5 w-5 text-red-500" />
                <span className="font-medium">{t('sections.injuries')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {INJURY_TYPES.map((injury) => (
                  <div key={injury.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`injury-${injury.id}`}
                      checked={localSettings.injuryHistory.includes(injury.id)}
                      onCheckedChange={() => toggleArrayItem('injuryHistory', injury.id)}
                    />
                    <Label htmlFor={`injury-${injury.id}`} className="text-sm cursor-pointer">
                      {t(injury.labelKey)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-green-500" />
                <span className="font-medium">{t('sections.trainingConditions')}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weeklyTraining">{t('fields.weeklyTrainingSessions')}</Label>
                <Input
                  id="weeklyTraining"
                  type="number"
                  min={0}
                  max={20}
                  value={localSettings.weeklyTrainingSessions}
                  onChange={(e) =>
                    updateLocalSettings({ weeklyTrainingSessions: parseInt(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="gymAccess"
                  checked={localSettings.hasAccessToGym}
                  onCheckedChange={(checked) =>
                    updateLocalSettings({ hasAccessToGym: checked as boolean })
                  }
                />
                <Label htmlFor="gymAccess" className="cursor-pointer">
                  {t('fields.gymAccess')}
                </Label>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {t('actions.back')}
          </Button>
          <Button onClick={handleNext}>
            {t('actions.next')}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default TennisOnboarding
