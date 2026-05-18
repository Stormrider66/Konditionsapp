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

export interface BasketballSettings {
  position: 'point_guard' | 'shooting_guard' | 'small_forward' | 'power_forward' | 'center'
  teamName: string
  leagueLevel: 'recreational' | 'division_3' | 'division_2' | 'division_1' | 'basketligan' | 'sbl'
  seasonPhase: 'off_season' | 'pre_season' | 'in_season' | 'playoffs'
  matchesPerWeek: number
  avgMinutesPerMatch: number | null
  yearsPlaying: number
  playStyle: 'scoring' | 'playmaking' | 'defense' | 'rebounding' | 'allround'
  benchmarks: {
    verticalJump: number | null
    standingReach: number | null
    sprint3_4Court: number | null
    laneAgility: number | null
    shuttleRun: number | null
    benchPress: number | null
    squat: number | null
    yoyoIR1Level: number | null
  }
  strengthFocus: string[]
  weaknesses: string[]
  injuryHistory: string[]
  weeklyTrainingSessions: number
  hasAccessToGym: boolean
  shootingHand: 'right' | 'left'
  height: number | null
  wingspan: number | null
}

export const DEFAULT_BASKETBALL_SETTINGS: BasketballSettings = {
  position: 'point_guard',
  teamName: '',
  leagueLevel: 'division_2',
  seasonPhase: 'in_season',
  matchesPerWeek: 1,
  avgMinutesPerMatch: null,
  yearsPlaying: 1,
  playStyle: 'allround',
  benchmarks: {
    verticalJump: null,
    standingReach: null,
    sprint3_4Court: null,
    laneAgility: null,
    shuttleRun: null,
    benchPress: null,
    squat: null,
    yoyoIR1Level: null,
  },
  strengthFocus: [],
  weaknesses: [],
  injuryHistory: [],
  weeklyTrainingSessions: 3,
  hasAccessToGym: true,
  shootingHand: 'right',
  height: null,
  wingspan: null,
}

interface BasketballOnboardingProps {
  settings: BasketballSettings
  onUpdate: (settings: BasketballSettings) => void
}

const POSITIONS = [
  { value: 'point_guard', labelKey: 'positions.pointGuard.label', descriptionKey: 'positions.pointGuard.description' },
  { value: 'shooting_guard', labelKey: 'positions.shootingGuard.label', descriptionKey: 'positions.shootingGuard.description' },
  { value: 'small_forward', labelKey: 'positions.smallForward.label', descriptionKey: 'positions.smallForward.description' },
  { value: 'power_forward', labelKey: 'positions.powerForward.label', descriptionKey: 'positions.powerForward.description' },
  { value: 'center', labelKey: 'positions.center.label', descriptionKey: 'positions.center.description' },
]

const LEAGUE_LEVELS = [
  { value: 'recreational', labelKey: 'leagueLevels.recreational' },
  { value: 'division_3', labelKey: 'leagueLevels.division3' },
  { value: 'division_2', labelKey: 'leagueLevels.division2' },
  { value: 'division_1', labelKey: 'leagueLevels.division1' },
  { value: 'basketligan', labelKey: 'leagueLevels.basketligan' },
  { value: 'sbl', labelKey: 'leagueLevels.sbl' },
]

const SEASON_PHASES = [
  { value: 'off_season', labelKey: 'seasonPhases.offSeason.label', descriptionKey: 'seasonPhases.offSeason.description' },
  { value: 'pre_season', labelKey: 'seasonPhases.preSeason.label', descriptionKey: 'seasonPhases.preSeason.description' },
  { value: 'in_season', labelKey: 'seasonPhases.inSeason.label', descriptionKey: 'seasonPhases.inSeason.description' },
  { value: 'playoffs', labelKey: 'seasonPhases.playoffs.label', descriptionKey: 'seasonPhases.playoffs.description' },
]

const PLAY_STYLES = [
  { value: 'scoring', labelKey: 'playStyles.scoring.label', descriptionKey: 'playStyles.scoring.description' },
  { value: 'playmaking', labelKey: 'playStyles.playmaking.label', descriptionKey: 'playStyles.playmaking.description' },
  { value: 'defense', labelKey: 'playStyles.defense.label', descriptionKey: 'playStyles.defense.description' },
  { value: 'rebounding', labelKey: 'playStyles.rebounding.label', descriptionKey: 'playStyles.rebounding.description' },
  { value: 'allround', labelKey: 'playStyles.allround.label', descriptionKey: 'playStyles.allround.description' },
]

const STRENGTHS = [
  { id: 'vertical_jump', labelKey: 'strengths.verticalJump' },
  { id: 'speed', labelKey: 'strengths.speed' },
  { id: 'agility', labelKey: 'strengths.agility' },
  { id: 'strength', labelKey: 'strengths.strength' },
  { id: 'endurance', labelKey: 'strengths.endurance' },
  { id: 'shooting', labelKey: 'strengths.shooting' },
  { id: 'court_vision', labelKey: 'strengths.courtVision' },
  { id: 'defense', labelKey: 'strengths.defense' },
]

const INJURY_TYPES = [
  { id: 'ankle', labelKey: 'injuries.ankle' },
  { id: 'knee_acl', labelKey: 'injuries.kneeAcl' },
  { id: 'patellar', labelKey: 'injuries.patellar' },
  { id: 'back', labelKey: 'injuries.back' },
  { id: 'shoulder', labelKey: 'injuries.shoulder' },
  { id: 'groin', labelKey: 'injuries.groin' },
  { id: 'hamstring', labelKey: 'injuries.hamstring' },
  { id: 'finger', labelKey: 'injuries.finger' },
]

export function BasketballOnboarding({
  settings,
  onUpdate,
}: BasketballOnboardingProps) {
  const [step, setStep] = useState(1)
  const [localSettings, setLocalSettings] = useState<BasketballSettings>(settings)
  const t = useTranslations('components.onboarding.basketball')

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

  const updateLocalSettings = (updates: Partial<BasketballSettings>) => {
    const newSettings = { ...localSettings, ...updates }
    setLocalSettings(newSettings)
    onUpdate(newSettings)
  }

  const updateBenchmarks = (updates: Partial<BasketballSettings['benchmarks']>) => {
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
          <Badge variant="outline" className="text-orange-600">
            {t('badge')}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {t('stepProgress', { step, totalSteps })}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <CardTitle className="mt-4">
          {step === 1 && t('stepTitles.position')}
          {step === 2 && t('stepTitles.teamAndLevel')}
          {step === 3 && t('stepTitles.playStyleAndPhysical')}
          {step === 4 && t('stepTitles.physicalTests')}
          {step === 5 && t('stepTitles.strengthTests')}
          {step === 6 && t('stepTitles.strengthsAndWeaknesses')}
          {step === 7 && t('stepTitles.injuryHistory')}
        </CardTitle>
        <CardDescription>
          {step === 1 && t('stepDescriptions.position')}
          {step === 2 && t('stepDescriptions.teamAndLevel')}
          {step === 3 && t('stepDescriptions.playStyleAndPhysical')}
          {step === 4 && t('stepDescriptions.physicalTests')}
          {step === 5 && t('stepDescriptions.strengthTests')}
          {step === 6 && t('stepDescriptions.strengthsAndWeaknesses')}
          {step === 7 && t('stepDescriptions.injuryHistory')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Position */}
        {step === 1 && (
          <RadioGroup
            value={localSettings.position}
            onValueChange={(value) =>
              updateLocalSettings({ position: value as BasketballSettings['position'] })
            }
            className="space-y-3"
          >
            {POSITIONS.map((pos) => (
              <div key={pos.value} className="flex items-center space-x-3">
                <RadioGroupItem value={pos.value} id={pos.value} />
                <Label htmlFor={pos.value} className="flex-1 cursor-pointer">
                  <div className="font-medium">{t(pos.labelKey)}</div>
                  <div className="text-sm text-muted-foreground">{t(pos.descriptionKey)}</div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {/* Step 2: Team and Level */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="teamName">{t('fields.teamName')}</Label>
              <Input
                id="teamName"
                value={localSettings.teamName}
                onChange={(e) => updateLocalSettings({ teamName: e.target.value })}
                placeholder={t('placeholders.teamName')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('fields.leagueLevel')}</Label>
              <RadioGroup
                value={localSettings.leagueLevel}
                onValueChange={(value) =>
                  updateLocalSettings({ leagueLevel: value as BasketballSettings['leagueLevel'] })
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
                  updateLocalSettings({ seasonPhase: value as BasketballSettings['seasonPhase'] })
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
                  max={5}
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
                  max={40}
                  value={localSettings.yearsPlaying}
                  onChange={(e) =>
                    updateLocalSettings({ yearsPlaying: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Play style and physical */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>{t('fields.playStyle')}</Label>
              <RadioGroup
                value={localSettings.playStyle}
                onValueChange={(value) =>
                  updateLocalSettings({ playStyle: value as BasketballSettings['playStyle'] })
                }
                className="space-y-2"
              >
                {PLAY_STYLES.map((style) => (
                  <div key={style.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={style.value} id={`style-${style.value}`} />
                    <Label htmlFor={`style-${style.value}`} className="cursor-pointer">
                      <div>{t(style.labelKey)}</div>
                      <div className="text-xs text-muted-foreground">{t(style.descriptionKey)}</div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>{t('fields.shootingHand')}</Label>
              <RadioGroup
                value={localSettings.shootingHand}
                onValueChange={(value) =>
                  updateLocalSettings({ shootingHand: value as 'right' | 'left' })
                }
                className="flex space-x-4"
              >
                {[
                  { value: 'right', labelKey: 'shootingHands.right' },
                  { value: 'left', labelKey: 'shootingHands.left' },
                ].map((hand) => (
                  <div key={hand.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={hand.value} id={`hand-${hand.value}`} />
                    <Label htmlFor={`hand-${hand.value}`}>{t(hand.labelKey)}</Label>
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
                  min={150}
                  max={230}
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
                <Label htmlFor="wingspan">{t('fields.wingspan')}</Label>
                <Input
                  id="wingspan"
                  type="number"
                  min={150}
                  max={250}
                  value={localSettings.wingspan ?? ''}
                  onChange={(e) =>
                    updateLocalSettings({
                      wingspan: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.wingspan')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avgMinutes">{t('fields.avgMinutesPerMatch')}</Label>
              <Input
                id="avgMinutes"
                type="number"
                min={0}
                max={48}
                value={localSettings.avgMinutesPerMatch ?? ''}
                onChange={(e) =>
                  updateLocalSettings({
                    avgMinutesPerMatch: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder={t('placeholders.avgMinutesPerMatch')}
              />
            </div>
          </div>
        )}

        {/* Step 4: Physical Tests */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-orange-500" />
              <span className="font-medium">{t('sections.physicalTests')}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="verticalJump">{t('fields.verticalJump')}</Label>
                <Input
                  id="verticalJump"
                  type="number"
                  step="0.5"
                  value={localSettings.benchmarks.verticalJump ?? ''}
                  onChange={(e) =>
                  updateBenchmarks({
                      verticalJump: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.verticalJump')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="standingReach">{t('fields.standingReach')}</Label>
                <Input
                  id="standingReach"
                  type="number"
                  value={localSettings.benchmarks.standingReach ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      standingReach: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.standingReach')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sprint3_4Court">{t('fields.sprint3_4Court')}</Label>
                <Input
                  id="sprint3_4Court"
                  type="number"
                  step="0.01"
                  value={localSettings.benchmarks.sprint3_4Court ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      sprint3_4Court: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.sprint3_4Court')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="laneAgility">{t('fields.laneAgility')}</Label>
                <Input
                  id="laneAgility"
                  type="number"
                  step="0.1"
                  value={localSettings.benchmarks.laneAgility ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      laneAgility: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.laneAgility')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shuttleRun">{t('fields.shuttleRun')}</Label>
                <Input
                  id="shuttleRun"
                  type="number"
                  step="0.1"
                  value={localSettings.benchmarks.shuttleRun ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      shuttleRun: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.shuttleRun')}
                />
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
          </div>
        )}

        {/* Step 5: Strength Tests */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Dumbbell className="h-5 w-5 text-orange-500" />
              <span className="font-medium">{t('sections.strengthTests')}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="benchPress">{t('fields.benchPress')}</Label>
                <Input
                  id="benchPress"
                  type="number"
                  value={localSettings.benchmarks.benchPress ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      benchPress: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.benchPress')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="squat">{t('fields.squat')}</Label>
                <Input
                  id="squat"
                  type="number"
                  value={localSettings.benchmarks.squat ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      squat: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.squat')}
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {t('helpers.oneRMTip')}
            </p>
          </div>
        )}

        {/* Step 6: Strengths and Weaknesses */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-yellow-500" />
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
                <Trophy className="h-5 w-5 text-orange-500" />
                <span className="font-medium">{t('sections.trainingConditions')}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weeklyTraining">{t('fields.weeklyTraining')}</Label>
                <Input
                  id="weeklyTraining"
                  type="number"
                  min={0}
                  max={14}
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

export default BasketballOnboarding
