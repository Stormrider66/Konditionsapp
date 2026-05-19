'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Eye, EyeOff, Users, UserIcon, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'

interface CalendarSettingsState {
  calendarVisibility: 'FULL_DETAILS' | 'BUSY_ONLY' | 'HIDDEN'
  shareTeamEvents: boolean
  shareAthleteEvents: boolean
}

type CalendarVisibilityOption = 'fullDetails' | 'busyOnly' | 'hidden'

export function CalendarSharingSettings({ businessId }: { businessId: string }) {
  const t = useTranslations('components.settings.coach')
  const [settings, setSettings] = useState<CalendarSettingsState>({
    calendarVisibility: 'FULL_DETAILS',
    shareTeamEvents: true,
    shareAthleteEvents: false,
  })
  const [isOwner, setIsOwner] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`/api/business/${businessId}/calendar-settings`)
        if (res.ok) {
          const data = await res.json()
          setSettings({
            calendarVisibility: data.settings?.calendarVisibility || 'FULL_DETAILS',
            shareTeamEvents: data.settings?.shareTeamEvents ?? true,
            shareAthleteEvents: data.settings?.shareAthleteEvents ?? false,
          })
          setIsOwner(data.isOwner)
        }
      } catch (err) {
        console.error('Failed to fetch calendar settings:', err)
      } finally {
        setLoaded(true)
      }
    }
    if (businessId) void fetchSettings()
  }, [businessId])

  const persistSettings = useCallback(async (newSettings: CalendarSettingsState) => {
    setSaving(true)
    setSaveError(false)
    try {
      const res = await fetch(`/api/business/${businessId}/calendar-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
      if (!res.ok) throw new Error('Save failed')
    } catch (err) {
      console.error('Failed to save calendar settings:', err)
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }, [businessId])

  const updateSetting = (updates: Partial<CalendarSettingsState>) => {
    const oldSettings = { ...settings }
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    setSaveError(false)

    // Debounce: wait 500ms before saving to batch rapid changes
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        await persistSettings(newSettings)
      } catch {
        // Rollback on failure
        setSettings(oldSettings)
      }
    }, 500)
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  if (!loaded) return null
  if (!isOwner) {
    return (
      <GlassCard glow="slate" className="p-4">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <Shield className="w-5 h-5" />
          <p className="text-sm">{t('calendarSharing.permissionMessage')}</p>
        </div>
      </GlassCard>
    )
  }

  const visibilityOptions: {
    value: CalendarSettingsState['calendarVisibility']
    key: CalendarVisibilityOption
    icon: typeof Eye
  }[] = [
    { value: 'FULL_DETAILS', key: 'fullDetails', icon: Eye },
    { value: 'BUSY_ONLY', key: 'busyOnly', icon: EyeOff },
    { value: 'HIDDEN', key: 'hidden', icon: EyeOff },
  ]

  return (
    <div className="space-y-4">
      {/* Visibility level */}
      <GlassCard glow="blue">
        <GlassCardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{t('calendarSharing.visibility.title')}</h4>
          <p className="text-xs text-slate-500">{t('calendarSharing.visibility.help')}</p>
          <div className="space-y-2" role="radiogroup" aria-label={t('calendarSharing.visibility.accessibilityLabel')}>
            {visibilityOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateSetting({ calendarVisibility: opt.value })}
                role="radio"
                aria-checked={settings.calendarVisibility === opt.value}
                className={cn(
                  'flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-all',
                  settings.calendarVisibility === opt.value
                    ? 'border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10'
                    : 'border-slate-200/50 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                )}
              >
                <opt.icon className={cn(
                  'w-5 h-5 shrink-0',
                  settings.calendarVisibility === opt.value ? 'text-blue-500' : 'text-slate-400'
                )} />
                <div>
                  <div className={cn(
                    'text-sm font-medium',
                    settings.calendarVisibility === opt.value ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
                  )}>
                    {t(`calendarSharing.visibility.options.${opt.key}.label`)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {t(`calendarSharing.visibility.options.${opt.key}.description`)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* What to share */}
      {settings.calendarVisibility !== 'HIDDEN' && (
        <GlassCard glow="blue">
          <GlassCardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{t('calendarSharing.sharing.title')}</h4>
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200/50 dark:border-white/10 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('calendarSharing.eventGroups.team.title')}
                  </div>
                  <div className="text-xs text-slate-500">
                    {t('calendarSharing.eventGroups.team.description')}
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.shareTeamEvents}
                onChange={(e) => updateSetting({ shareTeamEvents: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                aria-label={t('calendarSharing.eventGroups.team.label')}
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200/50 dark:border-white/10 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
              <div className="flex items-center gap-3">
                <UserIcon className="w-5 h-5 text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('calendarSharing.eventGroups.athlete.title')}
                  </div>
                  <div className="text-xs text-slate-500">
                    {t('calendarSharing.eventGroups.athlete.description')}
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.shareAthleteEvents}
                onChange={(e) => updateSetting({ shareAthleteEvents: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                aria-label={t('calendarSharing.eventGroups.athlete.label')}
              />
            </label>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Status feedback */}
      {saving && <p className="text-xs text-slate-500 text-center">{t('calendarSharing.status.saving')}</p>}
      {saveError && <p className="text-xs text-red-400 text-center">{t('calendarSharing.status.saveFailed')}</p>}
    </div>
  )
}
