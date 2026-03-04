'use client'

/**
 * AIModelSettings
 *
 * Component for selecting preferred AI quality tier in athlete settings.
 * Shows 3 simple tiers (Snabb / Balanserad / Kraftfull) instead of raw model names.
 */

import { useState, useEffect } from 'react'
import { Check, Loader2, Zap, Sparkles, Flame, Bot } from 'lucide-react'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ModelIntent } from '@/types/ai-models'

interface IntentTier {
  intent: ModelIntent
  label: string
  description: string
  icon: 'zap' | 'sparkles' | 'flame'
}

const TIER_ICONS = {
  zap: Zap,
  sparkles: Sparkles,
  flame: Flame,
} as const

const TIER_COLORS: Record<ModelIntent, string> = {
  fast: 'bg-blue-500/20 border-blue-500/30 text-blue-600',
  balanced: 'bg-orange-500/20 border-orange-500/30 text-orange-600',
  powerful: 'bg-purple-500/20 border-purple-500/30 text-purple-600',
}

interface AIModelSettingsProps {
  variant?: 'default' | 'glass'
}

export function AIModelSettings({ variant = 'glass' }: AIModelSettingsProps) {
  const [tiers, setTiers] = useState<IntentTier[]>([])
  const [selectedIntent, setSelectedIntent] = useState<ModelIntent | null>(null)
  const [savedIntent, setSavedIntent] = useState<ModelIntent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch available tiers and saved preference
  useEffect(() => {
    async function fetchData() {
      try {
        const [modelsRes, prefRes] = await Promise.all([
          fetch('/api/ai/models'),
          fetch('/api/ai/models/preference'),
        ])

        const modelsData = await modelsRes.json()
        const prefData = await prefRes.json()

        if (modelsData.success && modelsData.mode === 'intent' && modelsData.tiers) {
          setTiers(modelsData.tiers)

          // Use saved preference or default
          const prefIntent = prefData.success && prefData.intent
            ? prefData.intent as ModelIntent
            : modelsData.defaultIntent as ModelIntent

          if (prefIntent && modelsData.tiers.find((t: IntentTier) => t.intent === prefIntent)) {
            setSelectedIntent(prefIntent)
            setSavedIntent(prefIntent)
          } else if (modelsData.defaultIntent) {
            setSelectedIntent(modelsData.defaultIntent)
            setSavedIntent(modelsData.defaultIntent)
          }
        }
      } catch (err) {
        console.error('Failed to fetch AI tiers:', err)
        setError('Kunde inte hämta AI-inställningar')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Save intent preference
  const handleSelectIntent = async (intent: ModelIntent) => {
    setSelectedIntent(intent)
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/models/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent }),
      })

      if (!response.ok) {
        throw new Error('Failed to save preference')
      }

      setSavedIntent(intent)
    } catch (err) {
      console.error('Failed to save intent preference:', err)
      setError('Kunde inte spara inställningen')
      setSelectedIntent(savedIntent)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <GlassCard>
        <GlassCardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </GlassCardContent>
      </GlassCard>
    )
  }

  if (tiers.length === 0) {
    return (
      <GlassCard>
        <GlassCardContent className="p-6 text-center text-slate-500 dark:text-slate-400">
          <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Ingen AI tillgänglig</p>
          <p className="text-xs mt-1">AI är inte aktiverat just nu</p>
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {tiers.map(tier => {
        const Icon = TIER_ICONS[tier.icon]
        const isSelected = selectedIntent === tier.intent
        const isSaved = savedIntent === tier.intent
        const isRecommended = tier.intent === 'balanced'

        return (
          <GlassCard
            key={tier.intent}
            className={cn(
              'cursor-pointer transition-all',
              isSelected && 'ring-2 ring-orange-500'
            )}
            onClick={() => !saving && handleSelectIntent(tier.intent)}
          >
            <GlassCardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    isSelected
                      ? 'bg-orange-500/20 border border-orange-500/30'
                      : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10'
                  )}>
                    <Icon className={cn(
                      'h-5 w-5',
                      isSelected ? 'text-orange-500' : 'text-slate-400'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 dark:text-white">
                        {tier.label}
                      </h4>
                      {isRecommended && (
                        <Badge className="text-[10px] bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30">
                          Rekommenderad
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {tier.description}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  {saving && isSelected ? (
                    <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                  ) : isSaved ? (
                    <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  ) : (
                    <div className={cn(
                      'w-6 h-6 rounded-full border-2',
                      isSelected
                        ? 'border-orange-500'
                        : 'border-slate-300 dark:border-slate-600'
                    )} />
                  )}
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        )
      })}

      <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-4">
        Vald kvalitetsnivå används för WOD-generering och AI-assistenten
      </p>
    </div>
  )
}
