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
  { value: 'setter', label: 'Passare', description: 'Spelets dirigent' },
  { value: 'outside_hitter', label: 'Vänsterspiker', description: 'Allsidig anfallare' },
  { value: 'opposite_hitter', label: 'Diagonal/Högerspiker', description: 'Kraftfull poängplockare' },
  { value: 'middle_blocker', label: 'Centerblockare', description: 'Block och snabba anfall' },
  { value: 'libero', label: 'Libero', description: 'Defensiv specialist' },
]

const LEAGUE_LEVELS = [
  { value: 'recreational', label: 'Korpen/Motion' },
  { value: 'division_3', label: 'Division 3' },
  { value: 'division_2', label: 'Division 2' },
  { value: 'division_1', label: 'Division 1' },
  { value: 'elitserien', label: 'Elitserien' },
  { value: 'ssl', label: 'Svenska Superligan' },
]

const SEASON_PHASES = [
  { value: 'off_season', label: 'Off-season', description: 'Fokus på fysisk utveckling' },
  { value: 'pre_season', label: 'Försäsong', description: 'Matchförberedelse' },
  { value: 'in_season', label: 'Säsong', description: 'Matcher och underhåll' },
  { value: 'playoffs', label: 'Slutspel', description: 'Peak performance' },
]

const PLAY_STYLES = [
  { value: 'power', label: 'Kraftspelare', description: 'Fokus på hårda slag' },
  { value: 'finesse', label: 'Tekniker', description: 'Precision och placering' },
  { value: 'defensive', label: 'Försvarare', description: 'Mottagning och försvar' },
  { value: 'allround', label: 'Allround', description: 'Bidrar på alla områden' },
]

const STRENGTHS = [
  { id: 'vertical_jump', label: 'Vertikal hoppförmåga' },
  { id: 'spike_power', label: 'Slagstyrka' },
  { id: 'blocking', label: 'Blockteknik' },
  { id: 'serving', label: 'Serve' },
  { id: 'reception', label: 'Mottagning' },
  { id: 'defense', label: 'Försvarsspel' },
  { id: 'court_vision', label: 'Spelförståelse' },
  { id: 'agility', label: 'Kvickhet' },
]

const INJURY_TYPES = [
  { id: 'shoulder', label: 'Axelskada' },
  { id: 'knee_patellar', label: 'Hopparknä' },
  { id: 'knee_acl', label: 'Knäskada (ACL/MCL)' },
  { id: 'ankle', label: 'Fotledsskada' },
  { id: 'back', label: 'Ryggproblem' },
  { id: 'finger', label: 'Fingerskada' },
  { id: 'wrist', label: 'Handledsbesvär' },
]

export function VolleyballOnboarding({
  settings,
  onUpdate,
}: VolleyballOnboardingProps) {
  const [step, setStep] = useState(1)
  const [localSettings, setLocalSettings] = useState<VolleyballSettings>(settings)

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
            Volleyboll
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
          {step === 4 && 'Hopptester'}
          {step === 5 && 'Övriga fysiska tester'}
          {step === 6 && 'Styrkor och svagheter'}
          {step === 7 && 'Skadehistorik och träning'}
        </CardTitle>
        <CardDescription>
          {step === 1 && 'Vilken position spelar du främst?'}
          {step === 2 && 'Information om ditt lag och tävlingsnivå'}
          {step === 3 && 'Din spelstil och fysiska attribut'}
          {step === 4 && 'Dina senaste testresultat för hoppförmåga'}
          {step === 5 && 'Dina senaste testresultat för snabbhet och styrka'}
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
              updateLocalSettings({ position: value as VolleyballSettings['position'] })
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
                placeholder="T.ex. Sollentuna VK"
              />
            </div>

            <div className="space-y-2">
              <Label>Liganivå</Label>
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
                  updateLocalSettings({ seasonPhase: value as VolleyballSettings['seasonPhase'] })
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
                  updateLocalSettings({ playStyle: value as VolleyballSettings['playStyle'] })
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
              <Label>Dominant hand</Label>
              <RadioGroup
                value={localSettings.dominantHand}
                onValueChange={(value) =>
                  updateLocalSettings({ dominantHand: value as 'right' | 'left' })
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

            <div className="grid grid-cols-3 gap-4">
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
                <Label htmlFor="spikeHeight">Smash-höjd (cm)</Label>
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
                  placeholder="T.ex. 320"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blockHeight">Block-höjd (cm)</Label>
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
                  placeholder="T.ex. 305"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avgSets">Genomsnittligt antal set per match</Label>
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
                placeholder="T.ex. 3.5"
              />
            </div>
          </div>
        )}

        {/* Step 4: Jump Tests */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-yellow-500" />
              <span className="font-medium">Hopptester</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="verticalJump">Vertikalhopp (cm)</Label>
                <Input
                  id="verticalJump"
                  type="number"
                  value={localSettings.benchmarks.verticalJump ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      verticalJump: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="T.ex. 70"
                />
                <p className="text-xs text-muted-foreground">Utan ansats</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="spikeJump">Smash-hopp (cm)</Label>
                <Input
                  id="spikeJump"
                  type="number"
                  value={localSettings.benchmarks.spikeJump ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      spikeJump: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="T.ex. 85"
                />
                <p className="text-xs text-muted-foreground">Med ansats</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="blockJump">Block-hopp (cm)</Label>
                <Input
                  id="blockJump"
                  type="number"
                  value={localSettings.benchmarks.blockJump ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      blockJump: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="T.ex. 65"
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
                  placeholder="T.ex. 240"
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
              <span className="font-medium">Snabbhet och styrka</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agilityTTest">T-test agility (sek)</Label>
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
                  placeholder="T.ex. 9.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sprint5m">5m sprint (sek)</Label>
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
                  placeholder="T.ex. 1.05"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="powerClean">Power clean 1RM (kg)</Label>
                <Input
                  id="powerClean"
                  type="number"
                  value={localSettings.benchmarks.powerClean ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      powerClean: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="T.ex. 80"
                />
              </div>
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
                placeholder="T.ex. 17.0"
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
                <Trophy className="h-5 w-5 text-yellow-500" />
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

export default VolleyballOnboarding
