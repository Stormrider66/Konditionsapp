'use client'

import { useMemo, useState } from 'react'
import { Loader2, Save, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import type { HockeySettings } from '@/components/onboarding/HockeyOnboarding'

interface SportProfileEditorProps {
  clientId: string
  sportProfile: {
    primarySport?: string
    secondarySports?: string[]
    hockeySettings?: unknown
    [key: string]: unknown
  } | null
  onUpdated: (sportProfile: SportProfileEditorProps['sportProfile']) => void
}

const SPORT_OPTIONS = [
  { value: 'RUNNING', label: 'Löpning' },
  { value: 'CYCLING', label: 'Cykling' },
  { value: 'SKIING', label: 'Längdskidåkning' },
  { value: 'SWIMMING', label: 'Simning' },
  { value: 'TRIATHLON', label: 'Triathlon' },
  { value: 'HYROX', label: 'HYROX' },
  { value: 'GENERAL_FITNESS', label: 'Allmän fitness' },
  { value: 'FUNCTIONAL_FITNESS', label: 'Funktionell fitness' },
  { value: 'STRENGTH', label: 'Styrketräning' },
  { value: 'TEAM_ICE_HOCKEY', label: 'Ishockey' },
  { value: 'TEAM_FOOTBALL', label: 'Fotboll' },
  { value: 'TEAM_HANDBALL', label: 'Handboll' },
  { value: 'TEAM_FLOORBALL', label: 'Innebandy' },
  { value: 'TEAM_BASKETBALL', label: 'Basket' },
  { value: 'TEAM_VOLLEYBALL', label: 'Volleyboll' },
  { value: 'TENNIS', label: 'Tennis' },
  { value: 'PADEL', label: 'Padel' },
  { value: 'NUTRITION', label: 'Nutrition' },
]

const HOCKEY_POSITIONS = [
  { value: 'center', label: 'Center' },
  { value: 'wing', label: 'Wing/Forward' },
  { value: 'defense', label: 'Back' },
  { value: 'goalie', label: 'Målvakt' },
]

const HOCKEY_LEVELS = [
  { value: 'recreational', label: 'Motionshockey' },
  { value: 'junior', label: 'Junior' },
  { value: 'hockeyettan', label: 'Hockeyettan' },
  { value: 'division_3', label: 'Division 3' },
  { value: 'division_2', label: 'Division 2' },
  { value: 'division_1', label: 'Division 1' },
  { value: 'hockeyallsvenskan', label: 'Hockeyallsvenskan' },
  { value: 'shl', label: 'SHL' },
]

const DEFAULT_COACH_HOCKEY_SETTINGS: HockeySettings = {
  position: 'center',
  teamName: '',
  leagueLevel: 'recreational',
  seasonPhase: 'off_season',
  averageIceTimeMinutes: null,
  shiftsPerGame: null,
  yearsPlaying: 0,
  playStyle: 'two_way',
  strengthFocus: [],
  weaknesses: [],
  injuryHistory: [],
  weeklyOffIceSessions: 3,
  hasAccessToIce: true,
  hasAccessToGym: true,
}

function asHockeySettings(settings: unknown): HockeySettings {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return DEFAULT_COACH_HOCKEY_SETTINGS
  }

  return {
    ...DEFAULT_COACH_HOCKEY_SETTINGS,
    ...(settings as Partial<HockeySettings>),
  }
}

export function SportProfileEditor({ clientId, sportProfile, onUpdated }: SportProfileEditorProps) {
  const { toast } = useToast()
  const [primarySport, setPrimarySport] = useState(sportProfile?.primarySport || 'RUNNING')
  const [hockeySettings, setHockeySettings] = useState<HockeySettings>(() => asHockeySettings(sportProfile?.hockeySettings))
  const [saving, setSaving] = useState(false)

  const secondarySports = useMemo(
    () => (sportProfile?.secondarySports || []).filter((sport) => sport !== primarySport),
    [primarySport, sportProfile?.secondarySports]
  )

  const updateHockeySettings = <K extends keyof HockeySettings>(key: K, value: HockeySettings[K]) => {
    setHockeySettings((current) => ({ ...current, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        primarySport,
        secondarySports,
      }

      if (primarySport === 'TEAM_ICE_HOCKEY') {
        body.hockeySettings = hockeySettings
      }

      const response = await fetch(`/api/sport-profile/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Kunde inte uppdatera sportprofilen')
      }

      onUpdated(result.data)
      toast({
        title: 'Sportprofil uppdaterad',
        description: primarySport === 'TEAM_ICE_HOCKEY'
          ? 'Atleten visas nu som ishockeyspelare.'
          : 'Primär sport har uppdaterats.',
      })
    } catch (error) {
      console.error('Error updating sport profile:', error)
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Kunde inte uppdatera sportprofilen',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="primary-sport">Primär sport</Label>
            <Select value={primarySport} onValueChange={setPrimarySport}>
              <SelectTrigger id="primary-sport">
                <SelectValue placeholder="Välj sport" />
              </SelectTrigger>
              <SelectContent>
                {SPORT_OPTIONS.map((sport) => (
                  <SelectItem key={sport.value} value={sport.value}>
                    {sport.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {primarySport === 'TEAM_ICE_HOCKEY' && (
            <div className="space-y-2">
              <Label htmlFor="hockey-team">Lag</Label>
              <Input
                id="hockey-team"
                value={hockeySettings.teamName}
                onChange={(event) => updateHockeySettings('teamName', event.target.value)}
                placeholder="Lag/klubb"
              />
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Spara sport
        </Button>
      </div>

      {primarySport === 'TEAM_ICE_HOCKEY' && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="hockey-position">Position</Label>
            <Select
              value={hockeySettings.position}
              onValueChange={(value) => updateHockeySettings('position', value as HockeySettings['position'])}
            >
              <SelectTrigger id="hockey-position">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOCKEY_POSITIONS.map((position) => (
                  <SelectItem key={position.value} value={position.value}>
                    {position.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hockey-level">Nivå</Label>
            <Select
              value={hockeySettings.leagueLevel}
              onValueChange={(value) => updateHockeySettings('leagueLevel', value as HockeySettings['leagueLevel'])}
            >
              <SelectTrigger id="hockey-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOCKEY_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2 text-sm text-gray-600 dark:text-slate-400">
            <Shield className="mb-2 h-4 w-4 text-blue-500" />
            <span className="pb-1">Hockeyvyn aktiveras efter sparning.</span>
          </div>
        </div>
      )}
    </div>
  )
}
