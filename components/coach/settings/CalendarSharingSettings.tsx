'use client'

import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, Users, UserIcon, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarSettingsState {
  calendarVisibility: 'FULL_DETAILS' | 'BUSY_ONLY' | 'HIDDEN'
  shareTeamEvents: boolean
  shareAthleteEvents: boolean
}

export function CalendarSharingSettings({ businessId }: { businessId: string }) {
  const [settings, setSettings] = useState<CalendarSettingsState>({
    calendarVisibility: 'FULL_DETAILS',
    shareTeamEvents: true,
    shareAthleteEvents: false,
  })
  const [isOwner, setIsOwner] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

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
    if (businessId) fetchSettings()
  }, [businessId])

  const updateSetting = async (updates: Partial<CalendarSettingsState>) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    setSaving(true)
    try {
      await fetch(`/api/business/${businessId}/calendar-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
    } catch (err) {
      console.error('Failed to save calendar settings:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return null
  if (!isOwner) {
    return (
      <div className="bg-white/60 dark:bg-white/5 backdrop-blur-md border border-slate-200/50 dark:border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <Shield className="w-5 h-5" />
          <p className="text-sm">Bara ägare och admins kan ändra kalenderdelning.</p>
        </div>
      </div>
    )
  }

  const visibilityOptions = [
    { value: 'FULL_DETAILS' as const, label: 'Fullständiga detaljer', desc: 'Medlemmar ser hela händelsen', icon: Eye },
    { value: 'BUSY_ONLY' as const, label: 'Bara tillgänglighet', desc: 'Medlemmar ser bara "Upptagen"', icon: EyeOff },
    { value: 'HIDDEN' as const, label: 'Dold', desc: 'Kalendern syns inte i samlad vy', icon: EyeOff },
  ]

  return (
    <div className="space-y-4">
      {/* Visibility level */}
      <div className="bg-white/60 dark:bg-white/5 backdrop-blur-md border border-slate-200/50 dark:border-white/10 rounded-2xl p-4 space-y-3">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Synlighet i samlad kalender</h4>
        <p className="text-xs text-slate-500">Styr hur din organisations kalender syns för medlemmar som arbetar med flera organisationer.</p>
        <div className="space-y-2">
          {visibilityOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateSetting({ calendarVisibility: opt.value })}
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
                  {opt.label}
                </div>
                <div className="text-xs text-slate-500">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* What to share */}
      {settings.calendarVisibility !== 'HIDDEN' && (
        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-md border border-slate-200/50 dark:border-white/10 rounded-2xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Vad delas?</h4>
          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200/50 dark:border-white/10 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-slate-400" />
              <div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Laghändelser</div>
                <div className="text-xs text-slate-500">Matcher, träningar, tester, lediga dagar</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.shareTeamEvents}
              onChange={(e) => updateSetting({ shareTeamEvents: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200/50 dark:border-white/10 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
            <div className="flex items-center gap-3">
              <UserIcon className="w-5 h-5 text-slate-400" />
              <div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Atlethändelser</div>
                <div className="text-xs text-slate-500">Individuella kalenderhändelser (tävlingar, camps etc.)</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.shareAthleteEvents}
              onChange={(e) => updateSetting({ shareAthleteEvents: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
            />
          </label>
        </div>
      )}

      {saving && <p className="text-xs text-slate-500 text-center">Sparar...</p>}
    </div>
  )
}
