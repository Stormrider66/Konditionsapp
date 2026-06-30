'use client'

import { useState, useEffect } from 'react'
import { Users, User, Dumbbell, Sparkles, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'

type ModeOption = 'AUTO' | 'TEAM' | 'PT' | 'GYM'

interface DashboardModeSelectorProps {
  initialMode?: string | null
}

const MODE_OPTIONS: {
  key: ModeOption
  labelKey: 'auto' | 'team' | 'pt' | 'gym'
  descriptionKey: 'auto' | 'team' | 'pt' | 'gym'
  icon: typeof Users
  color: string
  iconColor: string
  disabled?: boolean
}[] = [
  {
    key: 'AUTO',
    labelKey: 'auto',
    descriptionKey: 'auto',
    icon: Sparkles,
    color: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30',
    iconColor: 'text-emerald-600 dark:text-emerald-300',
  },
  {
    key: 'TEAM',
    labelKey: 'team',
    descriptionKey: 'team',
    icon: Users,
    color: 'border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/30',
    iconColor: 'text-blue-600 dark:text-blue-300',
  },
  {
    key: 'PT',
    labelKey: 'pt',
    descriptionKey: 'pt',
    icon: User,
    color: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30',
    iconColor: 'text-emerald-600 dark:text-emerald-300',
  },
  {
    key: 'GYM',
    labelKey: 'gym',
    descriptionKey: 'gym',
    icon: Dumbbell,
    color: 'border-zinc-300 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900/60',
    iconColor: 'text-zinc-600 dark:text-zinc-300',
  },
]

export function DashboardModeSelector({ initialMode }: DashboardModeSelectorProps) {
  const t = useTranslations('components.settings.coach')
  const [selectedMode, setSelectedMode] = useState<ModeOption>(
    initialMode === 'TEAM' || initialMode === 'PT' || initialMode === 'GYM'
      ? initialMode
      : 'AUTO'
  )
  const [saving, setSaving] = useState(false)

  // Fetch current mode on mount
  useEffect(() => {
    fetch('/api/coach/dashboard-mode')
      .then(res => res.json())
      .then(data => {
        if (data.dashboardMode) {
          setSelectedMode(data.dashboardMode as ModeOption)
        } else {
          setSelectedMode('AUTO')
        }
      })
      .catch(() => {})
  }, [])

  const handleSelect = async (mode: ModeOption) => {
    if (mode === selectedMode) return
    setSelectedMode(mode)
    setSaving(true)
    try {
      await fetch('/api/coach/dashboard-mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dashboardMode: mode === 'AUTO' ? null : mode,
        }),
      })
    } catch (err) {
      console.error('Failed to save dashboard mode:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {MODE_OPTIONS.map(option => {
        const Icon = option.icon
        const isSelected = selectedMode === option.key
        return (
          <button
            key={option.key}
            onClick={() => !option.disabled && handleSelect(option.key)}
            disabled={option.disabled}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors',
              isSelected
                ? option.color
                : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950/60 dark:hover:border-white/20 dark:hover:bg-zinc-900/70',
              option.disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-zinc-900">
              <Icon className={cn('h-5 w-5', isSelected ? option.iconColor : 'text-zinc-500 dark:text-zinc-400')} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {t(`dashboardMode.options.${option.labelKey}.label`)}
                </p>
                {option.key === 'AUTO' && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    {t('dashboardMode.badges.recommended')}
                  </span>
                )}
                {option.disabled && (
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {t('dashboardMode.badges.comingSoon')}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                {t(`dashboardMode.options.${option.descriptionKey}.description`)}
              </p>
            </div>
            {isSelected && !saving && (
              <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            {isSelected && saving && (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-zinc-500 dark:text-zinc-400" />
            )}
          </button>
        )
      })}
    </div>
  )
}
