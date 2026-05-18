"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Trophy, Timer, Flame, Activity, Zap, Target, Shield } from 'lucide-react'
import { useTranslations } from 'next-intl'

export interface HandballSettings {
  position: 'goalkeeper' | 'wing' | 'back' | 'center_back' | 'pivot'
  positionSide: 'left' | 'right' | 'both' | 'center'
  teamName: string
  leagueLevel: 'recreational' | 'division_3' | 'division_2' | 'division_1' | 'allsvenskan' | 'handbollsligan'
  seasonPhase: 'off_season' | 'pre_season' | 'in_season' | 'playoffs'
  matchesPerWeek: number
  avgMinutesPerMatch: number | null
  yearsPlaying: number
  playStyle: 'offensive' | 'defensive' | 'all_round' | 'specialist'
  benchmarks: {
    yoyoIR1Level: number | null
    yoyoIR2Level: number | null
    sprint10m: number | null
    sprint20m: number | null
    cmjHeight: number | null
    medicineBallThrow: number | null
    tTestAgility: number | null
  }
  strengthFocus: string[]
  weaknesses: string[]
  injuryHistory: string[]
  weeklyTrainingSessions: number
  hasAccessToGym: boolean
  throwingArm: 'right' | 'left'
}

export const DEFAULT_HANDBALL_SETTINGS: HandballSettings = {
  position: 'back',
  positionSide: 'right',
  teamName: '',
  leagueLevel: 'recreational',
  seasonPhase: 'off_season',
  matchesPerWeek: 1,
  avgMinutesPerMatch: null,
  yearsPlaying: 0,
  playStyle: 'all_round',
  benchmarks: {
    yoyoIR1Level: null,
    yoyoIR2Level: null,
    sprint10m: null,
    sprint20m: null,
    cmjHeight: null,
    medicineBallThrow: null,
    tTestAgility: null,
  },
  strengthFocus: [],
  weaknesses: [],
  injuryHistory: [],
  weeklyTrainingSessions: 3,
  hasAccessToGym: true,
  throwingArm: 'right',
}

interface HandballOnboardingProps {
  settings: HandballSettings
  onUpdate: (settings: HandballSettings) => void
}

const POSITIONS = [
  { value: 'goalkeeper', labelKey: 'positions.goalkeeper.label', descriptionKey: 'positions.goalkeeper.description' },
  { value: 'wing', labelKey: 'positions.wing.label', descriptionKey: 'positions.wing.description' },
  { value: 'back', labelKey: 'positions.back.label', descriptionKey: 'positions.back.description' },
  { value: 'center_back', labelKey: 'positions.centerBack.label', descriptionKey: 'positions.centerBack.description' },
  { value: 'pivot', labelKey: 'positions.pivot.label', descriptionKey: 'positions.pivot.description' },
]

const POSITION_SIDES = {
  goalkeeper: [{ value: 'center', labelKey: 'positionSides.goalkeeper.center' }],
  wing: [
    { value: 'left', labelKey: 'positionSides.wing.left' },
    { value: 'right', labelKey: 'positionSides.wing.right' },
    { value: 'both', labelKey: 'positionSides.wing.both' },
  ],
  back: [
    { value: 'left', labelKey: 'positionSides.back.left' },
    { value: 'right', labelKey: 'positionSides.back.right' },
    { value: 'both', labelKey: 'positionSides.back.both' },
  ],
  center_back: [{ value: 'center', labelKey: 'positionSides.centerBack.center' }],
  pivot: [{ value: 'center', labelKey: 'positionSides.pivot.center' }],
}

const LEAGUE_LEVELS = [
  { value: 'recreational', labelKey: 'leagueLevels.recreational.label', descriptionKey: 'leagueLevels.recreational.description' },
  { value: 'division_3', labelKey: 'leagueLevels.division3.label', descriptionKey: 'leagueLevels.division3.description' },
  { value: 'division_2', labelKey: 'leagueLevels.division2.label', descriptionKey: 'leagueLevels.division2.description' },
  { value: 'division_1', labelKey: 'leagueLevels.division1.label', descriptionKey: 'leagueLevels.division1.description' },
  { value: 'allsvenskan', labelKey: 'leagueLevels.allsvenskan.label', descriptionKey: 'leagueLevels.allsvenskan.description' },
  { value: 'handbollsligan', labelKey: 'leagueLevels.handbollsligan.label', descriptionKey: 'leagueLevels.handbollsligan.description' },
]

const SEASON_PHASES = [
  { value: 'off_season', labelKey: 'seasonPhases.offSeason.label', descriptionKey: 'seasonPhases.offSeason.description' },
  { value: 'pre_season', labelKey: 'seasonPhases.preSeason.label', descriptionKey: 'seasonPhases.preSeason.description' },
  { value: 'in_season', labelKey: 'seasonPhases.inSeason.label', descriptionKey: 'seasonPhases.inSeason.description' },
  { value: 'playoffs', labelKey: 'seasonPhases.playoffs.label', descriptionKey: 'seasonPhases.playoffs.description' },
]

const PLAY_STYLES = [
  { value: 'offensive', labelKey: 'playStyles.offensive.label', descriptionKey: 'playStyles.offensive.description' },
  { value: 'defensive', labelKey: 'playStyles.defensive.label', descriptionKey: 'playStyles.defensive.description' },
  { value: 'all_round', labelKey: 'playStyles.allRound.label', descriptionKey: 'playStyles.allRound.description' },
  { value: 'specialist', labelKey: 'playStyles.specialist.label', descriptionKey: 'playStyles.specialist.description' },
]

const STRENGTH_FOCUS_OPTIONS = [
  { id: 'throwing_power', labelKey: 'strengths.throwingPower' },
  { id: 'sprint_speed', labelKey: 'strengths.sprintSpeed' },
  { id: 'jumping', labelKey: 'strengths.jumping' },
  { id: 'agility', labelKey: 'strengths.agility' },
  { id: 'endurance', labelKey: 'strengths.endurance' },
  { id: 'upper_body', labelKey: 'strengths.upperBody' },
  { id: 'core_stability', labelKey: 'strengths.coreStability' },
  { id: 'contact_strength', labelKey: 'strengths.contactStrength' },
]

const WEAKNESS_OPTIONS = [
  { id: 'weak_arm', labelKey: 'weaknesses.weakArm' },
  { id: 'finishing', labelKey: 'weaknesses.finishing' },
  { id: 'defense', labelKey: 'weaknesses.defense' },
  { id: 'positioning', labelKey: 'weaknesses.positioning' },
  { id: 'ball_handling', labelKey: 'weaknesses.ballHandling' },
  { id: 'passing', labelKey: 'weaknesses.passing' },
  { id: 'stamina', labelKey: 'weaknesses.stamina' },
  { id: 'decision_making', labelKey: 'weaknesses.decisionMaking' },
]

const INJURY_OPTIONS = [
  { id: 'shoulder', labelKey: 'injuries.shoulder' },
  { id: 'knee', labelKey: 'injuries.knee' },
  { id: 'knee_acl', labelKey: 'injuries.kneeAcl' },
  { id: 'ankle', labelKey: 'injuries.ankle' },
  { id: 'groin', labelKey: 'injuries.groin' },
  { id: 'back', labelKey: 'injuries.back' },
  { id: 'finger', labelKey: 'injuries.finger' },
  { id: 'elbow', labelKey: 'injuries.elbow' },
]

const POSITION_TIPS = {
  goalkeeper: ['tips.goalkeeper.1', 'tips.goalkeeper.2', 'tips.goalkeeper.3'],
  wing: ['tips.wing.1', 'tips.wing.2', 'tips.wing.3'],
  back: ['tips.back.1', 'tips.back.2', 'tips.back.3'],
  center_back: ['tips.centerBack.1', 'tips.centerBack.2', 'tips.centerBack.3'],
  pivot: ['tips.pivot.1', 'tips.pivot.2', 'tips.pivot.3'],
}

export function HandballOnboarding({ settings, onUpdate }: HandballOnboardingProps) {
  const t = useTranslations('components.onboarding.handball')

  const updateField = <K extends keyof HandballSettings>(field: K, value: HandballSettings[K]) => {
    onUpdate({ ...settings, [field]: value })
  }

  const updateBenchmark = <K extends keyof HandballSettings['benchmarks']>(
    field: K,
    value: HandballSettings['benchmarks'][K]
  ) => {
    onUpdate({
      ...settings,
      benchmarks: { ...settings.benchmarks, [field]: value },
    })
  }

  const toggleArrayItem = (
    field: 'strengthFocus' | 'weaknesses' | 'injuryHistory',
    itemId: string
  ) => {
    const currentArray = settings[field]
    const newArray = currentArray.includes(itemId)
      ? currentArray.filter((item) => item !== itemId)
      : [...currentArray, itemId]
    updateField(field, newArray)
  }

  const positionSides = POSITION_SIDES[settings.position] || []
  const positionTips = POSITION_TIPS[settings.position] || POSITION_TIPS.back
  const selectedPosition = POSITIONS.find((position) => position.value === settings.position)
  const positionLabel = selectedPosition?.value === 'center_back' ? 'centerBack' : selectedPosition?.value || 'back'

  return (
    <div className="space-y-6">
      {/* Position & Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            {t('sections.positionAndTeam.title')}
          </CardTitle>
          <CardDescription>{t('sections.positionAndTeam.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('labels.position')}</Label>
              <Select
                value={settings.position}
                onValueChange={(value) => {
                  const position = value as HandballSettings['position']
                  updateField('position', position)
                  const sides = POSITION_SIDES[position] || []
                  if (sides.length > 0) {
                    updateField('positionSide', sides[0].value as HandballSettings['positionSide'])
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('placeholders.position')} />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((pos) => (
                    <SelectItem key={pos.value} value={pos.value}>
                      <div>
                        <div className="font-medium">{t(pos.labelKey)}</div>
                        <div className="text-xs text-muted-foreground">{t(pos.descriptionKey)}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {positionSides.length > 1 && (
              <div className="space-y-2">
                <Label>{t('labels.positionSide')}</Label>
                <Select
                  value={settings.positionSide}
                  onValueChange={(value) =>
                    updateField('positionSide', value as HandballSettings['positionSide'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {positionSides.map((side) => (
                      <SelectItem key={side.value} value={side.value}>
                        {t(side.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('labels.teamName')}</Label>
            <Input
              value={settings.teamName}
              onChange={(e) => updateField('teamName', e.target.value)}
              placeholder={t('placeholders.teamName')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('labels.leagueLevel')}</Label>
              <Select
                value={settings.leagueLevel}
                onValueChange={(value) => updateField('leagueLevel', value as HandballSettings['leagueLevel'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('placeholders.leagueLevel')} />
                </SelectTrigger>
                <SelectContent>
                  {LEAGUE_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div>
                        <div className="font-medium">{t(level.labelKey)}</div>
                        <div className="text-xs text-muted-foreground">{t(level.descriptionKey)}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('labels.yearsPlaying')}</Label>
              <Input
                type="number"
                min={0}
                max={40}
                value={settings.yearsPlaying}
                onChange={(e) => updateField('yearsPlaying', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('labels.throwingArm')}</Label>
            <Select
              value={settings.throwingArm}
              onValueChange={(value) => updateField('throwingArm', value as HandballSettings['throwingArm'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="right">{t('throwingArms.right')}</SelectItem>
                <SelectItem value="left">{t('throwingArms.left')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Season & Match Load */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-blue-500" />
            {t('sections.seasonAndMatchLoad.title')}
          </CardTitle>
          <CardDescription>{t('sections.seasonAndMatchLoad.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('labels.currentSeasonPhase')}</Label>
            <Select
              value={settings.seasonPhase}
              onValueChange={(value) => updateField('seasonPhase', value as HandballSettings['seasonPhase'])}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('placeholders.seasonPhase')} />
              </SelectTrigger>
              <SelectContent>
                {SEASON_PHASES.map((phase) => (
                  <SelectItem key={phase.value} value={phase.value}>
                    <div>
                      <div className="font-medium">{t(phase.labelKey)}</div>
                      <div className="text-xs text-muted-foreground">{t(phase.descriptionKey)}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('labels.matchesPerWeek')}</Label>
              <Input
                type="number"
                min={0}
                max={4}
                value={settings.matchesPerWeek}
                onChange={(e) => updateField('matchesPerWeek', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.averageMinutesPerMatch')}</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={settings.avgMinutesPerMatch ?? ''}
                onChange={(e) => updateField('avgMinutesPerMatch', e.target.value ? parseInt(e.target.value) : null)}
                placeholder={t('placeholders.avgMinutesPerMatch')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.trainingSessionsPerWeek')}</Label>
              <Input
                type="number"
                min={0}
                max={12}
                value={settings.weeklyTrainingSessions}
                onChange={(e) => updateField('weeklyTrainingSessions', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Play Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            {t('sections.playStyle.title')}
          </CardTitle>
          <CardDescription>{t('sections.playStyle.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('labels.playStyle')}</Label>
            <Select
              value={settings.playStyle}
              onValueChange={(value) => updateField('playStyle', value as HandballSettings['playStyle'])}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('placeholders.playStyle')} />
              </SelectTrigger>
              <SelectContent>
                {PLAY_STYLES.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    <div>
                      <div className="font-medium">{t(style.labelKey)}</div>
                      <div className="text-xs text-muted-foreground">{t(style.descriptionKey)}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Physical Benchmarks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-red-500" />
            {t('sections.benchmarks.title')}
          </CardTitle>
          <CardDescription>{t('sections.benchmarks.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('benchmarks.yoyoIR1Level')}</Label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={25}
                value={settings.benchmarks.yoyoIR1Level ?? ''}
                onChange={(e) => updateBenchmark('yoyoIR1Level', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={t('placeholders.yoyoIR1Level')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('benchmarks.yoyoIR2Level')}</Label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={25}
                value={settings.benchmarks.yoyoIR2Level ?? ''}
                onChange={(e) => updateBenchmark('yoyoIR2Level', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={t('placeholders.yoyoIR2Level')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('benchmarks.sprint10m')}</Label>
              <Input
                type="number"
                step="0.01"
                min={1}
                max={3}
                value={settings.benchmarks.sprint10m ?? ''}
                onChange={(e) => updateBenchmark('sprint10m', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={t('placeholders.sprint10m')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('benchmarks.sprint20m')}</Label>
              <Input
                type="number"
                step="0.01"
                min={2}
                max={5}
                value={settings.benchmarks.sprint20m ?? ''}
                onChange={(e) => updateBenchmark('sprint20m', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={t('placeholders.sprint20m')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('benchmarks.cmjHeight')}</Label>
              <Input
                type="number"
                min={20}
                max={80}
                value={settings.benchmarks.cmjHeight ?? ''}
                onChange={(e) => updateBenchmark('cmjHeight', e.target.value ? parseInt(e.target.value) : null)}
                placeholder={t('placeholders.cmjHeight')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('benchmarks.medicineBallThrow')}</Label>
              <Input
                type="number"
                step="0.1"
                min={5}
                max={20}
                value={settings.benchmarks.medicineBallThrow ?? ''}
                onChange={(e) =>
                  updateBenchmark('medicineBallThrow', e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder={t('placeholders.medicineBallThrow')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('benchmarks.tTestAgility')}</Label>
              <Input
                type="number"
                step="0.1"
                min={7}
                max={15}
                value={settings.benchmarks.tTestAgility ?? ''}
                onChange={(e) => updateBenchmark('tTestAgility', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={t('placeholders.tTestAgility')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strengths & Focus Areas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            {t('sections.strengths.title')}
          </CardTitle>
          <CardDescription>{t('sections.strengths.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('labels.strengthFocus')}</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {STRENGTH_FOCUS_OPTIONS.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    settings.strengthFocus.includes(option.id)
                      ? 'bg-primary/10 border-primary'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => toggleArrayItem('strengthFocus', option.id)}
                >
                  <Checkbox
                    id={`strength-${option.id}`}
                    checked={settings.strengthFocus.includes(option.id)}
                    onCheckedChange={() => toggleArrayItem('strengthFocus', option.id)}
                  />
                  <Label htmlFor={`strength-${option.id}`} className="text-sm cursor-pointer">
                    {t(option.labelKey)}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('labels.weaknesses')}</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {WEAKNESS_OPTIONS.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    settings.weaknesses.includes(option.id)
                      ? 'bg-orange-500/10 border-orange-500'
                      : 'hover:border-orange-500/50'
                  }`}
                  onClick={() => toggleArrayItem('weaknesses', option.id)}
                >
                  <Checkbox
                    id={`weakness-${option.id}`}
                    checked={settings.weaknesses.includes(option.id)}
                    onCheckedChange={() => toggleArrayItem('weaknesses', option.id)}
                  />
                  <Label htmlFor={`weakness-${option.id}`} className="text-sm cursor-pointer">
                    {t(option.labelKey)}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Injury History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-red-500" />
            {t('sections.injuryHistory.title')}
          </CardTitle>
          <CardDescription>{t('sections.injuryHistory.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('labels.previousInjuries')}</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {INJURY_OPTIONS.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    settings.injuryHistory.includes(option.id)
                      ? 'bg-red-500/10 border-red-500'
                      : 'hover:border-red-500/50'
                  }`}
                  onClick={() => toggleArrayItem('injuryHistory', option.id)}
                >
                  <Checkbox
                    id={`injury-${option.id}`}
                    checked={settings.injuryHistory.includes(option.id)}
                    onCheckedChange={() => toggleArrayItem('injuryHistory', option.id)}
                  />
                  <Label htmlFor={`injury-${option.id}`} className="text-sm cursor-pointer">
                    {t(option.labelKey)}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {settings.injuryHistory.length > 0 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">{t('notes.injuryFocus')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Access + Position-specific tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-green-500" />
            {t('sections.trainingConditions.title')}
          </CardTitle>
          <CardDescription>{t('sections.trainingConditions.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasAccessToGym"
                checked={settings.hasAccessToGym}
                onCheckedChange={(checked) => updateField('hasAccessToGym', !!checked)}
              />
              <Label htmlFor="hasAccessToGym">{t('labels.hasAccessToGym')}</Label>
            </div>

            <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-medium text-sm">{t('tips.positionPrefix')} {t(`positions.${positionLabel}.label`)}</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {positionTips.map((tipKey) => (
                  <li key={tipKey}>- {t(tipKey)}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default HandballOnboarding
