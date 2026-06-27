'use client'

import { useState, useEffect, useCallback } from 'react'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Save, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { INTENT_TIER_LABELS, MODEL_TIERS } from '@/types/ai-models'
import type { ModelIntent } from '@/types/ai-models'
import { useTranslations } from '@/i18n/client'

const ALL_TIERS: ModelIntent[] = ['fast', 'balanced', 'powerful']

function getTierModelNames(intent: ModelIntent): string {
  const tier = MODEL_TIERS[intent]
  return [tier.google.displayName, tier.anthropic.displayName, tier.openai.displayName].join(', ')
}

export function AthleteModelSettings() {
  const t = useTranslations('components.settings.coach')
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [allowedTiers, setAllowedTiers] = useState<ModelIntent[]>([])
  const [defaultTier, setDefaultTier] = useState<ModelIntent | null>(null)
  const [hasKeys, setHasKeys] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/athlete-models')
      const data = await response.json()
      if (data.success) {
        setAllowedTiers(data.data.allowedTiers || [])
        setDefaultTier(data.data.defaultTier || null)
        setHasKeys(data.data.hasKeys ?? true)
      }
    } catch (error) {
      console.error('Failed to fetch athlete model settings:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSettings()
  }, [fetchSettings])

  function handleToggleTier(tier: ModelIntent, checked: boolean) {
    setAllowedTiers(prev => {
      if (checked) {
        return [...prev, tier]
      } else {
        const next = prev.filter(t => t !== tier)
        // If we remove the default from allowed, clear it
        if (tier === defaultTier) {
          setDefaultTier(null)
        }
        return next
      }
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/athlete-models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowedTiers,
          defaultTier,
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast({
          title: t('athleteModels.toasts.saved.title'),
          description: t('athleteModels.toasts.saved.description'),
        })
      } else {
        toast({
          title: t('athleteModels.toasts.saveFailed.title'),
          description: data.error || t('athleteModels.toasts.saveFailed.fallbackDescription'),
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: t('athleteModels.toasts.saveFailed.title'),
        description: t('athleteModels.toasts.saveFailed.unexpectedDescription'),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Tiers available for default dropdown (allowed ones, or all if unrestricted)
  const defaultCandidates = allowedTiers.length > 0 ? allowedTiers : ALL_TIERS

  if (loading) {
    return (
      <RolePanel className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500 dark:text-zinc-400" />
      </RolePanel>
    )
  }

  if (!hasKeys) {
    return (
      <RolePanel className="p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300">
            <Users className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{t('athleteModels.title')}</h3>
        </div>
        <p className="mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{t('athleteModels.noKeys')}</p>
      </RolePanel>
    )
  }

  return (
    <RolePanel className="p-5">
      <div className="border-b border-zinc-200 pb-5 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{t('athleteModels.title')}</h3>
            <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              {t('athleteModels.description')}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-5 space-y-6">
        <div className="space-y-3">
          {ALL_TIERS.map((tier) => {
            const tierInfo = INTENT_TIER_LABELS[tier]
            return (
              <label
                key={tier}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950/60 dark:hover:border-white/20 dark:hover:bg-zinc-900/70"
              >
                <Checkbox
                  className="mt-0.5"
                  checked={allowedTiers.includes(tier)}
                  onCheckedChange={(checked) => handleToggleTier(tier, checked === true)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-950 dark:text-zinc-50">{tierInfo.label}</span>
                    {tier === 'balanced' && (
                      <Badge variant="outline" className="text-xs">
                        {t('athleteModels.tiers.recommendedBadge')}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {tierInfo.description}
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                    {t('athleteModels.tiers.availableModels')} {getTierModelNames(tier)}
                  </p>
                </div>
              </label>
            )
          })}
        </div>

        {allowedTiers.length === 0 && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t('athleteModels.noSelectionMessage')}
          </p>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('athleteModels.defaultLabel')}</label>
          <Select
            value={defaultTier ?? 'auto'}
            onValueChange={(v) => setDefaultTier(v === 'auto' ? null : v as ModelIntent)}
          >
            <SelectTrigger className="w-full border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-900">
              <SelectValue placeholder={t('athleteModels.autoPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{t('athleteModels.autoLabel')}</SelectItem>
              {defaultCandidates.map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {INTENT_TIER_LABELS[tier].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {t('athleteModels.save')}
        </Button>
      </div>
    </RolePanel>
  )
}
