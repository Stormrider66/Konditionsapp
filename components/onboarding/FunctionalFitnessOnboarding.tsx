'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Dumbbell, Timer, Target, Flame, Medal, Zap } from 'lucide-react'

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
  { value: 'beginner', label: 'Nybörjare', description: 'Ny till funktionell träning (<1 år)' },
  { value: 'intermediate', label: 'Medel', description: '1-3 års erfarenhet, behärskar grunderna' },
  { value: 'advanced', label: 'Avancerad', description: '3+ år, behärskar de flesta rörelser' },
  { value: 'competitor', label: 'Tävlande', description: 'Deltar i tävlingar, hög teknisk nivå' },
]

const PRIMARY_FOCUS = [
  { value: 'general', label: 'Allmän fitness', description: 'Balanserad träning' },
  { value: 'strength', label: 'Styrka', description: 'Fokus på tunga lyft och PRs' },
  { value: 'endurance', label: 'Uthållighet', description: 'Cardio och metabolisk kondition' },
  { value: 'gymnastics', label: 'Gymnastik', description: 'Kroppsviktsrörelser och skills' },
  { value: 'competition', label: 'Tävling', description: 'Förbered för tävlingar' },
]

const GYM_TYPES = [
  { value: 'commercial', label: 'Vanligt gym' },
  { value: 'functional_box', label: 'Funktionell box/CrossFit-box' },
  { value: 'home', label: 'Hemmagym' },
  { value: 'garage', label: 'Garage gym' },
]

const EQUIPMENT_OPTIONS = [
  { id: 'barbell', label: 'Skivstång' },
  { id: 'dumbbells', label: 'Hantlar' },
  { id: 'kettlebells', label: 'Kettlebells' },
  { id: 'pull_up_bar', label: 'Pull-up bar' },
  { id: 'rings', label: 'Ringar' },
  { id: 'rower', label: 'Roddmaskin' },
  { id: 'ski_erg', label: 'SkiErg' },
  { id: 'assault_bike', label: 'Assault/Echo Bike' },
  { id: 'plyo_box', label: 'Plyo-box' },
  { id: 'wall_ball', label: 'Wall balls' },
  { id: 'rope', label: 'Klätterrep' },
  { id: 'ghd', label: 'GHD' },
  { id: 'sled', label: 'Släde' },
  { id: 'sandbag', label: 'Sandsäck' },
  { id: 'jump_rope', label: 'Hopprep' },
]

const PULL_UP_LEVELS = [
  { value: 'none', label: 'Inga pull-ups' },
  { value: 'banded', label: 'Med band' },
  { value: 'strict', label: 'Strikta' },
  { value: 'kipping', label: 'Kipping' },
  { value: 'butterfly', label: 'Butterfly' },
  { value: 'muscle_up', label: 'Muscle-ups' },
]

const HSPU_LEVELS = [
  { value: 'none', label: 'Inga HSPU' },
  { value: 'pike', label: 'Pike push-ups' },
  { value: 'box', label: 'Box pike' },
  { value: 'wall', label: 'Wall facing' },
  { value: 'strict', label: 'Strikta' },
  { value: 'kipping', label: 'Kipping' },
  { value: 'freestanding', label: 'Fristående' },
]

const TTB_LEVELS = [
  { value: 'none', label: 'Inga T2B' },
  { value: 'hanging_knee', label: 'Hanging knee raises' },
  { value: 'kipping', label: 'Kipping T2B' },
  { value: 'strict', label: 'Strikta T2B' },
]

const DU_LEVELS = [
  { value: 'none', label: 'Inga double-unders' },
  { value: 'learning', label: 'Lär sig' },
  { value: 'consistent', label: 'Kan göra flera' },
  { value: 'unbroken_50', label: 'Unbroken 50+' },
]

const ROPE_CLIMB_LEVELS = [
  { value: 'none', label: 'Inga rope climbs' },
  { value: 'with_legs', label: 'Med bengrep' },
  { value: 'legless', label: 'Legless' },
]

const RING_DIP_LEVELS = [
  { value: 'none', label: 'Inga ring dips' },
  { value: 'banded', label: 'Med band' },
  { value: 'strict', label: 'Strikta' },
  { value: 'kipping', label: 'Kipping' },
]

const HS_WALK_LEVELS = [
  { value: 'none', label: 'Inga HS walks' },
  { value: 'wall_walks', label: 'Wall walks' },
  { value: 'short_distance', label: 'Kort distans' },
  { value: 'proficient', label: 'Behärskar' },
]

const OLYMPIC_LIFTING_LEVELS = [
  { value: 'none', label: 'Ingen erfarenhet', description: 'Har inte tränat olympiska lyft' },
  { value: 'learning', label: 'Lär sig', description: 'Kan grunderna, behöver arbeta på teknik' },
  { value: 'competent', label: 'Kompetent', description: 'Bra teknik, kan lyfta tungt' },
  { value: 'proficient', label: 'Mycket duktig', description: 'Stark teknik, tävlingsnivå' },
]

// ==================== COMPONENT ====================

interface FunctionalFitnessOnboardingProps {
  settings: FunctionalFitnessSettings
  onUpdate: (settings: FunctionalFitnessSettings) => void
}

export function FunctionalFitnessOnboarding({ settings, onUpdate }: FunctionalFitnessOnboardingProps) {
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
            Erfarenhet & Fokus
          </CardTitle>
          <CardDescription>
            Berätta om din bakgrund och vad du vill fokusera på
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Erfarenhetsnivå</Label>
              <Select
                value={settings.experienceLevel}
                onValueChange={(value) => updateField('experienceLevel', value as FunctionalFitnessSettings['experienceLevel'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Välj nivå" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div>
                        <div className="font-medium">{level.label}</div>
                        <div className="text-xs text-muted-foreground">{level.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>År av träning</Label>
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
            <Label>Primärt fokus</Label>
            <Select
              value={settings.primaryFocus}
              onValueChange={(value) => updateField('primaryFocus', value as FunctionalFitnessSettings['primaryFocus'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj fokus" />
              </SelectTrigger>
              <SelectContent>
                {PRIMARY_FOCUS.map((focus) => (
                  <SelectItem key={focus.value} value={focus.value}>
                    <div>
                      <div className="font-medium">{focus.label}</div>
                      <div className="text-xs text-muted-foreground">{focus.description}</div>
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
            Gym & Utrustning
          </CardTitle>
          <CardDescription>
            Vilken typ av gym tränar du på och vilken utrustning har du tillgång till?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Typ av gym</Label>
            <Select
              value={settings.gymType}
              onValueChange={(value) => updateField('gymType', value as FunctionalFitnessSettings['gymType'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj gymtyp" />
              </SelectTrigger>
              <SelectContent>
                {GYM_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tillgänglig utrustning</Label>
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
                    {equipment.label}
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
            Benchmark-tider
          </CardTitle>
          <CardDescription>
            Dina bästa tider på klassiska benchmark-workouts (lämna tomt om okänt)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Fran
                <Badge variant="secondary" className="text-xs">21-15-9</Badge>
              </Label>
              <Input
                placeholder="3:00"
                value={formatTimeInput(settings.benchmarks.fran)}
                onChange={(e) => updateBenchmark('fran', parseTimeInput(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Thrusters + Pull-ups</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Grace
                <Badge variant="secondary" className="text-xs">30 reps</Badge>
              </Label>
              <Input
                placeholder="2:30"
                value={formatTimeInput(settings.benchmarks.grace)}
                onChange={(e) => updateBenchmark('grace', parseTimeInput(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Clean & Jerks</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Diane
                <Badge variant="secondary" className="text-xs">21-15-9</Badge>
              </Label>
              <Input
                placeholder="4:00"
                value={formatTimeInput(settings.benchmarks.diane)}
                onChange={(e) => updateBenchmark('diane', parseTimeInput(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Deadlifts + HSPU</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Helen
                <Badge variant="secondary" className="text-xs">3 rounds</Badge>
              </Label>
              <Input
                placeholder="10:00"
                value={formatTimeInput(settings.benchmarks.helen)}
                onChange={(e) => updateBenchmark('helen', parseTimeInput(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">400m + KB + PU</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Murph
                <Badge variant="secondary" className="text-xs">Hero</Badge>
              </Label>
              <Input
                placeholder="45:00"
                value={formatTimeInput(settings.benchmarks.murph)}
                onChange={(e) => updateBenchmark('murph', parseTimeInput(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">1mi + 100/200/300 + 1mi</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strength 1RMs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-red-500" />
            Styrka (1RM)
          </CardTitle>
          <CardDescription>
            Dina max-lyft i kg (lämna tomt om okänt)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Back Squat</Label>
              <Input
                type="number"
                placeholder="kg"
                value={settings.benchmarks.backSquat1RM || ''}
                onChange={(e) => updateBenchmark('backSquat1RM', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Front Squat</Label>
              <Input
                type="number"
                placeholder="kg"
                value={settings.benchmarks.frontSquat1RM || ''}
                onChange={(e) => updateBenchmark('frontSquat1RM', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Deadlift</Label>
              <Input
                type="number"
                placeholder="kg"
                value={settings.benchmarks.deadlift1RM || ''}
                onChange={(e) => updateBenchmark('deadlift1RM', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Strict Press</Label>
              <Input
                type="number"
                placeholder="kg"
                value={settings.benchmarks.strictPress1RM || ''}
                onChange={(e) => updateBenchmark('strictPress1RM', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Clean & Jerk</Label>
              <Input
                type="number"
                placeholder="kg"
                value={settings.benchmarks.cleanAndJerk1RM || ''}
                onChange={(e) => updateBenchmark('cleanAndJerk1RM', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Snatch</Label>
              <Input
                type="number"
                placeholder="kg"
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
            Gymnastik-skills
          </CardTitle>
          <CardDescription>
            Vilken nivå har du på olika gymnastik-rörelser?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Pull-ups</Label>
              <Select
                value={settings.gymnasticsSkills.pullUps}
                onValueChange={(value) => updateGymnasticsSkill('pullUps', value as FunctionalFitnessSettings['gymnasticsSkills']['pullUps'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PULL_UP_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Handstand Push-ups</Label>
              <Select
                value={settings.gymnasticsSkills.handstandPushUps}
                onValueChange={(value) => updateGymnasticsSkill('handstandPushUps', value as FunctionalFitnessSettings['gymnasticsSkills']['handstandPushUps'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HSPU_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Toes to Bar</Label>
              <Select
                value={settings.gymnasticsSkills.toeToBar}
                onValueChange={(value) => updateGymnasticsSkill('toeToBar', value as FunctionalFitnessSettings['gymnasticsSkills']['toeToBar'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TTB_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Double-unders</Label>
              <Select
                value={settings.gymnasticsSkills.doubleUnders}
                onValueChange={(value) => updateGymnasticsSkill('doubleUnders', value as FunctionalFitnessSettings['gymnasticsSkills']['doubleUnders'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DU_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rope Climbs</Label>
              <Select
                value={settings.gymnasticsSkills.ropeClimbs}
                onValueChange={(value) => updateGymnasticsSkill('ropeClimbs', value as FunctionalFitnessSettings['gymnasticsSkills']['ropeClimbs'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROPE_CLIMB_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ring Dips</Label>
              <Select
                value={settings.gymnasticsSkills.ringDips}
                onValueChange={(value) => updateGymnasticsSkill('ringDips', value as FunctionalFitnessSettings['gymnasticsSkills']['ringDips'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RING_DIP_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Handstand Walk</Label>
              <Select
                value={settings.gymnasticsSkills.handstandWalk}
                onValueChange={(value) => updateGymnasticsSkill('handstandWalk', value as FunctionalFitnessSettings['gymnasticsSkills']['handstandWalk'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HS_WALK_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Max Pull-ups (reps)</Label>
              <Input
                type="number"
                placeholder="Max reps"
                value={settings.benchmarks.maxPullUps || ''}
                onChange={(e) => updateBenchmark('maxPullUps', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Max Muscle-ups (reps)</Label>
              <Input
                type="number"
                placeholder="Max reps"
                value={settings.benchmarks.maxMuscleUps || ''}
                onChange={(e) => updateBenchmark('maxMuscleUps', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Max HSPU (reps)</Label>
              <Input
                type="number"
                placeholder="Max reps"
                value={settings.benchmarks.maxHSPU || ''}
                onChange={(e) => updateBenchmark('maxHSPU', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Max Double-unders (reps)</Label>
              <Input
                type="number"
                placeholder="Max reps"
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
            Olympiska lyft & Träningsupplägg
          </CardTitle>
          <CardDescription>
            Din erfarenhet av olympiska lyft och hur du vill träna
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Olympisk lyftnivå</Label>
            <Select
              value={settings.olympicLiftingLevel}
              onValueChange={(value) => updateField('olympicLiftingLevel', value as FunctionalFitnessSettings['olympicLiftingLevel'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj nivå" />
              </SelectTrigger>
              <SelectContent>
                {OLYMPIC_LIFTING_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <div>
                      <div className="font-medium">{level.label}</div>
                      <div className="text-xs text-muted-foreground">{level.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="space-y-2">
              <Label>Föredragen WOD-längd (minuter)</Label>
              <Input
                type="number"
                min={5}
                max={60}
                value={settings.preferredWODDuration}
                onChange={(e) => updateField('preferredWODDuration', parseInt(e.target.value) || 20)}
              />
            </div>

            <div className="space-y-2">
              <Label>Träningsdagar/vecka</Label>
              <Input
                type="number"
                min={1}
                max={7}
                value={settings.weeklyTrainingDays}
                onChange={(e) => updateField('weeklyTrainingDays', parseInt(e.target.value) || 4)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tävlingsintresse</Label>
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
                  Jag är intresserad av att tävla
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
