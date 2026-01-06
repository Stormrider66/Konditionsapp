'use client'

/**
 * AIModelSettings
 *
 * Component for selecting preferred AI model in athlete settings.
 * Fetches available models from coach's API keys and saves preference.
 */

import { useState, useEffect } from 'react'
import { Bot, Check, Loader2, Sparkles } from 'lucide-react'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AIModelConfig } from '@/types/ai-models'
import { COST_TIER_LABELS, COST_TIER_COLORS } from '@/types/ai-models'

interface AIModelSettingsProps {
  variant?: 'default' | 'glass'
}

export function AIModelSettings({ variant = 'glass' }: AIModelSettingsProps) {
  const [models, setModels] = useState<AIModelConfig[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [savedModelId, setSavedModelId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch available models
  useEffect(() => {
    fetch('/api/ai/models')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.models) {
          setModels(data.models)
          if (data.defaultModelId) {
            setSelectedModelId(data.defaultModelId)
            setSavedModelId(data.defaultModelId)
          }
        }
      })
      .catch(err => {
        console.error('Failed to fetch models:', err)
        setError('Kunde inte hämta AI-modeller')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // Save model preference
  const handleSelectModel = async (modelId: string) => {
    setSelectedModelId(modelId)
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/models/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId }),
      })

      if (!response.ok) {
        throw new Error('Failed to save preference')
      }

      setSavedModelId(modelId)
    } catch (err) {
      console.error('Failed to save model preference:', err)
      setError('Kunde inte spara inställningen')
      // Revert selection
      setSelectedModelId(savedModelId)
    } finally {
      setSaving(false)
    }
  }

  // Group models by provider
  const groupedModels = models.reduce((acc, model) => {
    const provider = model.provider
    if (!acc[provider]) {
      acc[provider] = []
    }
    acc[provider].push(model)
    return acc
  }, {} as Record<string, AIModelConfig[]>)

  const providerNames: Record<string, string> = {
    google: 'Google (Gemini)',
    anthropic: 'Anthropic (Claude)',
    openai: 'OpenAI (GPT)',
  }

  const providerOrder = ['google', 'anthropic', 'openai']

  if (loading) {
    return (
      <GlassCard>
        <GlassCardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </GlassCardContent>
      </GlassCard>
    )
  }

  if (models.length === 0) {
    return (
      <GlassCard>
        <GlassCardContent className="p-6 text-center text-slate-500 dark:text-slate-400">
          <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Inga AI-modeller tillgängliga</p>
          <p className="text-xs mt-1">Din coach behöver konfigurera API-nycklar</p>
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

      {providerOrder.map(provider => {
        const providerModels = groupedModels[provider]
        if (!providerModels || providerModels.length === 0) return null

        return (
          <div key={provider} className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
              {providerNames[provider]}
            </p>
            {providerModels.map(model => {
              const isSelected = selectedModelId === model.id
              const isSaved = savedModelId === model.id

              return (
                <GlassCard
                  key={model.id}
                  className={cn(
                    'cursor-pointer transition-all',
                    isSelected && 'ring-2 ring-orange-500'
                  )}
                  onClick={() => !saving && handleSelectModel(model.id)}
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
                          {model.recommended ? (
                            <Sparkles className={cn(
                              'h-5 w-5',
                              isSelected ? 'text-orange-500' : 'text-slate-400'
                            )} />
                          ) : (
                            <Bot className={cn(
                              'h-5 w-5',
                              isSelected ? 'text-orange-500' : 'text-slate-400'
                            )} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 dark:text-white">
                              {model.name}
                            </h4>
                            <Badge
                              variant="outline"
                              className={cn('text-[10px]', COST_TIER_COLORS[model.costTier])}
                            >
                              {COST_TIER_LABELS[model.costTier]}
                            </Badge>
                            {model.recommended && (
                              <Badge className="text-[10px] bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30">
                                Rekommenderad
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {model.description}
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
          </div>
        )
      })}

      <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-4">
        Vald modell används för WOD-generering och AI-assistenten
      </p>
    </div>
  )
}
