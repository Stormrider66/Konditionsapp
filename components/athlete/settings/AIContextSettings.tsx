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
import { useLocale, useTranslations } from '@/i18n/client'

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
const PROFILE_STALE_THRESHOLD = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)

// Equipment options
const EQUIPMENT_OPTIONS = [
  { id: 'treadmill', labelKey: 'equipment.treadmill' },
  { id: 'bike_trainer', labelKey: 'equipment.bikeTrainer' },
  { id: 'rower', labelKey: 'equipment.rower' },
  { id: 'skiErg', labelKey: 'equipment.skiErg' },
  { id: 'pool', labelKey: 'equipment.pool' },
  { id: 'gym', labelKey: 'equipment.gym' },
  { id: 'resistance_bands', labelKey: 'equipment.resistanceBands' },
  { id: 'kettlebell', labelKey: 'equipment.kettlebell' },
  { id: 'pullup_bar', labelKey: 'equipment.pullupBar' },
  { id: 'box', labelKey: 'equipment.box' },
  { id: 'trx', labelKey: 'equipment.trx' },
  { id: 'foam_roller', labelKey: 'equipment.foamRoller' },
]

// Workout type preferences
const WORKOUT_TYPES = {
  running: [
    { id: 'easy_runs', labelKey: 'workoutTypes.running.easyRuns' },
    { id: 'tempo', labelKey: 'workoutTypes.running.tempo' },
    { id: 'intervals', labelKey: 'workoutTypes.running.intervals' },
    { id: 'long_runs', labelKey: 'workoutTypes.running.longRuns' },
    { id: 'fartlek', labelKey: 'workoutTypes.running.fartlek' },
    { id: 'hill_repeats', labelKey: 'workoutTypes.running.hillRepeats' },
    { id: 'track', labelKey: 'workoutTypes.running.track' },
    { id: 'trail', labelKey: 'workoutTypes.running.trail' },
  ],
  strength: [
    { id: 'compound', labelKey: 'workoutTypes.strength.compound' },
    { id: 'isolation', labelKey: 'workoutTypes.strength.isolation' },
    { id: 'plyometrics', labelKey: 'workoutTypes.strength.plyometrics' },
    { id: 'core', labelKey: 'workoutTypes.strength.core' },
    { id: 'mobility', labelKey: 'workoutTypes.strength.mobility' },
    { id: 'circuits', labelKey: 'workoutTypes.strength.circuits' },
    { id: 'bodyweight', labelKey: 'workoutTypes.strength.bodyweight' },
  ],
}

// Time of day preferences
const TIME_PREFERENCES = [
  { id: 'early_morning', labelKey: 'timePreferences.earlyMorning' },
  { id: 'morning', labelKey: 'timePreferences.morning' },
  { id: 'lunch', labelKey: 'timePreferences.lunch' },
  { id: 'afternoon', labelKey: 'timePreferences.afternoon' },
  { id: 'evening', labelKey: 'timePreferences.evening' },
  { id: 'late_evening', labelKey: 'timePreferences.lateEvening' },
  { id: 'flexible', labelKey: 'timePreferences.flexible' },
]

const VARIETY_OPTIONS = [
  { id: 'consistent', labelKey: 'variety.consistent.label', descKey: 'variety.consistent.description' },
  { id: 'balanced', labelKey: 'variety.balanced.label', descKey: 'variety.balanced.description' },
  { id: 'varied', labelKey: 'variety.varied.label', descKey: 'variety.varied.description' },
]

const FEEDBACK_OPTIONS = [
  { id: 'data_driven', labelKey: 'feedback.dataDriven.label', descKey: 'feedback.dataDriven.description' },
  { id: 'encouraging', labelKey: 'feedback.encouraging.label', descKey: 'feedback.encouraging.description' },
  { id: 'direct', labelKey: 'feedback.direct.label', descKey: 'feedback.direct.description' },
]

export function AIContextSettings({ clientId }: AIContextSettingsProps) {
  const { toast } = useToast()
  const t = useTranslations('components.aiContextSettings')
  const locale = useLocale()
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

    void fetchData()
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
          title: t('toast.saved.title'),
          description: t('toast.saved.description'),
        })
      } else {
        throw new Error(t('toast.saveAllError'))
      }
    } catch (error) {
      console.error('Error saving AI context:', error)
      toast({
        title: t('toast.error.title'),
        description: t('toast.error.description'),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const isStale =
    profileData.profileLastUpdated &&
    new Date(profileData.profileLastUpdated) < PROFILE_STALE_THRESHOLD

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
                {t('info.title')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('info.description')}
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
                {t('staleWarning')}
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
                <span className="hidden sm:inline">{t('tabs.background')}</span>
              </TabsTrigger>
              <TabsTrigger value="training" className="flex items-center gap-1.5 text-xs">
                <Dumbbell className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('tabs.training')}</span>
              </TabsTrigger>
              <TabsTrigger value="physical" className="flex items-center gap-1.5 text-xs">
                <Heart className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('tabs.physical')}</span>
              </TabsTrigger>
              <TabsTrigger value="motivation" className="flex items-center gap-1.5 text-xs">
                <Lightbulb className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('tabs.motivation')}</span>
              </TabsTrigger>
            </TabsList>

            {/* ── Tab 1: Bakgrund ── */}
            <TabsContent value="background" className="space-y-5 mt-4">
              {renderTextarea(
                'trainingBackground',
                t('fields.trainingBackground.label'),
                profileData.trainingBackground || '',
                (v) => handleProfileChange('trainingBackground', v),
                t('fields.trainingBackground.placeholder'),
                t('fields.trainingBackground.hint'),
              )}
              {renderTextarea(
                'longTermAmbitions',
                t('fields.longTermAmbitions.label'),
                profileData.longTermAmbitions || '',
                (v) => handleProfileChange('longTermAmbitions', v),
                t('fields.longTermAmbitions.placeholder'),
                t('fields.longTermAmbitions.hint'),
              )}
              {renderTextarea(
                'seasonalFocus',
                t('fields.seasonalFocus.label'),
                profileData.seasonalFocus || '',
                (v) => handleProfileChange('seasonalFocus', v),
                t('fields.seasonalFocus.placeholder'),
                t('fields.seasonalFocus.hint'),
              )}
            </TabsContent>

            {/* ── Tab 2: Träning ── */}
            <TabsContent value="training" className="space-y-5 mt-4">
              {/* Preferred Workout Types */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">{t('workoutTypes.label')}</Label>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{t('workoutTypes.description')}</p>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{t('workoutTypes.running.label')}</p>
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
                          {t(type.labelKey)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{t('workoutTypes.strength.label')}</p>
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
                          {t(type.labelKey)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Favorite Exercises */}
              {renderTextarea(
                'favoriteExercises',
                t('fields.favoriteExercises.label'),
                favoriteExercises,
                setFavoriteExercises,
                t('fields.favoriteExercises.placeholder'),
                t('fields.favoriteExercises.hint'),
              )}

              {/* Duration & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workoutDuration" className="text-sm font-semibold">{t('duration.label')}</Label>
                  <Select value={workoutDurationMin} onValueChange={setWorkoutDurationMin}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">{t('duration.minutes', { count: 30 })}</SelectItem>
                      <SelectItem value="45">{t('duration.minutes', { count: 45 })}</SelectItem>
                      <SelectItem value="60">{t('duration.minutes', { count: 60 })}</SelectItem>
                      <SelectItem value="75">{t('duration.minutes', { count: 75 })}</SelectItem>
                      <SelectItem value="90">{t('duration.minutes', { count: 90 })}</SelectItem>
                      <SelectItem value="120">{t('duration.hours', { count: 2 })}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeOfDay" className="text-sm font-semibold">{t('timeOfDay.label')}</Label>
                  <Select value={preferredTimeOfDay} onValueChange={setPreferredTimeOfDay}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_PREFERENCES.map((time) => (
                        <SelectItem key={time.id} value={time.id}>
                          {t(time.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Equipment */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">{t('equipment.label')}</Label>
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
                      {t(equip.labelKey)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Training Preferences free-text */}
              {renderTextarea(
                'trainingPreferences',
                t('fields.trainingPreferences.label'),
                profileData.trainingPreferences || '',
                (v) => handleProfileChange('trainingPreferences', v),
                t('fields.trainingPreferences.placeholder'),
                t('fields.trainingPreferences.hint'),
              )}
            </TabsContent>

            {/* ── Tab 3: Fysiskt ── */}
            <TabsContent value="physical" className="space-y-5 mt-4">
              {renderTextarea(
                'weakPoints',
                t('fields.weakPoints.label'),
                weakPoints,
                setWeakPoints,
                t('fields.weakPoints.placeholder'),
                t('fields.weakPoints.hint'),
                <Target className="h-4 w-4 text-orange-500" />,
              )}
              {renderTextarea(
                'strongPoints',
                t('fields.strongPoints.label'),
                strongPoints,
                setStrongPoints,
                t('fields.strongPoints.placeholder'),
                t('fields.strongPoints.hint'),
                <ThumbsUp className="h-4 w-4 text-green-500" />,
              )}
              {renderTextarea(
                'injuriesLimitations',
                t('fields.injuriesLimitations.label'),
                injuriesLimitations,
                setInjuriesLimitations,
                t('fields.injuriesLimitations.placeholder'),
                t('fields.injuriesLimitations.hint'),
                <AlertCircle className="h-4 w-4 text-red-500" />,
              )}
              {renderTextarea(
                'areasToAvoid',
                t('fields.areasToAvoid.label'),
                areasToAvoid,
                setAreasToAvoid,
                t('fields.areasToAvoid.placeholder'),
                t('fields.areasToAvoid.hint'),
              )}
              {renderTextarea(
                'constraints',
                t('fields.constraints.label'),
                profileData.constraints || '',
                (v) => handleProfileChange('constraints', v),
                t('fields.constraints.placeholder'),
                t('fields.constraints.hint'),
                <Clock className="h-4 w-4 text-amber-500" />,
              )}
              {renderTextarea(
                'dietaryNotes',
                t('fields.dietaryNotes.label'),
                profileData.dietaryNotes || '',
                (v) => handleProfileChange('dietaryNotes', v),
                t('fields.dietaryNotes.placeholder'),
                t('fields.dietaryNotes.hint'),
              )}
            </TabsContent>

            {/* ── Tab 4: Motivation ── */}
            <TabsContent value="motivation" className="space-y-5 mt-4">
              {renderTextarea(
                'personalMotivations',
                t('fields.personalMotivations.label'),
                profileData.personalMotivations || '',
                (v) => handleProfileChange('personalMotivations', v),
                t('fields.personalMotivations.placeholder'),
                t('fields.personalMotivations.hint'),
              )}

              {/* Workout Variety Preference */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t('variety.label')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {VARIETY_OPTIONS.map((option) => (
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
                      <p className="font-medium text-sm">{t(option.labelKey)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t(option.descKey)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback Style */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">{t('feedback.label')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {FEEDBACK_OPTIONS.map((option) => (
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
                      <p className="font-medium text-sm">{t(option.labelKey)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t(option.descKey)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Notes */}
              {renderTextarea(
                'additionalNotes',
                t('fields.additionalNotes.label'),
                additionalNotes,
                setAdditionalNotes,
                t('fields.additionalNotes.placeholder'),
                t('fields.additionalNotes.hint'),
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
              {t('actions.saving')}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {hasChanges ? t('actions.saveChanges') : t('actions.noChanges')}
            </div>
          )}
        </Button>
      </div>

      {/* Last updated */}
      {profileData.profileLastUpdated && (
        <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">
          {t('lastUpdated', {
            date: new Date(profileData.profileLastUpdated).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            }),
          })}
        </p>
      )}
    </div>
  )
}
