'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Save, Loader2, Dumbbell, Heart, Target, Clock, Lightbulb, AlertCircle, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { AthleteProfileData } from '@/lib/athlete-profile/data-fetcher'

interface AITrainingPreferencesProps {
  data: AthleteProfileData
  clientId: string
  isOpen: boolean
  onClose: () => void
  variant?: 'default' | 'glass'
}

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

export function AITrainingPreferences({ data, clientId, isOpen, onClose, variant = 'default' }: AITrainingPreferencesProps) {
  const router = useRouter()
  const sportProfile = data.identity.sportProfile
  const isGlass = variant === 'glass'

  // Parse existing settings
  const existingSettings = sportProfile?.runningSettings as Record<string, unknown> || {}
  // Equipment is stored as a JSON object { equipmentId: true/false }, extract IDs that are true
  const equipmentObj = sportProfile?.equipment as Record<string, boolean> | null
  const existingEquipment = equipmentObj
    ? Object.entries(equipmentObj).filter(([, v]) => v).map(([k]) => k)
    : []

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form state - Training Preferences
  const [preferredWorkoutTypes, setPreferredWorkoutTypes] = useState<string[]>(
    (existingSettings.preferredWorkoutTypes as string[]) || []
  )
  const [favoriteExercises, setFavoriteExercises] = useState(
    (existingSettings.favoriteExercises as string) || ''
  )
  const [workoutDurationMin, setWorkoutDurationMin] = useState(
    sportProfile?.preferredSessionLength?.toString() || '60'
  )
  const [preferredTimeOfDay, setPreferredTimeOfDay] = useState(
    (existingSettings.preferredTimeOfDay as string) || 'flexible'
  )
  const [equipment, setEquipment] = useState<string[]>(existingEquipment)

  // Form state - Physical Context
  const [weakPoints, setWeakPoints] = useState(
    (existingSettings.weakPoints as string) || ''
  )
  const [strongPoints, setStrongPoints] = useState(
    (existingSettings.strongPoints as string) || ''
  )
  const [injuriesLimitations, setInjuriesLimitations] = useState(
    (existingSettings.injuriesLimitations as string) || ''
  )
  const [areasToAvoid, setAreasToAvoid] = useState(
    (existingSettings.areasToAvoid as string) || ''
  )

  // Form state - Motivation & Style
  const [motivationFactors, setMotivationFactors] = useState(
    (existingSettings.motivationFactors as string) || ''
  )
  const [workoutVarietyPreference, setWorkoutVarietyPreference] = useState(
    (existingSettings.workoutVarietyPreference as string) || 'balanced'
  )
  const [feedbackStyle, setFeedbackStyle] = useState(
    (existingSettings.feedbackStyle as string) || 'encouraging'
  )
  const [additionalNotes, setAdditionalNotes] = useState(
    (existingSettings.additionalNotes as string) || ''
  )

  // Toggle workout type selection
  const toggleWorkoutType = (typeId: string) => {
    setPreferredWorkoutTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    )
  }

  // Toggle equipment selection
  const toggleEquipment = (equipId: string) => {
    setEquipment(prev =>
      prev.includes(equipId)
        ? prev.filter(e => e !== equipId)
        : [...prev, equipId]
    )
  }

  // Handle save
  const handleSave = async () => {
    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // Combine all preferences into runningSettings (or sport-specific settings based on primary sport)
      const aiContextSettings = {
        ...existingSettings,
        preferredWorkoutTypes,
        favoriteExercises,
        preferredTimeOfDay,
        weakPoints,
        strongPoints,
        injuriesLimitations,
        areasToAvoid,
        motivationFactors,
        workoutVarietyPreference,
        feedbackStyle,
        additionalNotes,
        lastUpdated: new Date().toISOString(),
      }

      const response = await fetch(`/api/sport-profile/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment,
          preferredSessionLength: parseInt(workoutDurationMin) || 60,
          runningSettings: aiContextSettings,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Kunde inte spara inställningar')
      }

      setSuccessMessage('Dina träningspreferenser har sparats!')
      router.refresh()

      // Close dialog after a short delay to show success message
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            AI Träningspreferenser
          </DialogTitle>
          <DialogDescription>
            Hjälp AI att skapa bättre program och pass genom att dela dina preferenser, mål och begränsningar.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="training" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="training" className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              <span className="hidden sm:inline">Träning</span>
            </TabsTrigger>
            <TabsTrigger value="physical" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Fysiskt</span>
            </TabsTrigger>
            <TabsTrigger value="motivation" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              <span className="hidden sm:inline">Motivation</span>
            </TabsTrigger>
          </TabsList>

          {/* Training Preferences Tab */}
          <TabsContent value="training" className="space-y-6 mt-4">
            {/* Preferred Workout Types */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Favorittyper av pass</Label>
              <p className="text-xs text-gray-500">Välj de typer av träning du föredrar (påverkar programförslag)</p>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Löpning/Kondition</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {WORKOUT_TYPES.running.map((type) => (
                      <div
                        key={type.id}
                        onClick={() => toggleWorkoutType(type.id)}
                        className={cn(
                          "p-2 rounded-lg border cursor-pointer text-xs text-center transition-all",
                          preferredWorkoutTypes.includes(type.id)
                            ? "bg-blue-50 border-blue-300 text-blue-700"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        )}
                      >
                        {type.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Styrka</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {WORKOUT_TYPES.strength.map((type) => (
                      <div
                        key={type.id}
                        onClick={() => toggleWorkoutType(type.id)}
                        className={cn(
                          "p-2 rounded-lg border cursor-pointer text-xs text-center transition-all",
                          preferredWorkoutTypes.includes(type.id)
                            ? "bg-blue-50 border-blue-300 text-blue-700"
                            : "bg-white border-gray-200 hover:border-gray-300"
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
            <div className="space-y-2">
              <Label htmlFor="favoriteExercises">Favoritövningar</Label>
              <Textarea
                id="favoriteExercises"
                placeholder="t.ex. Squats, Deadlifts, Pull-ups, Löpintervaller på bana..."
                value={favoriteExercises}
                onChange={(e) => setFavoriteExercises(e.target.value)}
                rows={2}
              />
              <p className="text-xs text-gray-500">Övningar du gillar och vill ha mer av i dina program</p>
            </div>

            {/* Workout Duration & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workoutDuration">Föredragen passlängd (min)</Label>
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
                <Label htmlFor="timeOfDay">Föredragen träningstid</Label>
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
              <Label>Tillgänglig utrustning</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EQUIPMENT_OPTIONS.map((equip) => (
                  <div
                    key={equip.id}
                    onClick={() => toggleEquipment(equip.id)}
                    className={cn(
                      "p-2 rounded-lg border cursor-pointer text-xs transition-all",
                      equipment.includes(equip.id)
                        ? "bg-green-50 border-green-300 text-green-700"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {equip.label}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Physical Context Tab */}
          <TabsContent value="physical" className="space-y-6 mt-4">
            {/* Weak Points */}
            <div className="space-y-2">
              <Label htmlFor="weakPoints" className="flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-500" />
                Svagheter / Områden att förbättra
              </Label>
              <Textarea
                id="weakPoints"
                placeholder="t.ex. Svag core, dålig löpekonomi i backar, bristande höftrörlighet..."
                value={weakPoints}
                onChange={(e) => setWeakPoints(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-gray-500">AI kommer fokusera på dessa områden i dina program</p>
            </div>

            {/* Strong Points */}
            <div className="space-y-2">
              <Label htmlFor="strongPoints" className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-green-500" />
                Styrkor
              </Label>
              <Textarea
                id="strongPoints"
                placeholder="t.ex. Bra uthållighet, stark överkropp, bra löpteknik på plan mark..."
                value={strongPoints}
                onChange={(e) => setStrongPoints(e.target.value)}
                rows={2}
              />
              <p className="text-xs text-gray-500">Dina starka sidor som AI kan bygga vidare på</p>
            </div>

            {/* Injuries/Limitations */}
            <div className="space-y-2">
              <Label htmlFor="injuries" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Skador / Begränsningar
              </Label>
              <Textarea
                id="injuries"
                placeholder="t.ex. Tidigare knäskada, ryggproblem, återkommande hälseneinflammation..."
                value={injuriesLimitations}
                onChange={(e) => setInjuriesLimitations(e.target.value)}
                rows={2}
              />
              <p className="text-xs text-gray-500">AI kommer undvika övningar som belastar dessa områden</p>
            </div>

            {/* Areas to Avoid */}
            <div className="space-y-2">
              <Label htmlFor="areasToAvoid">Övningar/rörelser att undvika</Label>
              <Textarea
                id="areasToAvoid"
                placeholder="t.ex. Burpees, djupa squats, höga hopp, löpning på hårt underlag..."
                value={areasToAvoid}
                onChange={(e) => setAreasToAvoid(e.target.value)}
                rows={2}
              />
              <p className="text-xs text-gray-500">Specifika övningar eller rörelser som AI ska undvika</p>
            </div>
          </TabsContent>

          {/* Motivation & Style Tab */}
          <TabsContent value="motivation" className="space-y-6 mt-4">
            {/* Motivation Factors */}
            <div className="space-y-2">
              <Label htmlFor="motivation">Vad motiverar dig?</Label>
              <Textarea
                id="motivation"
                placeholder="t.ex. Att slå personliga rekord, träna med andra, se framsteg vecka för vecka, utomhusträning..."
                value={motivationFactors}
                onChange={(e) => setMotivationFactors(e.target.value)}
                rows={2}
              />
            </div>

            {/* Workout Variety Preference */}
            <div className="space-y-2">
              <Label>Variation i träning</Label>
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
                      "p-3 rounded-lg border cursor-pointer transition-all",
                      workoutVarietyPreference === option.id
                        ? "bg-blue-50 border-blue-300"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback Style */}
            <div className="space-y-2">
              <Label>Feedbackstil</Label>
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
                      "p-3 rounded-lg border cursor-pointer transition-all",
                      feedbackStyle === option.id
                        ? "bg-blue-50 border-blue-300"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="additionalNotes">Övriga anteckningar för AI</Label>
              <Textarea
                id="additionalNotes"
                placeholder="Annat som AI bör veta om dig, din livsstil, eller dina träningsmål..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-gray-500">Fritext som hjälper AI att förstå dig bättre</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Messages */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="mt-4 border-green-200 bg-green-50 text-green-800">
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Avbryt
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sparar...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Spara preferenser
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
