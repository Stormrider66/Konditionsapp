'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Heart, Target, Dumbbell, Activity, Flame, Scale } from 'lucide-react'

export interface GeneralFitnessSettings {
  // Primary goals
  primaryGoal: 'weight_loss' | 'general_health' | 'strength' | 'endurance' | 'flexibility' | 'stress_relief'
  secondaryGoals: string[]

  // Current fitness level
  fitnessLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'athlete'
  yearsExercising: number

  // Preferred activities
  preferredActivities: string[]
  dislikedActivities: string[]

  // Health metrics (optional)
  currentWeight: number | null
  targetWeight: number | null
  height: number | null
  age: number | null
  restingHeartRate: number | null

  // Training preferences
  weeklyWorkouts: number
  preferredWorkoutDuration: number // minutes
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'flexible'
  preferIndoor: boolean
  preferOutdoor: boolean
  preferGroup: boolean
  preferSolo: boolean

  // Equipment access
  hasGymAccess: boolean
  hasHomeEquipment: boolean
  homeEquipment: string[]

  // Limitations
  hasInjuries: boolean
  injuryNotes: string
  mobilityLimitations: string[]
}

export const DEFAULT_GENERAL_FITNESS_SETTINGS: GeneralFitnessSettings = {
  primaryGoal: 'general_health',
  secondaryGoals: [],

  fitnessLevel: 'moderately_active',
  yearsExercising: 1,

  preferredActivities: [],
  dislikedActivities: [],

  currentWeight: null,
  targetWeight: null,
  height: null,
  age: null,
  restingHeartRate: null,

  weeklyWorkouts: 3,
  preferredWorkoutDuration: 45,
  preferredTimeOfDay: 'flexible',
  preferIndoor: true,
  preferOutdoor: true,
  preferGroup: false,
  preferSolo: true,

  hasGymAccess: false,
  hasHomeEquipment: false,
  homeEquipment: [],

  hasInjuries: false,
  injuryNotes: '',
  mobilityLimitations: [],
}

const PRIMARY_GOALS = [
  { value: 'weight_loss', label: 'Viktminskning', icon: Scale, description: 'Gå ner i vikt och förbättra kroppssammansättning' },
  { value: 'general_health', label: 'Allmän hälsa', icon: Heart, description: 'Förbättra övergripande hälsa och välbefinnande' },
  { value: 'strength', label: 'Styrka', icon: Dumbbell, description: 'Bygga muskler och öka styrka' },
  { value: 'endurance', label: 'Uthållighet', icon: Activity, description: 'Förbättra kondition och uthållighet' },
  { value: 'flexibility', label: 'Rörlighet', icon: Target, description: 'Öka rörlighet och minska stelhet' },
  { value: 'stress_relief', label: 'Stresshantering', icon: Heart, description: 'Minska stress och förbättra mental hälsa' },
]

const SECONDARY_GOALS = [
  'Bättre sömn',
  'Mer energi',
  'Förbättrad hållning',
  'Socialt umgänge',
  'Öka självförtroende',
  'Förebygga skador',
  'Förbättra balans',
  'Mental skärpa',
]

const FITNESS_LEVELS = [
  { value: 'sedentary', label: 'Stillasittande', description: 'Lite eller ingen regelbunden träning' },
  { value: 'lightly_active', label: 'Lätt aktiv', description: 'Tränar 1-2 gånger/vecka' },
  { value: 'moderately_active', label: 'Måttligt aktiv', description: 'Tränar 3-4 gånger/vecka' },
  { value: 'very_active', label: 'Mycket aktiv', description: 'Tränar 5-6 gånger/vecka' },
  { value: 'athlete', label: 'Idrottare', description: 'Tränar dagligen, ofta mer än en gång' },
]

const ACTIVITIES = [
  { id: 'walking', label: 'Promenader' },
  { id: 'running', label: 'Löpning' },
  { id: 'cycling', label: 'Cykling' },
  { id: 'swimming', label: 'Simning' },
  { id: 'gym', label: 'Gym/Styrketräning' },
  { id: 'yoga', label: 'Yoga' },
  { id: 'pilates', label: 'Pilates' },
  { id: 'dancing', label: 'Dans' },
  { id: 'hiking', label: 'Vandring' },
  { id: 'group_classes', label: 'Gruppträning' },
  { id: 'martial_arts', label: 'Kampsport' },
  { id: 'tennis', label: 'Tennis/Padel' },
  { id: 'golf', label: 'Golf' },
  { id: 'skiing', label: 'Skidåkning' },
  { id: 'rowing', label: 'Rodd' },
]

const HOME_EQUIPMENT = [
  { id: 'dumbbells', label: 'Hantlar' },
  { id: 'resistance_bands', label: 'Gummiband' },
  { id: 'yoga_mat', label: 'Yogamatta' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'pull_up_bar', label: 'Dragstång' },
  { id: 'treadmill', label: 'Löpband' },
  { id: 'exercise_bike', label: 'Motionscykel' },
  { id: 'rowing_machine', label: 'Roddmaskin' },
  { id: 'foam_roller', label: 'Foam roller' },
  { id: 'trx', label: 'TRX/Sling trainer' },
]

interface GeneralFitnessOnboardingProps {
  settings: GeneralFitnessSettings
  onUpdate: (settings: GeneralFitnessSettings) => void
}

export function GeneralFitnessOnboarding({ settings, onUpdate }: GeneralFitnessOnboardingProps) {
  const updateField = <K extends keyof GeneralFitnessSettings>(field: K, value: GeneralFitnessSettings[K]) => {
    onUpdate({ ...settings, [field]: value })
  }

  const toggleArrayItem = (field: 'preferredActivities' | 'dislikedActivities' | 'secondaryGoals' | 'homeEquipment' | 'mobilityLimitations', item: string) => {
    const current = settings[field] as string[]
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item]
    updateField(field, updated)
  }

  return (
    <div className="space-y-6">
      {/* Primary Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-500" />
            Huvudmål
          </CardTitle>
          <CardDescription>
            Vad är ditt viktigaste träningsmål?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PRIMARY_GOALS.map((goal) => {
              const Icon = goal.icon
              const isSelected = settings.primaryGoal === goal.value
              return (
                <div
                  key={goal.value}
                  onClick={() => updateField('primaryGoal', goal.value as GeneralFitnessSettings['primaryGoal'])}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                      : 'border-transparent bg-muted hover:border-green-200'
                  }`}
                >
                  <Icon className={`h-6 w-6 mb-2 ${isSelected ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <div className="font-medium text-sm">{goal.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{goal.description}</div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 space-y-2">
            <Label>Sekundära mål (valfritt)</Label>
            <div className="flex flex-wrap gap-2">
              {SECONDARY_GOALS.map((goal) => (
                <div
                  key={goal}
                  onClick={() => toggleArrayItem('secondaryGoals', goal)}
                  className={`px-3 py-1 rounded-full text-sm cursor-pointer transition-all ${
                    settings.secondaryGoals.includes(goal)
                      ? 'bg-green-500 text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {goal}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fitness Level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Nuvarande kondition
          </CardTitle>
          <CardDescription>
            Hur aktiv är du just nu?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Aktivitetsnivå</Label>
            <Select
              value={settings.fitnessLevel}
              onValueChange={(value) => updateField('fitnessLevel', value as GeneralFitnessSettings['fitnessLevel'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj nivå" />
              </SelectTrigger>
              <SelectContent>
                {FITNESS_LEVELS.map((level) => (
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
            <Label>Hur länge har du tränat regelbundet? (år)</Label>
            <Input
              type="number"
              min={0}
              max={50}
              value={settings.yearsExercising}
              onChange={(e) => updateField('yearsExercising', parseInt(e.target.value) || 0)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Health Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Hälsomått (valfritt)
          </CardTitle>
          <CardDescription>
            Hjälper oss anpassa din träning bättre
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nuvarande vikt (kg)</Label>
              <Input
                type="number"
                min={30}
                max={250}
                value={settings.currentWeight || ''}
                onChange={(e) => updateField('currentWeight', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="75"
              />
            </div>

            <div className="space-y-2">
              <Label>Målvikt (kg)</Label>
              <Input
                type="number"
                min={30}
                max={250}
                value={settings.targetWeight || ''}
                onChange={(e) => updateField('targetWeight', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="70"
              />
            </div>

            <div className="space-y-2">
              <Label>Längd (cm)</Label>
              <Input
                type="number"
                min={100}
                max={250}
                value={settings.height || ''}
                onChange={(e) => updateField('height', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="175"
              />
            </div>

            <div className="space-y-2">
              <Label>Ålder</Label>
              <Input
                type="number"
                min={16}
                max={100}
                value={settings.age || ''}
                onChange={(e) => updateField('age', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="35"
              />
            </div>

            <div className="space-y-2">
              <Label>Vilopuls (bpm)</Label>
              <Input
                type="number"
                min={30}
                max={120}
                value={settings.restingHeartRate || ''}
                onChange={(e) => updateField('restingHeartRate', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="65"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferred Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Träningsaktiviteter
          </CardTitle>
          <CardDescription>
            Vilka aktiviteter gillar du?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Gillar (välj flera)</Label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {ACTIVITIES.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => toggleArrayItem('preferredActivities', activity.id)}
                  className={`px-3 py-2 rounded-lg text-sm text-center cursor-pointer transition-all ${
                    settings.preferredActivities.includes(activity.id)
                      ? 'bg-green-500 text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {activity.label}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ogillar / Vill undvika</Label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {ACTIVITIES.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => toggleArrayItem('dislikedActivities', activity.id)}
                  className={`px-3 py-2 rounded-lg text-sm text-center cursor-pointer transition-all ${
                    settings.dislikedActivities.includes(activity.id)
                      ? 'bg-red-500 text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {activity.label}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-purple-500" />
            Träningspreferenser
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Träningspass per vecka: {settings.weeklyWorkouts}</Label>
              <Slider
                value={[settings.weeklyWorkouts]}
                onValueChange={([value]) => updateField('weeklyWorkouts', value)}
                min={1}
                max={7}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Önskad passlängd: {settings.preferredWorkoutDuration} min</Label>
              <Slider
                value={[settings.preferredWorkoutDuration]}
                onValueChange={([value]) => updateField('preferredWorkoutDuration', value)}
                min={15}
                max={120}
                step={5}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Föredragen tid på dagen</Label>
            <Select
              value={settings.preferredTimeOfDay}
              onValueChange={(value) => updateField('preferredTimeOfDay', value as GeneralFitnessSettings['preferredTimeOfDay'])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morgon (06-10)</SelectItem>
                <SelectItem value="afternoon">Eftermiddag (12-16)</SelectItem>
                <SelectItem value="evening">Kväll (17-21)</SelectItem>
                <SelectItem value="flexible">Flexibel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="indoor"
                checked={settings.preferIndoor}
                onCheckedChange={(checked) => updateField('preferIndoor', checked === true)}
              />
              <Label htmlFor="indoor">Inomhus</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="outdoor"
                checked={settings.preferOutdoor}
                onCheckedChange={(checked) => updateField('preferOutdoor', checked === true)}
              />
              <Label htmlFor="outdoor">Utomhus</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="group"
                checked={settings.preferGroup}
                onCheckedChange={(checked) => updateField('preferGroup', checked === true)}
              />
              <Label htmlFor="group">Gruppträning</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="solo"
                checked={settings.preferSolo}
                onCheckedChange={(checked) => updateField('preferSolo', checked === true)}
              />
              <Label htmlFor="solo">Egen träning</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader>
          <CardTitle>Utrustning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="gym"
                checked={settings.hasGymAccess}
                onCheckedChange={(checked) => updateField('hasGymAccess', checked === true)}
              />
              <Label htmlFor="gym">Tillgång till gym</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="homeequip"
                checked={settings.hasHomeEquipment}
                onCheckedChange={(checked) => updateField('hasHomeEquipment', checked === true)}
              />
              <Label htmlFor="homeequip">Har hemmaträningsutrustning</Label>
            </div>
          </div>

          {settings.hasHomeEquipment && (
            <div className="space-y-2">
              <Label>Vilken utrustning har du hemma?</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {HOME_EQUIPMENT.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleArrayItem('homeEquipment', item.id)}
                    className={`px-3 py-2 rounded-lg text-sm text-center cursor-pointer transition-all ${
                      settings.homeEquipment.includes(item.id)
                        ? 'bg-purple-500 text-white'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Limitations */}
      <Card>
        <CardHeader>
          <CardTitle>Begränsningar (valfritt)</CardTitle>
          <CardDescription>
            Har du några skador eller begränsningar vi bör ta hänsyn till?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="injuries"
              checked={settings.hasInjuries}
              onCheckedChange={(checked) => updateField('hasInjuries', checked === true)}
            />
            <Label htmlFor="injuries">Jag har skador eller besvär</Label>
          </div>

          {settings.hasInjuries && (
            <div className="space-y-2">
              <Label>Beskriv dina besvär</Label>
              <Input
                value={settings.injuryNotes}
                onChange={(e) => updateField('injuryNotes', e.target.value)}
                placeholder="T.ex. ont i knät, ryggbesvär..."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
