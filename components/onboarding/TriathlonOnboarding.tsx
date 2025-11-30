'use client'

import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Waves, Bike, PersonStanding } from 'lucide-react'

// Race distances
const RACE_DISTANCES = [
  { id: 'super_sprint', label: 'Super Sprint', labelSv: 'Super Sprint', swim: '400m', bike: '10km', run: '2.5km' },
  { id: 'sprint', label: 'Sprint', labelSv: 'Sprint', swim: '750m', bike: '20km', run: '5km' },
  { id: 'olympic', label: 'Olympic', labelSv: 'Olympisk', swim: '1.5km', bike: '40km', run: '10km' },
  { id: 'half_ironman', label: 'Half Ironman (70.3)', labelSv: 'Halv Ironman (70.3)', swim: '1.9km', bike: '90km', run: '21.1km' },
  { id: 'ironman', label: 'Ironman (140.6)', labelSv: 'Ironman (140.6)', swim: '3.8km', bike: '180km', run: '42.2km' },
]

// Experience levels
const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner', labelSv: 'Nybörjare', description: 'First triathlon or <1 year experience' },
  { id: 'intermediate', label: 'Intermediate', labelSv: 'Mellan', description: '1-3 years, multiple races completed' },
  { id: 'advanced', label: 'Advanced', labelSv: 'Avancerad', description: '3+ years, racing regularly' },
  { id: 'elite', label: 'Elite', labelSv: 'Elit', description: 'Competitive age-grouper or professional' },
]

// Strongest/weakest discipline
const DISCIPLINES = [
  { id: 'swim', label: 'Swim', labelSv: 'Simning', icon: Waves },
  { id: 'bike', label: 'Bike', labelSv: 'Cykling', icon: Bike },
  { id: 'run', label: 'Run', labelSv: 'Löpning', icon: PersonStanding },
]

// Bike types for triathlon
const TRI_BIKE_TYPES = [
  { id: 'tt_tri', label: 'TT/Triathlon Bike', labelSv: 'TT/Triathloncykel' },
  { id: 'road_clip', label: 'Road Bike with Clip-on Bars', labelSv: 'Landsvägscykel med påklippsbyglar' },
  { id: 'road', label: 'Road Bike Only', labelSv: 'Endast landsvägscykel' },
]

// Wetsuit options
const WETSUIT_OPTIONS = [
  { id: 'fullsuit', label: 'Full Wetsuit', labelSv: 'Hel våtdräkt' },
  { id: 'sleeveless', label: 'Sleeveless Wetsuit', labelSv: 'Ärmlös våtdräkt' },
  { id: 'swimskin', label: 'Swimskin Only', labelSv: 'Endast swimskin' },
  { id: 'none', label: 'No Wetsuit', labelSv: 'Ingen våtdräkt' },
]

export interface TriathlonSettings {
  // Race preferences
  targetRaceDistance: string
  experienceLevel: string

  // Discipline balance
  strongestDiscipline: string
  weakestDiscipline: string

  // Swimming
  currentCss: number | null // Critical Swim Speed in seconds per 100m
  cssTestDate: string | null
  openWaterExperience: 'none' | 'beginner' | 'intermediate' | 'advanced'
  wetsuitType: string

  // Cycling
  currentFtp: number | null // Functional Threshold Power in watts
  ftpTestDate: string | null
  bikeType: string
  hasPowerMeter: boolean

  // Running
  currentThresholdPace: number | null // seconds per km at threshold
  thresholdTestDate: string | null

  // Training
  weeklyHoursAvailable: number
  swimSessions: number
  bikeSessions: number
  runSessions: number
  brickWorkoutsPerWeek: number // Combined bike+run sessions

  // Equipment
  hasHeartRateMonitor: boolean
  hasGpsWatch: boolean
  hasIndoorTrainer: boolean

  // Body
  weight: number | null
}

interface TriathlonOnboardingProps {
  value: TriathlonSettings
  onChange: (settings: TriathlonSettings) => void
  locale?: 'en' | 'sv'
}

// Format seconds to MM:SS
function formatPace(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Parse MM:SS to seconds
function parsePace(value: string): number | null {
  const parts = value.split(':')
  if (parts.length === 2) {
    const mins = parseInt(parts[0]) || 0
    const secs = parseInt(parts[1]) || 0
    return mins * 60 + secs
  }
  return parseInt(value) || null
}

export function TriathlonOnboarding({
  value,
  onChange,
  locale = 'sv',
}: TriathlonOnboardingProps) {
  const t = (en: string, sv: string) => (locale === 'sv' ? sv : en)

  const updateSettings = (updates: Partial<TriathlonSettings>) => {
    onChange({ ...value, ...updates })
  }

  return (
    <div className="space-y-8">
      {/* Race Distance & Experience */}
      <div className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base font-semibold">
            {t('What is your target race distance?', 'Vilken är din måltävlingsdistans?')}
          </Label>
          <RadioGroup
            value={value.targetRaceDistance}
            onValueChange={(val) => updateSettings({ targetRaceDistance: val })}
            className="grid gap-3"
          >
            {RACE_DISTANCES.map((race) => (
              <Label
                key={race.id}
                htmlFor={`race-${race.id}`}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-colors',
                  value.targetRaceDistance === race.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={race.id} id={`race-${race.id}`} />
                  <span className="font-medium">{locale === 'sv' ? race.labelSv : race.label}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {race.swim} / {race.bike} / {race.run}
                </span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-4">
          <Label className="text-base font-semibold">
            {t('What is your triathlon experience level?', 'Vilken är din erfarenhetsnivå inom triathlon?')}
          </Label>
          <RadioGroup
            value={value.experienceLevel}
            onValueChange={(val) => updateSettings({ experienceLevel: val })}
            className="grid grid-cols-2 gap-3"
          >
            {EXPERIENCE_LEVELS.map((level) => (
              <Label
                key={level.id}
                htmlFor={`exp-${level.id}`}
                className={cn(
                  'flex flex-col rounded-lg border p-3 cursor-pointer transition-colors',
                  value.experienceLevel === level.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                )}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={level.id} id={`exp-${level.id}`} />
                  <span className="font-medium">{locale === 'sv' ? level.labelSv : level.label}</span>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </div>
      </div>

      {/* Discipline Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('Discipline Balance', 'Disciplinbalans')}
          </CardTitle>
          <CardDescription>
            {t(
              'Help us understand your strengths and areas for improvement',
              'Hjälp oss förstå dina styrkor och förbättringsområden'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>{t('Strongest discipline', 'Starkaste disciplin')}</Label>
              <RadioGroup
                value={value.strongestDiscipline}
                onValueChange={(val) => updateSettings({ strongestDiscipline: val })}
                className="space-y-2"
              >
                {DISCIPLINES.map((disc) => (
                  <Label
                    key={disc.id}
                    htmlFor={`strong-${disc.id}`}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                      value.strongestDiscipline === disc.id
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                        : 'hover:border-primary/50'
                    )}
                  >
                    <RadioGroupItem value={disc.id} id={`strong-${disc.id}`} />
                    <disc.icon className="h-4 w-4" />
                    <span>{locale === 'sv' ? disc.labelSv : disc.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-3">
              <Label>{t('Weakest discipline', 'Svagaste disciplin')}</Label>
              <RadioGroup
                value={value.weakestDiscipline}
                onValueChange={(val) => updateSettings({ weakestDiscipline: val })}
                className="space-y-2"
              >
                {DISCIPLINES.map((disc) => (
                  <Label
                    key={disc.id}
                    htmlFor={`weak-${disc.id}`}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                      value.weakestDiscipline === disc.id
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                        : 'hover:border-primary/50'
                    )}
                  >
                    <RadioGroupItem value={disc.id} id={`weak-${disc.id}`} />
                    <disc.icon className="h-4 w-4" />
                    <span>{locale === 'sv' ? disc.labelSv : disc.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Swimming */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Waves className="h-5 w-5 text-blue-500" />
            {t('Swimming', 'Simning')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('Current CSS (per 100m)', 'Nuvarande CSS (per 100m)')}</Label>
              <Input
                type="text"
                placeholder="1:45"
                value={value.currentCss ? formatPace(value.currentCss) : ''}
                onChange={(e) => updateSettings({ currentCss: parsePace(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">{t('Format: M:SS', 'Format: M:SS')}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('Last CSS test', 'Senaste CSS-test')}</Label>
              <Input
                type="date"
                value={value.cssTestDate || ''}
                onChange={(e) => updateSettings({ cssTestDate: e.target.value || null })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>{t('Open water experience', 'Erfarenhet av öppet vatten')}</Label>
            <RadioGroup
              value={value.openWaterExperience}
              onValueChange={(val) => updateSettings({ openWaterExperience: val as any })}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2"
            >
              {['none', 'beginner', 'intermediate', 'advanced'].map((level) => (
                <Label
                  key={level}
                  htmlFor={`ow-${level}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors text-sm',
                    value.openWaterExperience === level
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value={level} id={`ow-${level}`} />
                  <span>{t(level.charAt(0).toUpperCase() + level.slice(1),
                    level === 'none' ? 'Ingen' : level === 'beginner' ? 'Nybörjare' : level === 'intermediate' ? 'Mellan' : 'Avancerad'
                  )}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>{t('Wetsuit', 'Våtdräkt')}</Label>
            <RadioGroup
              value={value.wetsuitType}
              onValueChange={(val) => updateSettings({ wetsuitType: val })}
              className="grid grid-cols-2 gap-2"
            >
              {WETSUIT_OPTIONS.map((ws) => (
                <Label
                  key={ws.id}
                  htmlFor={`ws-${ws.id}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors text-sm',
                    value.wetsuitType === ws.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value={ws.id} id={`ws-${ws.id}`} />
                  <span>{locale === 'sv' ? ws.labelSv : ws.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Cycling */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bike className="h-5 w-5 text-yellow-500" />
            {t('Cycling', 'Cykling')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('Current FTP (watts)', 'Nuvarande FTP (watt)')}</Label>
              <Input
                type="number"
                placeholder="250"
                value={value.currentFtp || ''}
                onChange={(e) => updateSettings({ currentFtp: e.target.value ? parseInt(e.target.value) : null })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Last FTP test', 'Senaste FTP-test')}</Label>
              <Input
                type="date"
                value={value.ftpTestDate || ''}
                onChange={(e) => updateSettings({ ftpTestDate: e.target.value || null })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>{t('Bike setup', 'Cykeluppsättning')}</Label>
            <RadioGroup
              value={value.bikeType}
              onValueChange={(val) => updateSettings({ bikeType: val })}
              className="space-y-2"
            >
              {TRI_BIKE_TYPES.map((bike) => (
                <Label
                  key={bike.id}
                  htmlFor={`bike-${bike.id}`}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                    value.bikeType === bike.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value={bike.id} id={`bike-${bike.id}`} />
                  <span>{locale === 'sv' ? bike.labelSv : bike.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <Label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={value.hasPowerMeter}
              onCheckedChange={(checked) => updateSettings({ hasPowerMeter: !!checked })}
            />
            <span>{t('I have a power meter', 'Jag har en wattmätare')}</span>
          </Label>
        </CardContent>
      </Card>

      {/* Running */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PersonStanding className="h-5 w-5 text-green-500" />
            {t('Running', 'Löpning')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('Threshold pace (per km)', 'Tröskeltempo (per km)')}</Label>
              <Input
                type="text"
                placeholder="4:30"
                value={value.currentThresholdPace ? formatPace(value.currentThresholdPace) : ''}
                onChange={(e) => updateSettings({ currentThresholdPace: parsePace(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">{t('Format: M:SS', 'Format: M:SS')}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('Last threshold test', 'Senaste tröskeltest')}</Label>
              <Input
                type="date"
                value={value.thresholdTestDate || ''}
                onChange={(e) => updateSettings({ thresholdTestDate: e.target.value || null })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Volume */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('Training Volume', 'Träningsvolym')}
          </CardTitle>
          <CardDescription>
            {t(
              'Plan your weekly training distribution',
              'Planera din veckofördelning av träning'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t('Weekly hours available', 'Tillgängliga träningstimmar per vecka')}: {value.weeklyHoursAvailable}h</Label>
            <input
              type="range"
              min={4}
              max={25}
              step={1}
              value={value.weeklyHoursAvailable}
              onChange={(e) => updateSettings({ weeklyHoursAvailable: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>4h</span>
              <span>10h</span>
              <span>15h</span>
              <span>20h</span>
              <span>25h</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Waves className="h-4 w-4 text-blue-500" />
                {t('Swim', 'Sim')}
              </Label>
              <Input
                type="number"
                min={0}
                max={7}
                value={value.swimSessions}
                onChange={(e) => updateSettings({ swimSessions: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">{t('sessions/week', 'pass/vecka')}</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Bike className="h-4 w-4 text-yellow-500" />
                {t('Bike', 'Cykel')}
              </Label>
              <Input
                type="number"
                min={0}
                max={7}
                value={value.bikeSessions}
                onChange={(e) => updateSettings({ bikeSessions: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">{t('sessions/week', 'pass/vecka')}</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <PersonStanding className="h-4 w-4 text-green-500" />
                {t('Run', 'Löp')}
              </Label>
              <Input
                type="number"
                min={0}
                max={7}
                value={value.runSessions}
                onChange={(e) => updateSettings({ runSessions: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">{t('sessions/week', 'pass/vecka')}</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                {t('Bricks', 'Kombi')}
              </Label>
              <Input
                type="number"
                min={0}
                max={3}
                value={value.brickWorkoutsPerWeek}
                onChange={(e) => updateSettings({ brickWorkoutsPerWeek: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">{t('brick/week', 'kombi/vecka')}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {t('Total sessions:', 'Totalt antal pass:')} {value.swimSessions + value.bikeSessions + value.runSessions + value.brickWorkoutsPerWeek}/
            {t('week', 'vecka')}
          </p>
        </CardContent>
      </Card>

      {/* Equipment & Body */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('Equipment & Body', 'Utrustning & Kropp')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={value.hasHeartRateMonitor}
                onCheckedChange={(checked) => updateSettings({ hasHeartRateMonitor: !!checked })}
              />
              <span>{t('Heart rate monitor', 'Pulsmätare')}</span>
            </Label>
            <Label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={value.hasGpsWatch}
                onCheckedChange={(checked) => updateSettings({ hasGpsWatch: !!checked })}
              />
              <span>{t('GPS watch', 'GPS-klocka')}</span>
            </Label>
            <Label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={value.hasIndoorTrainer}
                onCheckedChange={(checked) => updateSettings({ hasIndoorTrainer: !!checked })}
              />
              <span>{t('Indoor trainer (smart trainer/spinning)', 'Inomhusrulle (smart trainer/spinning)')}</span>
            </Label>
          </div>

          <div className="space-y-2">
            <Label>{t('Body weight (kg)', 'Kroppsvikt (kg)')}</Label>
            <Input
              type="number"
              placeholder="70"
              className="max-w-[150px]"
              value={value.weight || ''}
              onChange={(e) => updateSettings({ weight: e.target.value ? parseFloat(e.target.value) : null })}
            />
            {value.currentFtp && value.weight && (
              <p className="text-sm text-muted-foreground">
                {t('Power to weight:', 'Effekt/vikt:')} <span className="font-semibold">{(value.currentFtp / value.weight).toFixed(2)} W/kg</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Default triathlon settings
export const DEFAULT_TRIATHLON_SETTINGS: TriathlonSettings = {
  targetRaceDistance: '',
  experienceLevel: '',
  strongestDiscipline: '',
  weakestDiscipline: '',
  currentCss: null,
  cssTestDate: null,
  openWaterExperience: 'none',
  wetsuitType: 'fullsuit',
  currentFtp: null,
  ftpTestDate: null,
  bikeType: 'road',
  hasPowerMeter: false,
  currentThresholdPace: null,
  thresholdTestDate: null,
  weeklyHoursAvailable: 10,
  swimSessions: 2,
  bikeSessions: 3,
  runSessions: 3,
  brickWorkoutsPerWeek: 1,
  hasHeartRateMonitor: false,
  hasGpsWatch: false,
  hasIndoorTrainer: false,
  weight: null,
}
