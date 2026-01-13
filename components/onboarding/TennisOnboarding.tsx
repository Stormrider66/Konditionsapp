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
  { value: 'aggressive_baseliner', label: 'Aggressiv Baslinjespelare', description: 'Dominerar från baslinjen med kraftfulla slag' },
  { value: 'serve_and_volleyer', label: 'Serve-Volleyspelare', description: 'Attackerar nätet efter serven' },
  { value: 'all_court', label: 'Allroundspelare', description: 'Anpassar sig till alla situationer' },
  { value: 'counter_puncher', label: 'Defensiv Spelare', description: 'Returnerar allt och väntar på misstag' },
  { value: 'big_server', label: 'Servkung', description: 'Förlitar sig på kraftfull serve' },
]

const LEAGUE_LEVELS = [
  { value: 'recreational', label: 'Motionsspelare' },
  { value: 'club', label: 'Klubbspelare' },
  { value: 'division_4', label: 'Division 4' },
  { value: 'division_3', label: 'Division 3' },
  { value: 'division_2', label: 'Division 2' },
  { value: 'division_1', label: 'Division 1' },
  { value: 'elitserien', label: 'Elitserien' },
  { value: 'atp_wta', label: 'ATP/WTA-ranking' },
]

const SEASON_PHASES = [
  { value: 'off_season', label: 'Off-season', description: 'Fysisk utveckling och vila' },
  { value: 'pre_season', label: 'Försäsong', description: 'Matchförberedelse' },
  { value: 'in_season', label: 'Säsong', description: 'Matcher och underhåll' },
  { value: 'tournament', label: 'Turnering', description: 'Peak performance' },
]

const SURFACES = [
  { value: 'hard', label: 'Hardcourt' },
  { value: 'clay', label: 'Grus' },
  { value: 'grass', label: 'Gräs' },
  { value: 'indoor', label: 'Inomhus' },
  { value: 'all', label: 'Alla underlag' },
]

const FOREHAND_GRIPS = [
  { value: 'eastern', label: 'Eastern' },
  { value: 'semi_western', label: 'Semi-Western' },
  { value: 'western', label: 'Western' },
  { value: 'continental', label: 'Continental' },
]

const STRENGTHS = [
  { id: 'serve', label: 'Serve' },
  { id: 'forehand', label: 'Forehand' },
  { id: 'backhand', label: 'Backhand' },
  { id: 'volley', label: 'Volley' },
  { id: 'return', label: 'Return' },
  { id: 'movement', label: 'Rörelse/Fotwork' },
  { id: 'mental', label: 'Mental styrka' },
  { id: 'endurance', label: 'Uthållighet' },
]

const INJURY_TYPES = [
  { id: 'shoulder', label: 'Axelskada' },
  { id: 'elbow', label: 'Tennisarmbåge' },
  { id: 'wrist', label: 'Handledsbesvär' },
  { id: 'back', label: 'Ryggproblem' },
  { id: 'knee', label: 'Knäskada' },
  { id: 'ankle', label: 'Fotledsskada' },
  { id: 'hip', label: 'Höftproblem' },
  { id: 'abdominal', label: 'Magbesvär' },
]

export function TennisOnboarding({
  settings,
  onUpdate,
}: TennisOnboardingProps) {
  const [step, setStep] = useState(1)
  const [localSettings, setLocalSettings] = useState<TennisSettings>(settings)

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
            Tennis
          </Badge>
          <span className="text-sm text-muted-foreground">
            Steg {step} av {totalSteps}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <CardTitle className="mt-4">
          {step === 1 && 'Välj din spelstil'}
          {step === 2 && 'Klubb och nivå'}
          {step === 3 && 'Teknik och fysik'}
          {step === 4 && 'Snabbhetstester'}
          {step === 5 && 'Kraft och uthållighet'}
          {step === 6 && 'Styrkor och svagheter'}
          {step === 7 && 'Skadehistorik och träning'}
        </CardTitle>
        <CardDescription>
          {step === 1 && 'Vilken spelstil beskriver dig bäst?'}
          {step === 2 && 'Information om din klubb och tävlingsnivå'}
          {step === 3 && 'Din teknik och fysiska attribut'}
          {step === 4 && 'Dina senaste testresultat för snabbhet'}
          {step === 5 && 'Dina senaste testresultat för kraft och kondition'}
          {step === 6 && 'Vad är dina styrkor och utvecklingsområden?'}
          {step === 7 && 'Tidigare skador och träningsförutsättningar'}
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
                  <div className="font-medium">{style.label}</div>
                  <div className="text-sm text-muted-foreground">{style.description}</div>
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
                placeholder="T.ex. Kungliga Tennisklubben"
              />
            </div>

            <div className="space-y-2">
              <Label>Nivå</Label>
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
                  updateLocalSettings({ seasonPhase: value as TennisSettings['seasonPhase'] })
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
                  max={10}
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
              <Label>Favoritunderlag</Label>
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
                    <Label htmlFor={`surface-${surface.value}`}>{surface.label}</Label>
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

            <div className="space-y-2">
              <Label>Forehand-grepp</Label>
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
                    <Label htmlFor={`grip-${grip.value}`}>{grip.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Backhand</Label>
              <RadioGroup
                value={localSettings.backhandType}
                onValueChange={(value) =>
                  updateLocalSettings({ backhandType: value as 'one_handed' | 'two_handed' })
                }
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="one_handed" id="bh-one" />
                  <Label htmlFor="bh-one">Enhands</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="two_handed" id="bh-two" />
                  <Label htmlFor="bh-two">Tvåhands</Label>
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
                  placeholder="T.ex. 180"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serveSpeed">Maxhastighet serve (km/h)</Label>
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
                  placeholder="T.ex. 180"
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
              <span className="font-medium">Snabbhetstester</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="sprint20m">20m sprint (sek)</Label>
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
                  placeholder="T.ex. 3.00"
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
                  placeholder="T.ex. 16.0"
                />
                <p className="text-xs text-muted-foreground">Tennisspecifikt agilitytest</p>
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
          </div>
        )}

        {/* Step 5: Power and Endurance */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Dumbbell className="h-5 w-5 text-green-500" />
              <span className="font-medium">Kraft och uthållighet</span>
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
                  placeholder="T.ex. 50"
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
                  placeholder="T.ex. 11.0"
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
                <Label htmlFor="shoulderRatio">Axelstyrka ER/IR (%)</Label>
                <Input
                  id="shoulderRatio"
                  type="number"
                  value={localSettings.benchmarks.shoulderStrengthRatio ?? ''}
                  onChange={(e) =>
                    updateBenchmarks({
                      shoulderStrengthRatio: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="T.ex. 70"
                />
                <p className="text-xs text-muted-foreground">Extern/Intern rotation</p>
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
                placeholder="T.ex. 18.0"
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
                <Trophy className="h-5 w-5 text-green-500" />
                <span className="font-medium">Träningsförutsättningar</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weeklyTraining">Träningspass per vecka (utöver matcher)</Label>
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

export default TennisOnboarding
