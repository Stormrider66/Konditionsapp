'use client'

/**
 * About Me Settings Component
 *
 * Allows athletes to describe their training background, goals, preferences,
 * and constraints. This information is used to personalize AI coaching.
 */

import { useState, useEffect, useCallback } from 'react'
import { User, Target, Heart, Dumbbell, Utensils, Clock, Sparkles, Save, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

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

interface AboutMeSettingsProps {
  variant?: 'default' | 'glass'
}

const MAX_LENGTH = 1000

const fields = [
  {
    key: 'trainingBackground' as const,
    label: 'Träningsbakgrund',
    icon: User,
    color: 'blue',
    placeholder: 'Beskriv din träningshistorik... t.ex. "Jag har sprungit i 5 år, började med 5 km-lopp och har gradvis byggt upp till halvmaraton. Tidigare spelade jag fotboll i 10 år."',
    hint: 'Din träningsresa hittills - vad har du gjort, hur länge, vilken bakgrund?',
  },
  {
    key: 'longTermAmbitions' as const,
    label: 'Långsiktiga ambitioner',
    icon: Target,
    color: 'orange',
    placeholder: 'Vad drömmer du om att uppnå? t.ex. "Springa ett ultramaraton, kvalificera mig till Boston Marathon, eller bara hålla mig frisk och aktiv livet ut."',
    hint: 'Dina stora mål och drömmar inom träning',
  },
  {
    key: 'seasonalFocus' as const,
    label: 'Fokus denna säsong',
    icon: Sparkles,
    color: 'green',
    placeholder: 'Vad fokuserar du på just nu? t.ex. "Bygga aerob bas under vintern, förbereda för vårens halvmaraton, förbättra löpekonomi."',
    hint: 'Dina prioriteringar och mål för den aktuella träningsperioden',
  },
  {
    key: 'personalMotivations' as const,
    label: 'Vad motiverar mig',
    icon: Heart,
    color: 'red',
    placeholder: 'Varför tränar du? t.ex. "Mental hälsa, gemenskap med löparvänner, personlig utveckling, att vara en bra förebild för mina barn."',
    hint: 'Dina drivkrafter och varför träning är viktigt för dig',
  },
  {
    key: 'trainingPreferences' as const,
    label: 'Träningspreferenser',
    icon: Dumbbell,
    color: 'purple',
    placeholder: 'Vad gillar och ogillar du? t.ex. "Föredrar morgonlöpning, älskar intervaller på bana, undviker löpband, gillar längre lugna löpningar i skogen."',
    hint: 'Vad du tycker om och vad du helst undviker i träningen',
  },
  {
    key: 'constraints' as const,
    label: 'Begränsningar',
    icon: Clock,
    color: 'amber',
    placeholder: 'Vilka begränsningar har du? t.ex. "Kan bara träna 4-5 dagar/vecka pga arbete, begränsad tillgång till gym, har småbarn så flexibilitet är viktigt."',
    hint: 'Tidsbegränsningar, utrustning, eller andra faktorer som påverkar din träning',
  },
  {
    key: 'dietaryNotes' as const,
    label: 'Kost & näring',
    icon: Utensils,
    color: 'cyan',
    placeholder: 'Kostpreferenser eller restriktioner? t.ex. "Vegetarian, laktosintolerant, föredrar kolhydrater före kvällspass, dricker inte kaffe."',
    hint: 'Matpreferenser, allergier, eller kostvanor som är relevanta för träningen',
  },
]

const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400',
  orange: 'bg-orange-100 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400',
  green: 'bg-green-100 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400',
  red: 'bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400',
  purple: 'bg-purple-100 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400',
  amber: 'bg-amber-100 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400',
  cyan: 'bg-cyan-100 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400',
}

export function AboutMeSettings({ variant = 'default' }: AboutMeSettingsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
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
  const [originalData, setOriginalData] = useState<ProfileData | null>(null)

  // Fetch profile data
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch('/api/athlete/profile')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setProfileData(result.data)
            setOriginalData(result.data)
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  // Check for changes
  useEffect(() => {
    if (!originalData) return

    const changed = fields.some(
      (field) => (profileData[field.key] || '') !== (originalData[field.key] || '')
    )
    setHasChanges(changed)
  }, [profileData, originalData])

  const handleFieldChange = useCallback((key: keyof ProfileData, value: string) => {
    setProfileData((prev) => ({
      ...prev,
      [key]: value || null,
    }))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/athlete/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      })

      if (!response.ok) {
        throw new Error('Failed to save profile')
      }

      const result = await response.json()
      if (result.success) {
        setOriginalData({ ...profileData, profileLastUpdated: result.data.profileLastUpdated })
        setProfileData((prev) => ({ ...prev, profileLastUpdated: result.data.profileLastUpdated }))
        setHasChanges(false)
        toast({
          title: 'Sparad!',
          description: 'Din profil har uppdaterats.',
        })
      }
    } catch (error) {
      console.error('Error saving profile:', error)
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
    new Date(profileData.profileLastUpdated) < new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) // 6 months

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
                Informationen du delar här används för att personalisera AI-coachens råd och rekommendationer.
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

      {/* Profile fields */}
      {fields.map((field) => {
        const Icon = field.icon
        const value = profileData[field.key] || ''
        const charCount = value.length

        return (
          <GlassCard key={field.key}>
            <GlassCardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center border',
                    colorMap[field.color]
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">{field.label}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{field.hint}</p>
                </div>
              </div>

              <Textarea
                value={value}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                maxLength={MAX_LENGTH}
                rows={4}
                className="resize-none bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/10 focus:border-orange-500/50 dark:focus:border-orange-500/50 text-sm"
              />

              <div className="flex justify-end mt-2">
                <span
                  className={cn(
                    'text-[10px]',
                    charCount > MAX_LENGTH * 0.9
                      ? 'text-amber-500'
                      : 'text-slate-400 dark:text-slate-500'
                  )}
                >
                  {charCount}/{MAX_LENGTH}
                </span>
              </div>
            </GlassCardContent>
          </GlassCard>
        )
      })}

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
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
