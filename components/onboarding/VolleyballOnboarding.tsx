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

export interface VolleyballSettings {
  position: 'setter' | 'outside_hitter' | 'opposite_hitter' | 'middle_blocker' | 'libero'
  teamName: string
  leagueLevel: 'recreational' | 'division_3' | 'division_2' | 'division_1' | 'elitserien' | 'ssl'
  seasonPhase: 'off_season' | 'pre_season' | 'in_season' | 'playoffs'
  matchesPerWeek: number
  avgSetsPerMatch: number | null
  yearsPlaying: number
  playStyle: 'power' | 'finesse' | 'defensive' | 'allround'
  benchmarks: {
    verticalJump: number | null
    spikeJump: number | null
    blockJump: number | null
    standingReach: number | null
    agilityTTest: number | null
    sprint5m: number | null
    yoyoIR1Level: number | null
    squat: number | null
    powerClean: number | null
  }
  strengthFocus: string[]
  weaknesses: string[]
  injuryHistory: string[]
  weeklyTrainingSessions: number
  hasAccessToGym: boolean
  dominantHand: 'right' | 'left'
  height: number | null
  spikeHeight: number | null
  blockHeight: number | null
}

export const DEFAULT_VOLLEYBALL_SETTINGS: VolleyballSettings = {
  position: 'outside_hitter',
  teamName: '',
  leagueLevel: 'division_2',
  seasonPhase: 'in_season',
  matchesPerWeek: 1,
  avgSetsPerMatch: null,
  yearsPlaying: 1,
  playStyle: 'allround',
  benchmarks: {
    verticalJump: null,
    spikeJump: null,
    blockJump: null,
    standingReach: null,
    agilityTTest: null,
    sprint5m: null,
    yoyoIR1Level: null,
    squat: null,
    powerClean: null,
  },
  strengthFocus: [],
  weaknesses: [],
  injuryHistory: [],
  weeklyTrainingSessions: 3,
  hasAccessToGym: true,
  dominantHand: 'right',
  height: null,
  spikeHeight: null,
  blockHeight: null,
}

interface VolleyballOnboardingProps {
  settings: VolleyballSettings
  onUpdate: (settings: VolleyballSettings) => void
}

const POSITIONS = [
  { value: 'setter', labelKey: 'positions.setter.label', descriptionKey: 'positions.setter.description' },
  { value: 'outside_hitter', labelKey: 'positions.outsideHitter.label', descriptionKey: 'positions.outsideHitter.description' },
  { value: 'opposite_hitter', labelKey: 'positions.oppositeHitter.label', descriptionKey: 'positions.oppositeHitter.description' },
  { value: 'middle_blocker', labelKey: 'positions.middleBlocker.label', descriptionKey: 'positions.middleBlocker.description' },
  { value: 'libero', labelKey: 'positions.libero.label', descriptionKey: 'positions.libero.description' },
]

const LEAGUE_LEVELS = [
  { value: 'recreational', labelKey: 'leagueLevels.recreational' },
  { value: 'division_3', labelKey: 'leagueLevels.division3' },
  { value: 'division_2', labelKey: 'leagueLevels.division2' },
  { value: 'division_1', labelKey: 'leagueLevels.division1' },
  { value: 'elitserien', labelKey: 'leagueLevels.elitserien' },
  { value: 'ssl', labelKey: 'leagueLevels.ssl' },
]

const SEASON_PHASES = [
  { value: 'off_season', labelKey: 'seasonPhases.offSeason.label', descriptionKey: 'seasonPhases.offSeason.description' },
  { value: 'pre_season', labelKey: 'seasonPhases.preSeason.label', descriptionKey: 'seasonPhases.preSeason.description' },
  { value: 'in_season', labelKey: 'seasonPhases.inSeason.label', descriptionKey: 'seasonPhases.inSeason.description' },
  { value: 'playoffs', labelKey: 'seasonPhases.playoffs.label', descriptionKey: 'seasonPhases.playoffs.description' },
]

const PLAY_STYLES = [
  { value: 'power', labelKey: 'playStyles.power.label', descriptionKey: 'playStyles.power.description' },
  { value: 'finesse', labelKey: 'playStyles.finesse.label', descriptionKey: 'playStyles.finesse.description' },
  { value: 'defensive', labelKey: 'playStyles.defensive.label', descriptionKey: 'playStyles.defensive.description' },
  { value: 'allround', labelKey: 'playStyles.allround.label', descriptionKey: 'playStyles.allround.description' },
]

const STRENGTHS = [
  { id: 'vertical_jump', labelKey: 'strengths.verticalJump' },
  { id: 'spike_power', labelKey: 'strengths.spikePower' },
  { id: 'blocking', labelKey: 'strengths.blocking' },
  { id: 'serving', labelKey: 'strengths.serving' },
  { id: 'reception', labelKey: 'strengths.reception' },
  { id: 'defense', labelKey: 'strengths.defense' },
  { id: 'court_vision', labelKey: 'strengths.courtVision' },
  { id: 'agility', labelKey: 'strengths.agility' },
]

const INJURY_TYPES = [
  { id: 'shoulder', labelKey: 'injuries.shoulder' },
  { id: 'knee_patellar', labelKey: 'injuries.kneePatellar' },
  { id: 'knee_acl', labelKey: 'injuries.kneeAcl' },
  { id: 'ankle', labelKey: 'injuries.ankle' },
  { id: 'back', labelKey: 'injuries.back' },
  { id: 'finger', labelKey: 'injuries.finger' },
  { id: 'wrist', labelKey: 'injuries.wrist' },
]

export function VolleyballOnboarding({
  settings,
  onUpdate,
}: VolleyballOnboardingProps) {
  const [step, setStep] = useState(1)
  const [localSettings, setLocalSettings] = useState<VolleyballSettings>(settings)
  const t = useTranslations('components.onboarding.volleyball')

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

  const updateLocalSettings = (updates: Partial<VolleyballSettings>) => {
    const newSettings = { ...localSettings, ...updates }
    setLocalSettings(newSettings)
    onUpdate(newSettings)
  }

  const updateBenchmarks = (updates: Partial<VolleyballSettings['benchmarks']>) => {
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
          <Badge variant="outline" className="text-yellow-600">
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
          {step === 4 && t('stepTitles.jumpTests')}
          {step === 5 && t('stepTitles.physicalTests')}
          {step === 6 && t('stepTitles.strengthsAndWeaknesses')}
          {step === 7 && t('stepTitles.injuriesAndTraining')}
        </CardTitle>
        <CardDescription>
          {step === 1 && t('stepDescriptions.position')}
          {step === 2 && t('stepDescriptions.teamAndLevel')}
          {step === 3 && t('stepDescriptions.playStyleAndPhysical')}
          {step === 4 && t('stepDescriptions.jumpTests')}
          {step === 5 && t('stepDescriptions.physicalTests')}
          {step === 6 && t('stepDescriptions.strengthsAndWeaknesses')}
          {step === 7 && t('stepDescriptions.injuriesAndTraining')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Position */}
        {step === 1 && (
          <RadioGroup
            value={localSettings.position}
            onValueChange={(value) =>
              updateLocalSettings({ position: value as VolleyballSettings['position'] })
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
                  updateLocalSettings({ leagueLevel: value as VolleyballSettings['leagueLevel'] })
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
                  updateLocalSettings({ seasonPhase: value as VolleyballSettings['seasonPhase'] })
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
                  updateLocalSettings({ playStyle: value as VolleyballSettings['playStyle'] })
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

            <div className="grid grid-cols-3 gap-4">
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
                <Label htmlFor="spikeHeight">{t('fields.spikeHeight')}</Label>
                <Input
                  id="spikeHeight"
                  type="number"
                  min={200}
                  max={400}
                  value={localSettings.spikeHeight ?? ''}
                  onChange={(e) =>
                    updateLocalSettings({
                      spikeHeight: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.spikeHeight')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blockHeight">{t('fields.blockHeight')}</Label>
                <Input
                  id="blockHeight"
                  type="number"
                  min={200}
                  max={380}
                  value={localSettings.blockHeight ?? ''}
                  onChange={(e) =>
                    updateLocalSettings({
                      blockHeight: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.blockHeight')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avgSets">{t('fields.avgSetsPerMatch')}</Label>
              <Input
                id="avgSets"
                type="number"
                min={0}
                max={5}
                step={0.5}
                value={localSettings.avgSetsPerMatch ?? ''}
                onChange={(e) =>
                  updateLocalSettings({
                    avgSetsPerMatch: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder={t('placeholders.avgSetsPerMatch')}
              />
            </div>
          </div>
        )}

        {/* Step 4: Jump Tests */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-yellow-500" />
              <span className="font-medium">{t('sections.jumpTests')}</span>
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
                <p className="text-xs text-muted-foreground">{t('helpers.verticalJump')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="spikeJump">{t('fields.spikeJump')}</Label>
                <Input
                  id="spikeJump"
                  type="number"
                  value={localSettings.benchmarks.spikeJump ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      spikeJump: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.spikeJump')}
                />
                <p className="text-xs text-muted-foreground">{t('helpers.spikeJump')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="blockJump">{t('fields.blockJump')}</Label>
                <Input
                  id="blockJump"
                  type="number"
                  value={localSettings.benchmarks.blockJump ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      blockJump: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.blockJump')}
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
          </div>
        )}

        {/* Step 5: Other Physical Tests */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Dumbbell className="h-5 w-5 text-yellow-500" />
              <span className="font-medium">{t('sections.physicalTests')}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agilityTTest">{t('fields.agilityTTest')}</Label>
                <Input
                  id="agilityTTest"
                  type="number"
                  step="0.1"
                  value={localSettings.benchmarks.agilityTTest ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      agilityTTest: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.agilityTTest')}
                />
              </div>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="powerClean">{t('fields.powerClean')}</Label>
                <Input
                  id="powerClean"
                  type="number"
                  value={localSettings.benchmarks.powerClean ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      powerClean: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder={t('placeholders.powerClean')}
                />
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
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span className="font-medium">{t('sections.trainingConditions')}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weeklyTraining">{t('fields.weeklyTrainingSessions')}</Label>
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

export default VolleyballOnboarding
