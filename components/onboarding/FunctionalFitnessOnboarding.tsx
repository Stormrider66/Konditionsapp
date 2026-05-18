'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Dumbbell, Timer, Target, Flame, Medal, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'

// ==================== TYPES ====================

export interface FunctionalFitnessSettings {
  // Experience
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'competitor'
  yearsTraining: number

  // Focus
  primaryFocus: 'general' | 'strength' | 'endurance' | 'gymnastics' | 'competition'

  // Gym setup
  gymType: 'commercial' | 'functional_box' | 'home' | 'garage'
  equipmentAvailable: string[]

  // Benchmarks
  benchmarks: {
    // Metabolic workouts (times in seconds)
    fran: number | null         // 21-15-9 Thrusters + Pull-ups
    grace: number | null        // 30 Clean & Jerks for time
    diane: number | null        // 21-15-9 Deadlifts + HSPU
    helen: number | null        // 3 rounds: 400m + KB swings + Pull-ups
    murph: number | null        // 1mi + 100 PU + 200 Push + 300 Sq + 1mi

    // Strength 1RMs (kg)
    cleanAndJerk1RM: number | null
    snatch1RM: number | null
    backSquat1RM: number | null
    deadlift1RM: number | null
    strictPress1RM: number | null
    frontSquat1RM: number | null

    // Gymnastics max reps
    maxPullUps: number | null
    maxMuscleUps: number | null
    maxHSPU: number | null
    maxDoubleUnders: number | null
  }

  // Skill levels
  gymnasticsSkills: {
    pullUps: 'none' | 'banded' | 'strict' | 'kipping' | 'butterfly' | 'muscle_up'
    handstandPushUps: 'none' | 'pike' | 'box' | 'wall' | 'strict' | 'kipping' | 'freestanding'
    toeToBar: 'none' | 'hanging_knee' | 'kipping' | 'strict'
    doubleUnders: 'none' | 'learning' | 'consistent' | 'unbroken_50'
    ropeClimbs: 'none' | 'with_legs' | 'legless'
    ringDips: 'none' | 'banded' | 'strict' | 'kipping'
    handstandWalk: 'none' | 'wall_walks' | 'short_distance' | 'proficient'
  }

  // Olympic lifting comfort
  olympicLiftingLevel: 'none' | 'learning' | 'competent' | 'proficient'

  // Training preferences
  preferredWODDuration: number  // minutes
  weeklyTrainingDays: number
  competitionInterest: boolean
}

export const DEFAULT_FUNCTIONAL_FITNESS_SETTINGS: FunctionalFitnessSettings = {
  experienceLevel: 'beginner',
  yearsTraining: 0,
  primaryFocus: 'general',
  gymType: 'commercial',
  equipmentAvailable: [],
  benchmarks: {
    fran: null,
    grace: null,
    diane: null,
    helen: null,
    murph: null,
    cleanAndJerk1RM: null,
    snatch1RM: null,
    backSquat1RM: null,
    deadlift1RM: null,
    strictPress1RM: null,
    frontSquat1RM: null,
    maxPullUps: null,
    maxMuscleUps: null,
    maxHSPU: null,
    maxDoubleUnders: null,
  },
  gymnasticsSkills: {
    pullUps: 'none',
    handstandPushUps: 'none',
    toeToBar: 'none',
    doubleUnders: 'none',
    ropeClimbs: 'none',
    ringDips: 'none',
    handstandWalk: 'none',
  },
  olympicLiftingLevel: 'none',
  preferredWODDuration: 20,
  weeklyTrainingDays: 4,
  competitionInterest: false,
}

// ==================== CONSTANTS ====================

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'experienceLevels.beginner.label', description: 'experienceLevels.beginner.description' },
  { value: 'intermediate', label: 'experienceLevels.intermediate.label', description: 'experienceLevels.intermediate.description' },
  { value: 'advanced', label: 'experienceLevels.advanced.label', description: 'experienceLevels.advanced.description' },
  { value: 'competitor', label: 'experienceLevels.competitor.label', description: 'experienceLevels.competitor.description' },
]

const PRIMARY_FOCUS = [
  { value: 'general', label: 'focusOptions.general.label', description: 'focusOptions.general.description' },
  { value: 'strength', label: 'focusOptions.strength.label', description: 'focusOptions.strength.description' },
  { value: 'endurance', label: 'focusOptions.endurance.label', description: 'focusOptions.endurance.description' },
  { value: 'gymnastics', label: 'focusOptions.gymnastics.label', description: 'focusOptions.gymnastics.description' },
  { value: 'competition', label: 'focusOptions.competition.label', description: 'focusOptions.competition.description' },
]

const GYM_TYPES = [
  { value: 'commercial', label: 'gymTypes.commercial' },
  { value: 'functional_box', label: 'gymTypes.functionalBox' },
  { value: 'home', label: 'gymTypes.home' },
  { value: 'garage', label: 'gymTypes.garage' },
]

const EQUIPMENT_OPTIONS = [
  { id: 'barbell', label: 'equipmentOptions.barbell' },
  { id: 'dumbbells', label: 'equipmentOptions.dumbbells' },
  { id: 'kettlebells', label: 'equipmentOptions.kettlebells' },
  { id: 'pull_up_bar', label: 'equipmentOptions.pullUpBar' },
  { id: 'rings', label: 'equipmentOptions.rings' },
  { id: 'rower', label: 'equipmentOptions.rower' },
  { id: 'ski_erg', label: 'equipmentOptions.skiErg' },
  { id: 'assault_bike', label: 'equipmentOptions.assaultBike' },
  { id: 'plyo_box', label: 'equipmentOptions.plyoBox' },
  { id: 'wall_ball', label: 'equipmentOptions.wallBall' },
  { id: 'rope', label: 'equipmentOptions.rope' },
  { id: 'ghd', label: 'equipmentOptions.ghd' },
  { id: 'sled', label: 'equipmentOptions.sled' },
  { id: 'sandbag', label: 'equipmentOptions.sandbag' },
  { id: 'jump_rope', label: 'equipmentOptions.jumpRope' },
]

const PULL_UP_LEVELS = [
  { value: 'none', label: 'pullUpLevels.none' },
  { value: 'banded', label: 'pullUpLevels.banded' },
  { value: 'strict', label: 'pullUpLevels.strict' },
  { value: 'kipping', label: 'pullUpLevels.kipping' },
  { value: 'butterfly', label: 'pullUpLevels.butterfly' },
  { value: 'muscle_up', label: 'pullUpLevels.muscleUp' },
]

const HSPU_LEVELS = [
  { value: 'none', label: 'hspuLevels.none' },
  { value: 'pike', label: 'hspuLevels.pike' },
  { value: 'box', label: 'hspuLevels.box' },
  { value: 'wall', label: 'hspuLevels.wallFacing' },
  { value: 'strict', label: 'hspuLevels.strict' },
  { value: 'kipping', label: 'hspuLevels.kipping' },
  { value: 'freestanding', label: 'hspuLevels.freestanding' },
]

const TTB_LEVELS = [
  { value: 'none', label: 'toesToBarLevels.none' },
  { value: 'hanging_knee', label: 'toesToBarLevels.hangingKnee' },
  { value: 'kipping', label: 'toesToBarLevels.kipping' },
  { value: 'strict', label: 'toesToBarLevels.strict' },
]

const DU_LEVELS = [
  { value: 'none', label: 'doubleUndersLevels.none' },
  { value: 'learning', label: 'doubleUndersLevels.learning' },
  { value: 'consistent', label: 'doubleUndersLevels.consistent' },
  { value: 'unbroken_50', label: 'doubleUndersLevels.unbroken50' },
]

const ROPE_CLIMB_LEVELS = [
  { value: 'none', label: 'ropeClimbLevels.none' },
  { value: 'with_legs', label: 'ropeClimbLevels.withLegs' },
  { value: 'legless', label: 'ropeClimbLevels.legless' },
]

const RING_DIP_LEVELS = [
  { value: 'none', label: 'ringDipsLevels.none' },
  { value: 'banded', label: 'ringDipsLevels.banded' },
  { value: 'strict', label: 'ringDipsLevels.strict' },
  { value: 'kipping', label: 'ringDipsLevels.kipping' },
]

const HS_WALK_LEVELS = [
  { value: 'none', label: 'hsWalkLevels.none' },
  { value: 'wall_walks', label: 'hsWalkLevels.wallWalks' },
  { value: 'short_distance', label: 'hsWalkLevels.shortDistance' },
  { value: 'proficient', label: 'hsWalkLevels.proficient' },
]

const OLYMPIC_LIFTING_LEVELS = [
  { value: 'none', label: 'olympicLiftingLevels.none.label', description: 'olympicLiftingLevels.none.description' },
  { value: 'learning', label: 'olympicLiftingLevels.learning.label', description: 'olympicLiftingLevels.learning.description' },
  { value: 'competent', label: 'olympicLiftingLevels.competent.label', description: 'olympicLiftingLevels.competent.description' },
  { value: 'proficient', label: 'olympicLiftingLevels.proficient.label', description: 'olympicLiftingLevels.proficient.description' },
]

// ==================== COMPONENT ====================

interface FunctionalFitnessOnboardingProps {
  settings: FunctionalFitnessSettings
  onUpdate: (settings: FunctionalFitnessSettings) => void
}

export function FunctionalFitnessOnboarding({ settings, onUpdate }: FunctionalFitnessOnboardingProps) {
  const t = useTranslations('components.onboarding.functionalFitness')
  const updateField = <K extends keyof FunctionalFitnessSettings>(field: K, value: FunctionalFitnessSettings[K]) => {
    onUpdate({ ...settings, [field]: value })
  }

  const updateBenchmark = <K extends keyof FunctionalFitnessSettings['benchmarks']>(
    field: K,
    value: FunctionalFitnessSettings['benchmarks'][K]
  ) => {
    onUpdate({
      ...settings,
      benchmarks: { ...settings.benchmarks, [field]: value }
    })
  }

  const updateGymnasticsSkill = <K extends keyof FunctionalFitnessSettings['gymnasticsSkills']>(
    field: K,
    value: FunctionalFitnessSettings['gymnasticsSkills'][K]
  ) => {
    onUpdate({
      ...settings,
      gymnasticsSkills: { ...settings.gymnasticsSkills, [field]: value }
    })
  }

  const toggleEquipment = (equipmentId: string) => {
    const newEquipment = settings.equipmentAvailable.includes(equipmentId)
      ? settings.equipmentAvailable.filter(e => e !== equipmentId)
      : [...settings.equipmentAvailable, equipmentId]
    updateField('equipmentAvailable', newEquipment)
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
      {/* Experience & Focus */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-500" />
            {t('titles.experienceAndFocus')}
          </CardTitle>
          <CardDescription>
            {t('descriptions.experienceAndFocus')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('labels.experienceLevel')}</Label>
              <Select
                value={settings.experienceLevel}
                onValueChange={(value) => updateField('experienceLevel', value as FunctionalFitnessSettings['experienceLevel'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('placeholders.selectLevel')} />
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

            <div className="space-y-2">
              <Label>{t('labels.yearsTraining')}</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={settings.yearsTraining}
                onChange={(e) => updateField('yearsTraining', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('labels.primaryFocus')}</Label>
            <Select
              value={settings.primaryFocus}
              onValueChange={(value) => updateField('primaryFocus', value as FunctionalFitnessSettings['primaryFocus'])}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('placeholders.selectFocus')} />
              </SelectTrigger>
              <SelectContent>
                {PRIMARY_FOCUS.map((focus) => (
                  <SelectItem key={focus.value} value={focus.value}>
                    <div>
                      <div className="font-medium">{t(focus.label)}</div>
                      <div className="text-xs text-muted-foreground">{t(focus.description)}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Gym & Equipment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-blue-500" />
            {t('titles.gymAndEquipment')}
          </CardTitle>
          <CardDescription>
            {t('descriptions.gymAndEquipment')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('labels.gymType')}</Label>
            <Select
              value={settings.gymType}
              onValueChange={(value) => updateField('gymType', value as FunctionalFitnessSettings['gymType'])}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('placeholders.selectGymType')} />
              </SelectTrigger>
              <SelectContent>
                {GYM_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {t(type.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('labels.equipmentAvailable')}</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {EQUIPMENT_OPTIONS.map((equipment) => (
                <div
                  key={equipment.id}
                  className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    settings.equipmentAvailable.includes(equipment.id)
                      ? 'bg-primary/10 border-primary'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => toggleEquipment(equipment.id)}
                >
                  <Checkbox
                    id={equipment.id}
                    checked={settings.equipmentAvailable.includes(equipment.id)}
                    onCheckedChange={() => toggleEquipment(equipment.id)}
                  />
                  <Label htmlFor={equipment.id} className="text-sm cursor-pointer">
                    {t(equipment.label)}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benchmark Workouts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-green-500" />
            {t('titles.benchmarkWorkouts')}
          </CardTitle>
          <CardDescription>
            {t('descriptions.benchmarkWorkouts')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
                <Label className="flex items-center gap-2">
                {t('benchmarks.fran.label')}
                <Badge variant="secondary" className="text-xs">{t('benchmarks.fran.preset')}</Badge>
              </Label>
              <Input
                placeholder="3:00"
                value={formatTimeInput(settings.benchmarks.fran)}
                onChange={(e) => updateBenchmark('fran', parseTimeInput(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">{t('benchmarks.fran.movements')}</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {t('benchmarks.grace.label')}
                <Badge variant="secondary" className="text-xs">{t('benchmarks.grace.preset')}</Badge>
              </Label>
              <Input
                placeholder="2:30"
                value={formatTimeInput(settings.benchmarks.grace)}
                onChange={(e) => updateBenchmark('grace', parseTimeInput(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">{t('benchmarks.grace.movements')}</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {t('benchmarks.diane.label')}
                <Badge variant="secondary" className="text-xs">{t('benchmarks.diane.preset')}</Badge>
              </Label>
              <Input
                placeholder="4:00"
                value={formatTimeInput(settings.benchmarks.diane)}
                onChange={(e) => updateBenchmark('diane', parseTimeInput(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">{t('benchmarks.diane.movements')}</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {t('benchmarks.helen.label')}
                <Badge variant="secondary" className="text-xs">{t('benchmarks.helen.preset')}</Badge>
              </Label>
              <Input
                placeholder="10:00"
                value={formatTimeInput(settings.benchmarks.helen)}
                onChange={(e) => updateBenchmark('helen', parseTimeInput(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">{t('benchmarks.helen.movements')}</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {t('benchmarks.murph.label')}
                <Badge variant="secondary" className="text-xs">{t('benchmarks.murph.preset')}</Badge>
              </Label>
              <Input
                placeholder="45:00"
                value={formatTimeInput(settings.benchmarks.murph)}
                onChange={(e) => updateBenchmark('murph', parseTimeInput(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">{t('benchmarks.murph.movements')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strength 1RMs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-red-500" />
            {t('titles.strengthOneRM')}
          </CardTitle>
          <CardDescription>
            {t('descriptions.strengthOneRM')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>{t('labels.backSquat')}</Label>
              <Input
                type="number"
                placeholder={t('placeholders.kg')}
                value={settings.benchmarks.backSquat1RM || ''}
                onChange={(e) => updateBenchmark('backSquat1RM', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.frontSquat')}</Label>
              <Input
                type="number"
                placeholder={t('placeholders.kg')}
                value={settings.benchmarks.frontSquat1RM || ''}
                onChange={(e) => updateBenchmark('frontSquat1RM', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.deadlift')}</Label>
              <Input
                type="number"
                placeholder={t('placeholders.kg')}
                value={settings.benchmarks.deadlift1RM || ''}
                onChange={(e) => updateBenchmark('deadlift1RM', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.strictPress')}</Label>
              <Input
                type="number"
                placeholder={t('placeholders.kg')}
                value={settings.benchmarks.strictPress1RM || ''}
                onChange={(e) => updateBenchmark('strictPress1RM', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.cleanAndJerk')}</Label>
              <Input
                type="number"
                placeholder={t('placeholders.kg')}
                value={settings.benchmarks.cleanAndJerk1RM || ''}
                onChange={(e) => updateBenchmark('cleanAndJerk1RM', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.snatch')}</Label>
              <Input
                type="number"
                placeholder={t('placeholders.kg')}
                value={settings.benchmarks.snatch1RM || ''}
                onChange={(e) => updateBenchmark('snatch1RM', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gymnastics Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-500" />
            {t('titles.gymnasticsSkills')}
          </CardTitle>
          <CardDescription>
            {t('descriptions.gymnasticsSkills')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('labels.pullUps')}</Label>
              <Select
                value={settings.gymnasticsSkills.pullUps}
                onValueChange={(value) => updateGymnasticsSkill('pullUps', value as FunctionalFitnessSettings['gymnasticsSkills']['pullUps'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PULL_UP_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{t(level.label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('labels.handstandPushUps')}</Label>
              <Select
                value={settings.gymnasticsSkills.handstandPushUps}
                onValueChange={(value) => updateGymnasticsSkill('handstandPushUps', value as FunctionalFitnessSettings['gymnasticsSkills']['handstandPushUps'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HSPU_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{t(level.label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('labels.toeToBar')}</Label>
              <Select
                value={settings.gymnasticsSkills.toeToBar}
                onValueChange={(value) => updateGymnasticsSkill('toeToBar', value as FunctionalFitnessSettings['gymnasticsSkills']['toeToBar'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TTB_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{t(level.label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('labels.doubleUnders')}</Label>
              <Select
                value={settings.gymnasticsSkills.doubleUnders}
                onValueChange={(value) => updateGymnasticsSkill('doubleUnders', value as FunctionalFitnessSettings['gymnasticsSkills']['doubleUnders'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DU_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{t(level.label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('labels.ropeClimbs')}</Label>
              <Select
                value={settings.gymnasticsSkills.ropeClimbs}
                onValueChange={(value) => updateGymnasticsSkill('ropeClimbs', value as FunctionalFitnessSettings['gymnasticsSkills']['ropeClimbs'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROPE_CLIMB_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{t(level.label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('labels.ringDips')}</Label>
              <Select
                value={settings.gymnasticsSkills.ringDips}
                onValueChange={(value) => updateGymnasticsSkill('ringDips', value as FunctionalFitnessSettings['gymnasticsSkills']['ringDips'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RING_DIP_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{t(level.label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('labels.handstandWalk')}</Label>
              <Select
                value={settings.gymnasticsSkills.handstandWalk}
                onValueChange={(value) => updateGymnasticsSkill('handstandWalk', value as FunctionalFitnessSettings['gymnasticsSkills']['handstandWalk'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HS_WALK_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{t(level.label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>{t('labels.maxPullUps')}</Label>
              <Input
                type="number"
                placeholder={t('placeholders.maxReps')}
                value={settings.benchmarks.maxPullUps || ''}
                onChange={(e) => updateBenchmark('maxPullUps', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.maxMuscleUps')}</Label>
              <Input
                type="number"
                placeholder={t('placeholders.maxReps')}
                value={settings.benchmarks.maxMuscleUps || ''}
                onChange={(e) => updateBenchmark('maxMuscleUps', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.maxHspu')}</Label>
              <Input
                type="number"
                placeholder={t('placeholders.maxReps')}
                value={settings.benchmarks.maxHSPU || ''}
                onChange={(e) => updateBenchmark('maxHSPU', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.maxDoubleUnders')}</Label>
              <Input
                type="number"
                placeholder={t('placeholders.maxReps')}
                value={settings.benchmarks.maxDoubleUnders || ''}
                onChange={(e) => updateBenchmark('maxDoubleUnders', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Olympic Lifting & Training Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-yellow-500" />
            {t('titles.olympicLifting')}
          </CardTitle>
          <CardDescription>
            {t('descriptions.olympicLifting')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('labels.olympicLiftingLevel')}</Label>
            <Select
              value={settings.olympicLiftingLevel}
              onValueChange={(value) => updateField('olympicLiftingLevel', value as FunctionalFitnessSettings['olympicLiftingLevel'])}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('placeholders.selectLevel')} />
              </SelectTrigger>
              <SelectContent>
                {OLYMPIC_LIFTING_LEVELS.map((level) => (
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="space-y-2">
              <Label>{t('labels.preferredWodDuration')}</Label>
              <Input
                type="number"
                min={5}
                max={60}
                value={settings.preferredWODDuration}
                placeholder={t('placeholders.preferredWodDuration')}
                onChange={(e) => updateField('preferredWODDuration', parseInt(e.target.value) || 20)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.weeklyTrainingDays')}</Label>
              <Input
                type="number"
                min={1}
                max={7}
                value={settings.weeklyTrainingDays}
                placeholder={t('placeholders.weeklyTrainingDays')}
                onChange={(e) => updateField('weeklyTrainingDays', parseInt(e.target.value) || 4)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('labels.competitionInterest')}</Label>
              <div
                className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  settings.competitionInterest
                    ? 'bg-primary/10 border-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => updateField('competitionInterest', !settings.competitionInterest)}
              >
                <Checkbox
                  id="competition"
                  checked={settings.competitionInterest}
                  onCheckedChange={(checked) => updateField('competitionInterest', checked === true)}
                />
                <Label htmlFor="competition" className="cursor-pointer">
                  {t('labels.competitionInterestValue')}
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
