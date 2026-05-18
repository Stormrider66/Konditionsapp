'use client'

import { useState, useEffect } from 'react'
import {
  GlassCard,
  GlassCardContent,
} from '@/components/ui/GlassCard'
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
  disabled?: boolean
}[] = [
  {
    key: 'AUTO',
    labelKey: 'auto',
    descriptionKey: 'auto',
    icon: Sparkles,
    color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    key: 'TEAM',
    labelKey: 'team',
    descriptionKey: 'team',
    icon: Users,
    color: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
  },
  {
    key: 'PT',
    labelKey: 'pt',
    descriptionKey: 'pt',
    icon: User,
    color: 'border-green-500 bg-green-50 dark:bg-green-900/20',
  },
  {
    key: 'GYM',
    labelKey: 'gym',
    descriptionKey: 'gym',
    icon: Dumbbell,
    color: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
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
              'w-full text-left transition-all',
              option.disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <GlassCard
              className={cn(
                'border-2 transition-all',
                isSelected ? option.color : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600',
              )}
            >
              <GlassCardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    isSelected
                      ? 'bg-white dark:bg-slate-800'
                      : 'bg-slate-100 dark:bg-slate-800',
                  )}>
                    <Icon className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">
                        {t(`dashboardMode.options.${option.labelKey}.label`)}
                      </p>
                      {option.key === 'AUTO' && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {t('dashboardMode.badges.recommended')}
                        </span>
                      )}
                      {option.disabled && (
                        <span className="text-[10px] text-muted-foreground">
                          {t('dashboardMode.badges.comingSoon')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t(`dashboardMode.options.${option.descriptionKey}.description`)}
                    </p>
                  </div>
                  {isSelected && !saving && (
                    <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  )}
                  {isSelected && saving && (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              </GlassCardContent>
            </GlassCard>
          </button>
        )
      })}
    </div>
  )
}
