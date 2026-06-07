'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Shield, Eye, EyeOff, Users } from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { ExternalAthleteAccessCard } from '@/components/coach/clients/ExternalAthleteAccessCard'

interface Permission {
  key: string
  labelKey: string
  descriptionKey: string
  defaultValue: boolean
  sensitive?: boolean
}

const PERMISSIONS: Permission[] = [
  {
    key: 'shareFoodDetails',
    labelKey: 'permissions.shareFoodDetails.label',
    descriptionKey: 'permissions.shareFoodDetails.description',
    defaultValue: true,
  },
  {
    key: 'shareFoodSummaries',
    labelKey: 'permissions.shareFoodSummaries.label',
    descriptionKey: 'permissions.shareFoodSummaries.description',
    defaultValue: true,
  },
  {
    key: 'shareBodyComposition',
    labelKey: 'permissions.shareBodyComposition.label',
    descriptionKey: 'permissions.shareBodyComposition.description',
    defaultValue: true,
  },
  {
    key: 'shareWorkoutNotes',
    labelKey: 'permissions.shareWorkoutNotes.label',
    descriptionKey: 'permissions.shareWorkoutNotes.description',
    defaultValue: true,
  },
  {
    key: 'shareDailyCheckIns',
    labelKey: 'permissions.shareDailyCheckIns.label',
    descriptionKey: 'permissions.shareDailyCheckIns.description',
    defaultValue: true,
  },
  {
    key: 'shareInjuryDetails',
    labelKey: 'permissions.shareInjuryDetails.label',
    descriptionKey: 'permissions.shareInjuryDetails.description',
    defaultValue: true,
  },
  {
    key: 'shareMenstrualData',
    labelKey: 'permissions.shareMenstrualData.label',
    descriptionKey: 'permissions.shareMenstrualData.description',
    defaultValue: false,
    sensitive: true,
  },
]

export function PrivacySettings() {
  const t = useTranslations('components.privacySettings')
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
    void fetchPermissions()
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
        title: t('toast.savedTitle'),
        description: t('toast.savedDescription'),
      })
    } catch {
      // Revert on failure
      setPermissions((prev) => ({ ...prev, [key]: !value }))
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
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
      toast({ title: t('toast.allEnabled') })
    } catch {
      toast({ title: t('toast.errorTitle'), variant: 'destructive' })
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
      toast({ title: t('toast.allDisabled') })
    } catch {
      toast({ title: t('toast.errorTitle'), variant: 'destructive' })
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
      <Card className="bg-white border-slate-200 dark:bg-white/5 dark:border-white/10">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <Users className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="flex-1">
            {hasCoach ? (
              <>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {t('coach.active', { coachName: coachName ?? '' })}
                </p>
                <p className="text-xs text-slate-500">
                  {t('coach.activeDescription')}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {t('coach.none')}
                </p>
                <p className="text-xs text-slate-500">
                  {t('coach.noneDescription')}
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <ExternalAthleteAccessCard mode="athlete" endpoint="/api/athlete/external-access" />

      {/* Quick actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-white border-slate-200 hover:bg-slate-100 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:text-slate-300"
          onClick={handleShareAll}
          disabled={saving}
        >
          <Eye className="h-3.5 w-3.5" />
          {t('actions.shareAll')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-white border-slate-200 hover:bg-slate-100 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:text-slate-300"
          onClick={handleShareNone}
          disabled={saving}
        >
          <EyeOff className="h-3.5 w-3.5" />
          {t('actions.shareNone')}
        </Button>
      </div>

      {/* Permission toggles */}
      <Card className="bg-white border-slate-200 dark:bg-white/5 dark:border-white/10">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
            <Shield className="h-4 w-4 text-cyan-400" />
            {t('title')}
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            {t('description')}
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
                <p className="text-sm font-medium text-slate-900 dark:text-white">{t(perm.labelKey)}</p>
                <p className="text-xs text-slate-500">{t(perm.descriptionKey)}</p>
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
