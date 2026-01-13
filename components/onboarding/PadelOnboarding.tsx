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
  Users,
} from 'lucide-react'

export interface PadelSettings {
  position: 'right_side' | 'left_side' | 'all_court'
  clubName: string
  leagueLevel: 'recreational' | 'club' | 'division_4' | 'division_3' | 'division_2' | 'division_1' | 'padel_tour' | 'wpt'
  seasonPhase: 'off_season' | 'pre_season' | 'in_season' | 'tournament'
  matchesPerWeek: number
  yearsPlaying: number
  preferredPartner: string
  benchmarks: {
    sprint5m: number | null
    sprint10m: number | null
    agilitySpider: number | null
    agility505: number | null
    lateralShuffle: number | null
    verticalJump: number | null
    medicineBallThrow: number | null
    yoyoIR1Level: number | null
    gripStrength: number | null
    reactionTime: number | null
  }
  strengthFocus: string[]
  weaknesses: string[]
  injuryHistory: string[]
  weeklyTrainingSessions: number
  hasAccessToGym: boolean
  dominantHand: 'right' | 'left'
  height: number | null
  smashSpeed: number | null
}

export const DEFAULT_PADEL_SETTINGS: PadelSettings = {
  position: 'right_side',
  clubName: '',
  leagueLevel: 'club',
  seasonPhase: 'in_season',
  matchesPerWeek: 2,
  yearsPlaying: 1,
  preferredPartner: '',
  benchmarks: {
    sprint5m: null,
    sprint10m: null,
    agilitySpider: null,
    agility505: null,
    lateralShuffle: null,
    verticalJump: null,
    medicineBallThrow: null,
    yoyoIR1Level: null,
    gripStrength: null,
    reactionTime: null,
  },
  strengthFocus: [],
  weaknesses: [],
  injuryHistory: [],
  weeklyTrainingSessions: 3,
  hasAccessToGym: true,
  dominantHand: 'right',
  height: null,
  smashSpeed: null,
}

interface PadelOnboardingProps {
  settings: PadelSettings
  onUpdate: (settings: PadelSettings) => void
}

const POSITIONS = [
  { value: 'right_side', label: 'Högersida (Derechos)', description: 'Offensiv spelare med fokus på smash' },
  { value: 'left_side', label: 'Vänstersida (Revés)', description: 'Strategisk spelare med stark backhand' },
  { value: 'all_court', label: 'Allroundspelare', description: 'Flexibel, kan spela båda sidorna' },
]

const LEAGUE_LEVELS = [
  { value: 'recreational', label: 'Motionsspelare' },
  { value: 'club', label: 'Klubbspelare' },
  { value: 'division_4', label: 'Division 4' },
  { value: 'division_3', label: 'Division 3' },
  { value: 'division_2', label: 'Division 2' },
  { value: 'division_1', label: 'Division 1' },
  { value: 'padel_tour', label: 'Padel Tour' },
  { value: 'wpt', label: 'World Padel Tour' },
]

const SEASON_PHASES = [
  { value: 'off_season', label: 'Off-season', description: 'Fysisk utveckling och vila' },
  { value: 'pre_season', label: 'Försäsong', description: 'Matchförberedelse' },
  { value: 'in_season', label: 'Säsong', description: 'Matcher och underhåll' },
  { value: 'tournament', label: 'Turnering', description: 'Peak performance' },
]

const STRENGTHS = [
  { id: 'smash', label: 'Smash' },
  { id: 'bandeja', label: 'Bandeja' },
  { id: 'vibora', label: 'Víbora' },
  { id: 'lob', label: 'Lobb' },
  { id: 'forehand', label: 'Forehand' },
  { id: 'backhand', label: 'Backhand' },
  { id: 'volley', label: 'Volley' },
  { id: 'movement', label: 'Rörelse/Fotwork' },
  { id: 'wall_play', label: 'Väggspel' },
  { id: 'mental', label: 'Mental styrka' },
]

const INJURY_TYPES = [
  { id: 'shoulder', label: 'Axelskada' },
  { id: 'elbow', label: 'Tennisarmbåge' },
  { id: 'wrist', label: 'Handledsbesvär' },
  { id: 'back', label: 'Ryggproblem' },
  { id: 'knee', label: 'Knäskada' },
  { id: 'ankle', label: 'Fotledsskada' },
  { id: 'hip', label: 'Höftproblem' },
  { id: 'calf', label: 'Vadbesvär' },
]

export function PadelOnboarding({
  settings,
  onUpdate,
}: PadelOnboardingProps) {
  const [step, setStep] = useState(1)
  const [localSettings, setLocalSettings] = useState<PadelSettings>(settings)

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

  const updateLocalSettings = (updates: Partial<PadelSettings>) => {
    const newSettings = { ...localSettings, ...updates }
    setLocalSettings(newSettings)
    onUpdate(newSettings)
  }

  const updateBenchmarks = (updates: Partial<PadelSettings['benchmarks']>) => {
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
          <Badge variant="outline" className="text-blue-600">
            Padel
          </Badge>
          <span className="text-sm text-muted-foreground">
            Steg {step} av {totalSteps}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <CardTitle className="mt-4">
          {step === 1 && 'Välj din position'}
          {step === 2 && 'Klubb och nivå'}
          {step === 3 && 'Partner och fysik'}
          {step === 4 && 'Snabbhetstester'}
          {step === 5 && 'Kraft och reaktion'}
          {step === 6 && 'Styrkor och svagheter'}
          {step === 7 && 'Skadehistorik och träning'}
        </CardTitle>
        <CardDescription>
          {step === 1 && 'Vilken sida spelar du främst på?'}
          {step === 2 && 'Information om din klubb och tävlingsnivå'}
          {step === 3 && 'Din partner och fysiska attribut'}
          {step === 4 && 'Dina senaste testresultat för snabbhet'}
          {step === 5 && 'Dina senaste testresultat för kraft och reaktion'}
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
              updateLocalSettings({ position: value as PadelSettings['position'] })
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

        {/* Step 2: Club and Level */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="clubName">Klubbnamn</Label>
              <Input
                id="clubName"
                value={localSettings.clubName}
                onChange={(e) => updateLocalSettings({ clubName: e.target.value })}
                placeholder="T.ex. Stockholm Padel Club"
              />
            </div>

            <div className="space-y-2">
              <Label>Nivå</Label>
              <RadioGroup
                value={localSettings.leagueLevel}
                onValueChange={(value) =>
                  updateLocalSettings({ leagueLevel: value as PadelSettings['leagueLevel'] })
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
                  updateLocalSettings({ seasonPhase: value as PadelSettings['seasonPhase'] })
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
                  max={14}
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
                  max={30}
                  value={localSettings.yearsPlaying}
                  onChange={(e) =>
                    updateLocalSettings({ yearsPlaying: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Partner and Physical */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <Label htmlFor="preferredPartner">Föredragen partner</Label>
              </div>
              <Input
                id="preferredPartner"
                value={localSettings.preferredPartner}
                onChange={(e) => updateLocalSettings({ preferredPartner: e.target.value })}
                placeholder="T.ex. Anna Svensson"
              />
              <p className="text-xs text-muted-foreground">Namn på din vanligaste dubbelpartner</p>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Längd (cm)</Label>
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
                  placeholder="T.ex. 175"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smashSpeed">Smash-hastighet (km/h)</Label>
                <Input
                  id="smashSpeed"
                  type="number"
                  min={50}
                  max={200}
                  value={localSettings.smashSpeed ?? ''}
                  onChange={(e) =>
                    updateLocalSettings({
                      smashSpeed: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="T.ex. 120"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Speed Tests */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Snabbhetstester</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="sprint10m">10m sprint (sek)</Label>
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
                  placeholder="T.ex. 1.75"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agilitySpider">Spider drill (sek)</Label>
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
                  placeholder="T.ex. 15.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agility505">5-10-5 shuttle (sek)</Label>
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
                  placeholder="T.ex. 2.30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lateralShuffle">Lateral shuffle 10m (sek)</Label>
              <Input
                id="lateralShuffle"
                type="number"
                step="0.1"
                value={localSettings.benchmarks.lateralShuffle ?? ''}
                onChange={(e) =>
                  updateBenchmarks({
                    lateralShuffle: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder="T.ex. 4.0"
              />
              <p className="text-xs text-muted-foreground">Sidledsförflyttning, padelspecifikt</p>
            </div>
          </div>
        )}

        {/* Step 5: Power and Reaction */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Dumbbell className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Kraft och reaktion</span>
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
                  placeholder="T.ex. 45"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medicineBallThrow">Medicinbollkast (m)</Label>
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
                  placeholder="T.ex. 10.5"
                />
                <p className="text-xs text-muted-foreground">3kg boll, rotationskast</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gripStrength">Greppstyrka (kg)</Label>
                <Input
                  id="gripStrength"
                  type="number"
                  value={localSettings.benchmarks.gripStrength ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      gripStrength: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="T.ex. 50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reactionTime">Reaktionstid (ms)</Label>
                <Input
                  id="reactionTime"
                  type="number"
                  value={localSettings.benchmarks.reactionTime ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      reactionTime: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="T.ex. 200"
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
                <Zap className="h-5 w-5 text-blue-500" />
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
                <Target className="h-5 w-5 text-orange-500" />
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
                <Trophy className="h-5 w-5 text-blue-500" />
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

export default PadelOnboarding
