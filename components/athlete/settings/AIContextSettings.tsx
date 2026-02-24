'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  User, Dumbbell, Heart, Lightbulb, Save, AlertCircle, Sparkles,
  Target, ThumbsUp, Clock, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface AIContextSettingsProps {
  clientId: string
  variant?: 'default' | 'glass'
}

// ── AthleteAccount fields (from /api/athlete/profile) ──
interface ProfileData {
  trainingBackground: string | null
  longTermAmbitions: string | null
  seasonalFocus: string | null
  personalMotivations: string | null
  trainingPreferences: string | null
  constraints: string | null
  dietaryNotes: string | null
  profileLastUpdated: string | null
}

// ── SportProfile fields (from /api/sport-profile/:clientId) ──
interface SportProfileData {
  runningSettings: Record<string, unknown> | null
  equipment: Record<string, boolean> | null
  preferredSessionLength: number | null
}

const MAX_LENGTH = 1000

// Equipment options
const EQUIPMENT_OPTIONS = [
  { id: 'treadmill', label: 'Löpband' },
  { id: 'bike_trainer', label: 'Cykeltrainer/Spinningcykel' },
  { id: 'rower', label: 'Roddmaskin' },
  { id: 'skiErg', label: 'SkiErg' },
  { id: 'pool', label: 'Simbassäng' },
  { id: 'gym', label: 'Gym (fria vikter)' },
  { id: 'resistance_bands', label: 'Gummiband' },
  { id: 'kettlebell', label: 'Kettlebells' },
  { id: 'pullup_bar', label: 'Chinsstång' },
  { id: 'box', label: 'Plyo-box' },
  { id: 'trx', label: 'TRX/Slingsystem' },
  { id: 'foam_roller', label: 'Foam roller' },
]

// Workout type preferences
const WORKOUT_TYPES = {
  running: [
    { id: 'easy_runs', label: 'Lugna löppass' },
    { id: 'tempo', label: 'Tempo/Tröskelpass' },
    { id: 'intervals', label: 'Intervaller' },
    { id: 'long_runs', label: 'Långpass' },
    { id: 'fartlek', label: 'Fartlek' },
    { id: 'hill_repeats', label: 'Backträning' },
    { id: 'track', label: 'Banträning' },
    { id: 'trail', label: 'Terrängträning' },
  ],
  strength: [
    { id: 'compound', label: 'Grundövningar (squat, deadlift, etc.)' },
    { id: 'isolation', label: 'Isolationsövningar' },
    { id: 'plyometrics', label: 'Plyometri/Hopp' },
    { id: 'core', label: 'Core-träning' },
    { id: 'mobility', label: 'Rörlighet/Mobility' },
    { id: 'circuits', label: 'Cirkelträning' },
    { id: 'bodyweight', label: 'Kroppsviktsträning' },
  ],
}

// Time of day preferences
const TIME_PREFERENCES = [
  { id: 'early_morning', label: 'Tidig morgon (05-07)' },
  { id: 'morning', label: 'Förmiddag (07-12)' },
  { id: 'lunch', label: 'Lunch (12-14)' },
  { id: 'afternoon', label: 'Eftermiddag (14-17)' },
  { id: 'evening', label: 'Kväll (17-20)' },
  { id: 'late_evening', label: 'Sen kväll (20+)' },
  { id: 'flexible', label: 'Flexibel' },
]

export function AIContextSettings({ clientId, variant = 'default' }: AIContextSettingsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // ── AthleteAccount state ──
  const [profileData, setProfileData] = useState<ProfileData>({
    trainingBackground: null,
    longTermAmbitions: null,
    seasonalFocus: null,
    personalMotivations: null,
    trainingPreferences: null,
    constraints: null,
    dietaryNotes: null,
    profileLastUpdated: null,
  })
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null)

  // ── SportProfile state ──
  const [preferredWorkoutTypes, setPreferredWorkoutTypes] = useState<string[]>([])
  const [favoriteExercises, setFavoriteExercises] = useState('')
  const [workoutDurationMin, setWorkoutDurationMin] = useState('60')
  const [preferredTimeOfDay, setPreferredTimeOfDay] = useState('flexible')
  const [equipment, setEquipment] = useState<string[]>([])
  const [weakPoints, setWeakPoints] = useState('')
  const [strongPoints, setStrongPoints] = useState('')
  const [injuriesLimitations, setInjuriesLimitations] = useState('')
  const [areasToAvoid, setAreasToAvoid] = useState('')
  const [workoutVarietyPreference, setWorkoutVarietyPreference] = useState('balanced')
  const [feedbackStyle, setFeedbackStyle] = useState('encouraging')
  const [additionalNotes, setAdditionalNotes] = useState('')

  // Snapshot of original sport-profile values for dirty tracking
  const [originalSport, setOriginalSport] = useState<string>('')

  const sportSnapshot = useCallback(() => JSON.stringify({
    preferredWorkoutTypes, favoriteExercises, workoutDurationMin, preferredTimeOfDay,
    equipment, weakPoints, strongPoints, injuriesLimitations, areasToAvoid,
    workoutVarietyPreference, feedbackStyle, additionalNotes,
  }), [
    preferredWorkoutTypes, favoriteExercises, workoutDurationMin, preferredTimeOfDay,
    equipment, weakPoints, strongPoints, injuriesLimitations, areasToAvoid,
    workoutVarietyPreference, feedbackStyle, additionalNotes,
  ])

  // ── Fetch both sources on mount ──
  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, sportRes] = await Promise.all([
          fetch('/api/athlete/profile'),
          fetch(`/api/sport-profile/${clientId}`),
        ])

        // AthleteAccount
        if (profileRes.ok) {
          const result = await profileRes.json()
          if (result.success && result.data) {
            const p: ProfileData = {
              trainingBackground: result.data.trainingBackground ?? null,
              longTermAmbitions: result.data.longTermAmbitions ?? null,
              seasonalFocus: result.data.seasonalFocus ?? null,
              personalMotivations: result.data.personalMotivations ?? null,
              trainingPreferences: result.data.trainingPreferences ?? null,
              constraints: result.data.constraints ?? null,
              dietaryNotes: result.data.dietaryNotes ?? null,
              profileLastUpdated: result.data.profileLastUpdated ?? null,
            }
            setProfileData(p)
            setOriginalProfile(p)
          }
        }

        // SportProfile
        if (sportRes.ok) {
          const result = await sportRes.json()
          if (result.success && result.data) {
            const sp = result.data as SportProfileData
            const settings = (sp.runningSettings ?? {}) as Record<string, unknown>
            const equipObj = sp.equipment ?? {}

            setPreferredWorkoutTypes((settings.preferredWorkoutTypes as string[]) || [])
            setFavoriteExercises((settings.favoriteExercises as string) || '')
            setWorkoutDurationMin(sp.preferredSessionLength?.toString() || '60')
            setPreferredTimeOfDay((settings.preferredTimeOfDay as string) || 'flexible')
            setEquipment(
              Object.entries(equipObj).filter(([, v]) => v).map(([k]) => k)
            )
            setWeakPoints((settings.weakPoints as string) || '')
            setStrongPoints((settings.strongPoints as string) || '')
            setInjuriesLimitations((settings.injuriesLimitations as string) || '')
            setAreasToAvoid((settings.areasToAvoid as string) || '')
            setWorkoutVarietyPreference((settings.workoutVarietyPreference as string) || 'balanced')
            setFeedbackStyle((settings.feedbackStyle as string) || 'encouraging')
            setAdditionalNotes((settings.additionalNotes as string) || '')
          }
        }
      } catch (error) {
        console.error('Error fetching AI context data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clientId])

  // Capture original sport snapshot once loading finishes
  useEffect(() => {
    if (!loading) {
      setOriginalSport(sportSnapshot())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  // ── Dirty tracking ──
  useEffect(() => {
    if (!originalProfile || loading) return

    const profileFields: (keyof ProfileData)[] = [
      'trainingBackground', 'longTermAmbitions', 'seasonalFocus',
      'personalMotivations', 'trainingPreferences', 'constraints', 'dietaryNotes',
    ]
    const profileChanged = profileFields.some(
      (key) => (profileData[key] || '') !== (originalProfile[key] || '')
    )
    const sportChanged = originalSport !== '' && sportSnapshot() !== originalSport
    setHasChanges(profileChanged || sportChanged)
  }, [profileData, originalProfile, sportSnapshot, originalSport, loading])

  // ── Field change helpers ──
  const handleProfileChange = useCallback((key: keyof ProfileData, value: string) => {
    setProfileData((prev) => ({ ...prev, [key]: value || null }))
  }, [])

  const toggleWorkoutType = (typeId: string) => {
    setPreferredWorkoutTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    )
  }

  const toggleEquipment = (equipId: string) => {
    setEquipment((prev) =>
      prev.includes(equipId) ? prev.filter((e) => e !== equipId) : [...prev, equipId]
    )
  }

  // ── Save handler (parallel writes) ──
  const handleSave = async () => {
    setSaving(true)
    try {
      const equipmentObj: Record<string, boolean> = {}
      for (const e of EQUIPMENT_OPTIONS) {
        equipmentObj[e.id] = equipment.includes(e.id)
      }

      const [profileRes, sportRes] = await Promise.allSettled([
        fetch('/api/athlete/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData),
        }),
        fetch(`/api/sport-profile/${clientId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runningSettings: {
              preferredWorkoutTypes,
              favoriteExercises,
              preferredTimeOfDay,
              weakPoints,
              strongPoints,
              injuriesLimitations,
              areasToAvoid,
              workoutVarietyPreference,
              feedbackStyle,
              additionalNotes,
              lastUpdated: new Date().toISOString(),
            },
            equipment: equipmentObj,
            preferredSessionLength: parseInt(workoutDurationMin) || 60,
          }),
        }),
      ])

      const profileOk = profileRes.status === 'fulfilled' && profileRes.value.ok
      const sportOk = sportRes.status === 'fulfilled' && sportRes.value.ok

      if (profileOk && sportOk) {
        // Sync original snapshots
        if (profileRes.status === 'fulfilled') {
          const result = await profileRes.value.json()
          if (result.success && result.data?.profileLastUpdated) {
            setProfileData((prev) => ({ ...prev, profileLastUpdated: result.data.profileLastUpdated }))
          }
        }
        setOriginalProfile({ ...profileData })
        setOriginalSport(sportSnapshot())
        setHasChanges(false)
        toast({
          title: 'Sparad!',
          description: 'Din AI-profil har uppdaterats.',
        })
      } else {
        throw new Error('Kunde inte spara alla ändringar')
      }
    } catch (error) {
      console.error('Error saving AI context:', error)
      toast({
        title: 'Fel',
        description: 'Kunde inte spara profilen. Försök igen.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const isStale =
    profileData.profileLastUpdated &&
    new Date(profileData.profileLastUpdated) < new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)

  // ── Loading skeleton ──
  if (loading) {
    return (
      <GlassCard>
        <GlassCardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
            <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  // ── Textarea helper ──
  const renderTextarea = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    hint?: string,
    icon?: React.ReactNode,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {label}
      </Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={MAX_LENGTH}
        rows={3}
        className="resize-none bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/10 focus:border-orange-500/50 dark:focus:border-orange-500/50 text-sm"
      />
      <div className="flex justify-between">
        {hint && <p className="text-[10px] text-slate-500 dark:text-slate-400">{hint}</p>}
        <span
          className={cn(
            'text-[10px] ml-auto',
            value.length > MAX_LENGTH * 0.9
              ? 'text-amber-500'
              : 'text-slate-400 dark:text-slate-500'
          )}
        >
          {value.length}/{MAX_LENGTH}
        </span>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Info card */}
      <GlassCard>
        <GlassCardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-500/20 dark:to-orange-500/10 flex items-center justify-center border border-orange-200 dark:border-orange-500/20 flex-shrink-0">
              <Sparkles className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                Hjälp AI:n att förstå dig bättre
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Informationen du delar här används för att personalisera AI-coachens råd, träningsprogram och dagliga pass.
                Ju mer du berättar, desto bättre kan AI:n hjälpa dig.
              </p>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Staleness warning */}
      {isStale && (
        <GlassCard>
          <GlassCardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Din profil uppdaterades för mer än 6 månader sedan. Överväg att uppdatera den för bättre AI-rekommendationer.
              </p>
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Tabbed content */}
      <GlassCard>
        <GlassCardContent className="p-4">
          <Tabs defaultValue="background" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="background" className="flex items-center gap-1.5 text-xs">
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Bakgrund</span>
              </TabsTrigger>
              <TabsTrigger value="training" className="flex items-center gap-1.5 text-xs">
                <Dumbbell className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Träning</span>
              </TabsTrigger>
              <TabsTrigger value="physical" className="flex items-center gap-1.5 text-xs">
                <Heart className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Fysiskt</span>
              </TabsTrigger>
              <TabsTrigger value="motivation" className="flex items-center gap-1.5 text-xs">
                <Lightbulb className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Motivation</span>
              </TabsTrigger>
            </TabsList>

            {/* ── Tab 1: Bakgrund ── */}
            <TabsContent value="background" className="space-y-5 mt-4">
              {renderTextarea(
                'trainingBackground',
                'Träningsbakgrund',
                profileData.trainingBackground || '',
                (v) => handleProfileChange('trainingBackground', v),
                'Beskriv din träningshistorik... t.ex. "Jag har sprungit i 5 år, började med 5 km-lopp och har gradvis byggt upp till halvmaraton."',
                'Din träningsresa hittills - vad har du gjort, hur länge, vilken bakgrund?',
              )}
              {renderTextarea(
                'longTermAmbitions',
                'Långsiktiga ambitioner',
                profileData.longTermAmbitions || '',
                (v) => handleProfileChange('longTermAmbitions', v),
                'Vad drömmer du om att uppnå? t.ex. "Springa ett ultramaraton, kvalificera mig till Boston Marathon."',
                'Dina stora mål och drömmar inom träning',
              )}
              {renderTextarea(
                'seasonalFocus',
                'Fokus denna säsong',
                profileData.seasonalFocus || '',
                (v) => handleProfileChange('seasonalFocus', v),
                'Vad fokuserar du på just nu? t.ex. "Bygga aerob bas under vintern, förbättra löpekonomi."',
                'Dina prioriteringar och mål för den aktuella träningsperioden',
              )}
            </TabsContent>

            {/* ── Tab 2: Träning ── */}
            <TabsContent value="training" className="space-y-5 mt-4">
              {/* Preferred Workout Types */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Favorittyper av pass</Label>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Välj de typer av träning du föredrar (påverkar programförslag)</p>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Löpning/Kondition</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {WORKOUT_TYPES.running.map((type) => (
                        <div
                          key={type.id}
                          onClick={() => toggleWorkoutType(type.id)}
                          className={cn(
                            'p-2 rounded-lg border cursor-pointer text-xs text-center transition-all',
                            preferredWorkoutTypes.includes(type.id)
                              ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400'
                              : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-white/5 dark:border-white/10 dark:hover:border-white/20'
                          )}
                        >
                          {type.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Styrka</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {WORKOUT_TYPES.strength.map((type) => (
                        <div
                          key={type.id}
                          onClick={() => toggleWorkoutType(type.id)}
                          className={cn(
                            'p-2 rounded-lg border cursor-pointer text-xs text-center transition-all',
                            preferredWorkoutTypes.includes(type.id)
                              ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400'
                              : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-white/5 dark:border-white/10 dark:hover:border-white/20'
                          )}
                        >
                          {type.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Favorite Exercises */}
              {renderTextarea(
                'favoriteExercises',
                'Favoritövningar',
                favoriteExercises,
                setFavoriteExercises,
                't.ex. Squats, Deadlifts, Pull-ups, Löpintervaller på bana...',
                'Övningar du gillar och vill ha mer av i dina program',
              )}

              {/* Duration & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workoutDuration" className="text-sm font-semibold">Föredragen passlängd</Label>
                  <Select value={workoutDurationMin} onValueChange={setWorkoutDurationMin}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minuter</SelectItem>
                      <SelectItem value="45">45 minuter</SelectItem>
                      <SelectItem value="60">60 minuter</SelectItem>
                      <SelectItem value="75">75 minuter</SelectItem>
                      <SelectItem value="90">90 minuter</SelectItem>
                      <SelectItem value="120">2 timmar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeOfDay" className="text-sm font-semibold">Föredragen träningstid</Label>
                  <Select value={preferredTimeOfDay} onValueChange={setPreferredTimeOfDay}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_PREFERENCES.map((time) => (
                        <SelectItem key={time.id} value={time.id}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Equipment */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Tillgänglig utrustning</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {EQUIPMENT_OPTIONS.map((equip) => (
                    <div
                      key={equip.id}
                      onClick={() => toggleEquipment(equip.id)}
                      className={cn(
                        'p-2 rounded-lg border cursor-pointer text-xs transition-all',
                        equipment.includes(equip.id)
                          ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-400'
                          : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-white/5 dark:border-white/10 dark:hover:border-white/20'
                      )}
                    >
                      {equip.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Training Preferences free-text */}
              {renderTextarea(
                'trainingPreferences',
                'Träningspreferenser (fritext)',
                profileData.trainingPreferences || '',
                (v) => handleProfileChange('trainingPreferences', v),
                'Vad gillar och ogillar du? t.ex. "Föredrar morgonlöpning, undviker löpband, gillar längre lugna löpningar i skogen."',
                'Fritext-nyanser utöver valen ovan',
              )}
            </TabsContent>

            {/* ── Tab 3: Fysiskt ── */}
            <TabsContent value="physical" className="space-y-5 mt-4">
              {renderTextarea(
                'weakPoints',
                'Svagheter / Områden att förbättra',
                weakPoints,
                setWeakPoints,
                't.ex. Svag core, dålig löpekonomi i backar, bristande höftrörlighet...',
                'AI kommer fokusera på dessa områden i dina program',
                <Target className="h-4 w-4 text-orange-500" />,
              )}
              {renderTextarea(
                'strongPoints',
                'Styrkor',
                strongPoints,
                setStrongPoints,
                't.ex. Bra uthållighet, stark överkropp, bra löpteknik på plan mark...',
                'Dina starka sidor som AI kan bygga vidare på',
                <ThumbsUp className="h-4 w-4 text-green-500" />,
              )}
              {renderTextarea(
                'injuriesLimitations',
                'Skador / Begränsningar',
                injuriesLimitations,
                setInjuriesLimitations,
                't.ex. Tidigare knäskada, ryggproblem, återkommande hälseneinflammation...',
                'AI kommer undvika övningar som belastar dessa områden',
                <AlertCircle className="h-4 w-4 text-red-500" />,
              )}
              {renderTextarea(
                'areasToAvoid',
                'Övningar/rörelser att undvika',
                areasToAvoid,
                setAreasToAvoid,
                't.ex. Burpees, djupa squats, höga hopp, löpning på hårt underlag...',
                'Specifika övningar eller rörelser som AI ska undvika',
              )}
              {renderTextarea(
                'constraints',
                'Begränsningar (schema/livssituation)',
                profileData.constraints || '',
                (v) => handleProfileChange('constraints', v),
                'Vilka begränsningar har du? t.ex. "Kan bara träna 4-5 dagar/vecka, har småbarn, begränsad tillgång till gym."',
                'Tidsbegränsningar, utrustning, eller andra faktorer som påverkar din träning',
                <Clock className="h-4 w-4 text-amber-500" />,
              )}
              {renderTextarea(
                'dietaryNotes',
                'Kost & näring',
                profileData.dietaryNotes || '',
                (v) => handleProfileChange('dietaryNotes', v),
                'Kostpreferenser eller restriktioner? t.ex. "Vegetarian, laktosintolerant, föredrar kolhydrater före kvällspass."',
                'Matpreferenser, allergier, eller kostvanor som är relevanta för träningen',
              )}
            </TabsContent>

            {/* ── Tab 4: Motivation ── */}
            <TabsContent value="motivation" className="space-y-5 mt-4">
              {renderTextarea(
                'personalMotivations',
                'Vad motiverar dig?',
                profileData.personalMotivations || '',
                (v) => handleProfileChange('personalMotivations', v),
                't.ex. Att slå personliga rekord, träna med andra, se framsteg vecka för vecka, utomhusträning...',
                'Dina drivkrafter och varför träning är viktigt för dig',
              )}

              {/* Workout Variety Preference */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Variation i träning</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'consistent', label: 'Konsekvent', desc: 'Samma struktur varje vecka' },
                    { id: 'balanced', label: 'Balanserad', desc: 'Viss variation inom ramarna' },
                    { id: 'varied', label: 'Varierad', desc: 'Mycket variation och nya utmaningar' },
                  ].map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setWorkoutVarietyPreference(option.id)}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-all',
                        workoutVarietyPreference === option.id
                          ? 'bg-blue-50 border-blue-300 dark:bg-blue-500/10 dark:border-blue-500/30'
                          : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-white/5 dark:border-white/10 dark:hover:border-white/20'
                      )}
                    >
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{option.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback Style */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Feedbackstil</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'data_driven', label: 'Datadriven', desc: 'Fokus på siffror och statistik' },
                    { id: 'encouraging', label: 'Uppmuntrande', desc: 'Positivt och motiverande' },
                    { id: 'direct', label: 'Direkt', desc: 'Rakt på sak, inga omsvep' },
                  ].map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setFeedbackStyle(option.id)}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-all',
                        feedbackStyle === option.id
                          ? 'bg-blue-50 border-blue-300 dark:bg-blue-500/10 dark:border-blue-500/30'
                          : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-white/5 dark:border-white/10 dark:hover:border-white/20'
                      )}
                    >
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{option.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Notes */}
              {renderTextarea(
                'additionalNotes',
                'Övriga anteckningar för AI',
                additionalNotes,
                setAdditionalNotes,
                'Annat som AI bör veta om dig, din livsstil, eller dina träningsmål...',
                'Fritext som hjälper AI att förstå dig bättre',
              )}
            </TabsContent>
          </Tabs>
        </GlassCardContent>
      </GlassCard>

      {/* Save button */}
      <div className="sticky bottom-4 z-10">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={cn(
            'w-full h-12 rounded-xl font-semibold transition-all',
            hasChanges
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
          )}
        >
          {saving ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sparar...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {hasChanges ? 'Spara ändringar' : 'Inga ändringar'}
            </div>
          )}
        </Button>
      </div>

      {/* Last updated */}
      {profileData.profileLastUpdated && (
        <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">
          Senast uppdaterad:{' '}
          {new Date(profileData.profileLastUpdated).toLocaleDateString('sv-SE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      )}
    </div>
  )
}
