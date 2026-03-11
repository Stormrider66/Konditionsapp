'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Shield, Eye, EyeOff, Users } from 'lucide-react'

interface Permission {
  key: string
  label: string
  description: string
  defaultValue: boolean
  sensitive?: boolean
}

const PERMISSIONS: Permission[] = [
  {
    key: 'shareFoodDetails',
    label: 'Matdetaljer',
    description: 'Individuella livsmedel, portioner och näringskällor',
    defaultValue: true,
  },
  {
    key: 'shareFoodSummaries',
    label: 'Kostsammanfattningar',
    description: 'Månads- och årssammanfattningar, topplivsmedel, trender',
    defaultValue: true,
  },
  {
    key: 'shareBodyComposition',
    label: 'Kroppssammansättning',
    description: 'Vikt, kroppsfett, muskelmassa och bioimpedansdata',
    defaultValue: true,
  },
  {
    key: 'shareWorkoutNotes',
    label: 'Träningsanteckningar',
    description: 'Personliga kommentarer och RPE-bedömningar på pass',
    defaultValue: true,
  },
  {
    key: 'shareDailyCheckIns',
    label: 'Dagliga incheckningar',
    description: 'Beredskap, humör, sömn och energinivåer',
    defaultValue: true,
  },
  {
    key: 'shareInjuryDetails',
    label: 'Skadeinformation',
    description: 'Smärtrapporter, skadebedömningar och rehabilitering',
    defaultValue: true,
  },
  {
    key: 'shareMenstrualData',
    label: 'Menstruationsdata',
    description: 'Menscykeldata och relaterade symptom',
    defaultValue: false,
    sensitive: true,
  },
]

export function PrivacySettings() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [hasCoach, setHasCoach] = useState(false)
  const [coachName, setCoachName] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPermissions() {
      try {
        const response = await fetch('/api/athlete/privacy')
        if (!response.ok) return
        const data = await response.json()
        setPermissions(data.permissions)
        setHasCoach(data.hasCoach)
        setCoachName(data.coachName)
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchPermissions()
  }, [])

  const handleToggle = async (key: string, value: boolean) => {
    setPermissions((prev) => ({ ...prev, [key]: value }))
    setSaving(true)
    try {
      const response = await fetch('/api/athlete/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (!response.ok) throw new Error()
      toast({
        title: 'Sparad',
        description: `Inställning uppdaterad`,
      })
    } catch {
      // Revert on failure
      setPermissions((prev) => ({ ...prev, [key]: !value }))
      toast({
        title: 'Fel',
        description: 'Kunde inte spara inställning',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleShareAll = async () => {
    const allOn: Record<string, boolean> = {}
    PERMISSIONS.forEach((p) => {
      allOn[p.key] = true
    })
    setPermissions(allOn)
    setSaving(true)
    try {
      const response = await fetch('/api/athlete/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allOn),
      })
      if (!response.ok) throw new Error()
      toast({ title: 'Alla behörigheter aktiverade' })
    } catch {
      toast({ title: 'Fel', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleShareNone = async () => {
    const allOff: Record<string, boolean> = {}
    PERMISSIONS.forEach((p) => {
      allOff[p.key] = false
    })
    setPermissions(allOff)
    setSaving(true)
    try {
      const response = await fetch('/api/athlete/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allOff),
      })
      if (!response.ok) throw new Error()
      toast({ title: 'Alla behörigheter inaktiverade' })
    } catch {
      toast({ title: 'Fel', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Coach status */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <Users className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="flex-1">
            {hasCoach ? (
              <>
                <p className="text-sm font-medium text-white">
                  Din coach: {coachName}
                </p>
                <p className="text-xs text-slate-500">
                  Styr vilken data din coach kan se nedan
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-400">
                  Ingen aktiv coach
                </p>
                <p className="text-xs text-slate-500">
                  Dessa inställningar aktiveras när du har en coach
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
          onClick={handleShareAll}
          disabled={saving}
        >
          <Eye className="h-3.5 w-3.5" />
          Dela allt
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
          onClick={handleShareNone}
          disabled={saving}
        >
          <EyeOff className="h-3.5 w-3.5" />
          Dela inget
        </Button>
      </div>

      {/* Permission toggles */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <Shield className="h-4 w-4 text-cyan-400" />
            Delningsinställningar
          </CardTitle>
          <CardDescription className="text-slate-400">
            Välj vilken information din coach får se
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {PERMISSIONS.map((perm) => (
            <div
              key={perm.key}
              className={`flex items-center justify-between rounded-lg p-3 ${
                perm.sensitive ? 'bg-rose-500/5 border border-rose-500/10' : ''
              }`}
            >
              <div className="space-y-0.5 flex-1 mr-4">
                <p className="text-sm font-medium text-white">{perm.label}</p>
                <p className="text-xs text-slate-500">{perm.description}</p>
              </div>
              <Switch
                checked={permissions[perm.key] ?? perm.defaultValue}
                onCheckedChange={(checked) => handleToggle(perm.key, checked)}
                disabled={saving}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
