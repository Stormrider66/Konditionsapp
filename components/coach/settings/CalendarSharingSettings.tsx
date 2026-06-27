'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Eye, EyeOff, Users, UserIcon, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'

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
      <RolePanel className="p-4">
        <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
          <Shield className="h-5 w-5" />
          <p className="text-sm">{t('calendarSharing.permissionMessage')}</p>
        </div>
      </RolePanel>
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
      <RolePanel className="p-4">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{t('calendarSharing.visibility.title')}</h4>
            <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{t('calendarSharing.visibility.help')}</p>
          </div>
          <div className="space-y-2" role="radiogroup" aria-label={t('calendarSharing.visibility.accessibilityLabel')}>
            {visibilityOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateSetting({ calendarVisibility: opt.value })}
                role="radio"
                aria-checked={settings.calendarVisibility === opt.value}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                  settings.calendarVisibility === opt.value
                    ? 'border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/30'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950/60 dark:hover:border-white/20 dark:hover:bg-zinc-900/70'
                )}
              >
                <opt.icon className={cn(
                  'h-5 w-5 shrink-0',
                  settings.calendarVisibility === opt.value ? 'text-blue-600 dark:text-blue-300' : 'text-zinc-400'
                )} />
                <div className="min-w-0">
                  <div className={cn(
                    'text-sm font-medium',
                    settings.calendarVisibility === opt.value ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-700 dark:text-zinc-300'
                  )}>
                    {t(`calendarSharing.visibility.options.${opt.key}.label`)}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                    {t(`calendarSharing.visibility.options.${opt.key}.description`)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </RolePanel>

      {settings.calendarVisibility !== 'HIDDEN' && (
        <RolePanel className="p-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{t('calendarSharing.sharing.title')}</h4>
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-zinc-200 p-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-zinc-900/70">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 shrink-0 text-zinc-400" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t('calendarSharing.eventGroups.team.title')}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                    {t('calendarSharing.eventGroups.team.description')}
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.shareTeamEvents}
                onChange={(e) => updateSetting({ shareTeamEvents: e.target.checked })}
                className="h-5 w-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-white/20"
                aria-label={t('calendarSharing.eventGroups.team.label')}
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-zinc-200 p-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-zinc-900/70">
              <div className="flex items-center gap-3">
                <UserIcon className="h-5 w-5 shrink-0 text-zinc-400" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t('calendarSharing.eventGroups.athlete.title')}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                    {t('calendarSharing.eventGroups.athlete.description')}
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.shareAthleteEvents}
                onChange={(e) => updateSetting({ shareAthleteEvents: e.target.checked })}
                className="h-5 w-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-white/20"
                aria-label={t('calendarSharing.eventGroups.athlete.label')}
              />
            </label>
          </div>
        </RolePanel>
      )}

      {saving && <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">{t('calendarSharing.status.saving')}</p>}
      {saveError && <p className="text-center text-xs text-red-500 dark:text-red-400">{t('calendarSharing.status.saveFailed')}</p>}
    </div>
  )
}
