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
import {
  ChevronLeft,
  ChevronRight,
  Check,
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
  { value: 'point_guard', label: 'Playmaker (1)', description: 'Spelets regissör' },
  { value: 'shooting_guard', label: 'Shooting Guard (2)', description: 'Poänggörare från distans' },
  { value: 'small_forward', label: 'Small Forward (3)', description: 'Allsidig spelare' },
  { value: 'power_forward', label: 'Power Forward (4)', description: 'Fysisk inomhusspelare' },
  { value: 'center', label: 'Center (5)', description: 'Lagets ankar i målområdet' },
]

const LEAGUE_LEVELS = [
  { value: 'recreational', label: 'Korpen/Motion' },
  { value: 'division_3', label: 'Division 3' },
  { value: 'division_2', label: 'Division 2' },
  { value: 'division_1', label: 'Division 1' },
  { value: 'basketligan', label: 'Basketligan' },
  { value: 'sbl', label: 'SBL (Svenska Basketligan)' },
]

const SEASON_PHASES = [
  { value: 'off_season', label: 'Off-season', description: 'Fokus på fysisk utveckling' },
  { value: 'pre_season', label: 'Försäsong', description: 'Matchförberedelse' },
  { value: 'in_season', label: 'Säsong', description: 'Matcher och underhåll' },
  { value: 'playoffs', label: 'Slutspel', description: 'Peak performance' },
]

const PLAY_STYLES = [
  { value: 'scoring', label: 'Poänggörare', description: 'Fokus på att göra poäng' },
  { value: 'playmaking', label: 'Speluppbyggare', description: 'Skapar chanser för lagkamrater' },
  { value: 'defense', label: 'Försvarare', description: 'Defensiv specialist' },
  { value: 'rebounding', label: 'Reboundare', description: 'Dominerar under korgarna' },
  { value: 'allround', label: 'Allround', description: 'Bidrar på alla områden' },
]

const STRENGTHS = [
  { id: 'vertical_jump', label: 'Vertikal hoppförmåga' },
  { id: 'speed', label: 'Snabbhet' },
  { id: 'agility', label: 'Kvickhet' },
  { id: 'strength', label: 'Styrka' },
  { id: 'endurance', label: 'Uthållighet' },
  { id: 'shooting', label: 'Skottförmåga' },
  { id: 'court_vision', label: 'Spelförståelse' },
  { id: 'defense', label: 'Försvarsspel' },
]

const INJURY_TYPES = [
  { id: 'ankle', label: 'Fotledsskada' },
  { id: 'knee_acl', label: 'Knäskada (ACL/MCL)' },
  { id: 'patellar', label: 'Hopparknä' },
  { id: 'back', label: 'Ryggproblem' },
  { id: 'shoulder', label: 'Axelskada' },
  { id: 'groin', label: 'Ljumskskada' },
  { id: 'hamstring', label: 'Hamstringsskada' },
  { id: 'finger', label: 'Fingerskada' },
]

export function BasketballOnboarding({
  settings,
  onUpdate,
}: BasketballOnboardingProps) {
  const [step, setStep] = useState(1)
  const [localSettings, setLocalSettings] = useState<BasketballSettings>(settings)

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
            Basket
          </Badge>
          <span className="text-sm text-muted-foreground">
            Steg {step} av {totalSteps}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <CardTitle className="mt-4">
          {step === 1 && 'Välj din position'}
          {step === 2 && 'Lag och nivå'}
          {step === 3 && 'Spelstil och fysik'}
          {step === 4 && 'Fysiska tester'}
          {step === 5 && 'Styrketester'}
          {step === 6 && 'Styrkor och svagheter'}
          {step === 7 && 'Skadehistorik och träning'}
        </CardTitle>
        <CardDescription>
          {step === 1 && 'Vilken position spelar du främst?'}
          {step === 2 && 'Information om ditt lag och tävlingsnivå'}
          {step === 3 && 'Din spelstil och fysiska attribut'}
          {step === 4 && 'Dina senaste testresultat för snabbhet och agility'}
          {step === 5 && 'Dina senaste testresultat för styrka'}
          {step === 6 && 'Vad är dina styrkor och utvecklingsområden?'}
          {step === 7 && 'Tidigare skador och träningsförutsättningar'}
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
                  <div className="font-medium">{pos.label}</div>
                  <div className="text-sm text-muted-foreground">{pos.description}</div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {/* Step 2: Team and Level */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="teamName">Lagnamn</Label>
              <Input
                id="teamName"
                value={localSettings.teamName}
                onChange={(e) => updateLocalSettings({ teamName: e.target.value })}
                placeholder="T.ex. Norrköping Dolphins"
              />
            </div>

            <div className="space-y-2">
              <Label>Liganivå</Label>
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
                    <Label htmlFor={`league-${level.value}`}>{level.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Säsongsfas</Label>
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
                      <div>{phase.label}</div>
                      <div className="text-xs text-muted-foreground">{phase.description}</div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="matchesPerWeek">Matcher per vecka</Label>
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
                <Label htmlFor="yearsPlaying">År som spelare</Label>
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
              <Label>Spelstil</Label>
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
                      <div>{style.label}</div>
                      <div className="text-xs text-muted-foreground">{style.description}</div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Skotthand</Label>
              <RadioGroup
                value={localSettings.shootingHand}
                onValueChange={(value) =>
                  updateLocalSettings({ shootingHand: value as 'right' | 'left' })
                }
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="right" id="hand-right" />
                  <Label htmlFor="hand-right">Höger</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="left" id="hand-left" />
                  <Label htmlFor="hand-left">Vänster</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Längd (cm)</Label>
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
                  placeholder="T.ex. 185"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wingspan">Vingspann (cm)</Label>
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
                  placeholder="T.ex. 190"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avgMinutes">Genomsnittlig speltid per match (min)</Label>
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
                placeholder="T.ex. 25"
              />
            </div>
          </div>
        )}

        {/* Step 4: Physical Tests */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-orange-500" />
              <span className="font-medium">Fysiska tester</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="verticalJump">Vertikalhopp (cm)</Label>
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
                  placeholder="T.ex. 75"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="standingReach">Räckvidd stående (cm)</Label>
                <Input
                  id="standingReach"
                  type="number"
                  value={localSettings.benchmarks.standingReach ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      standingReach: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="T.ex. 250"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sprint3_4Court">3/4 Court sprint (sek)</Label>
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
                  placeholder="T.ex. 3.3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="laneAgility">Lane Agility (sek)</Label>
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
                  placeholder="T.ex. 11.0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shuttleRun">Shuttle Run (sek)</Label>
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
                  placeholder="T.ex. 29.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yoyoIR1Level">Yo-Yo IR1 nivå</Label>
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
                  placeholder="T.ex. 18.0"
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
              <span className="font-medium">Styrketester</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="benchPress">Bänkpress 1RM (kg)</Label>
                <Input
                  id="benchPress"
                  type="number"
                  value={localSettings.benchmarks.benchPress ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      benchPress: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="T.ex. 80"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="squat">Knäböj 1RM (kg)</Label>
                <Input
                  id="squat"
                  type="number"
                  value={localSettings.benchmarks.squat ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      squat: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="T.ex. 120"
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Ange dina senaste 1RM-resultat för att få positionsspecifika rekommendationer.
            </p>
          </div>
        )}

        {/* Step 6: Strengths and Weaknesses */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span className="font-medium">Dina styrkor</span>
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
                      {strength.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Utvecklingsområden</span>
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
                      {strength.label}
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
                <span className="font-medium">Tidigare skador</span>
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
                      {injury.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-orange-500" />
                <span className="font-medium">Träningsförutsättningar</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weeklyTraining">Träningspass per vecka (utöver matcher)</Label>
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
                  Jag har tillgång till gym
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
            Tillbaka
          </Button>
          <Button onClick={handleNext}>
            Nästa
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default BasketballOnboarding
