'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

const ALL_TIERS: ModelIntent[] = ['fast', 'balanced', 'powerful']

function getTierModelNames(intent: ModelIntent): string {
  const tier = MODEL_TIERS[intent]
  return [tier.google.displayName, tier.anthropic.displayName, tier.openai.displayName].join(', ')
}

export function AthleteModelSettings() {
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
    fetchSettings()
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
          title: 'Inställningar sparade',
          description: 'Atleternas AI-kvalitetsnivåer har uppdaterats.',
        })
      } else {
        toast({
          title: 'Kunde inte spara',
          description: data.error || 'Försök igen.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Kunde inte spara',
        description: 'Ett oväntat fel uppstod.',
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
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!hasKeys) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Atleternas AI-kvalitet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Inga AI-modeller är tillgängliga. Se till att du har giltiga API-nycklar konfigurerade.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Atleternas AI-kvalitet
        </CardTitle>
        <CardDescription>
          Välj vilka kvalitetsnivåer dina atleter kan använda. Lämna alla omarkerade för att tillåta alla nivåer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tier checklist */}
        <div className="space-y-3">
          {ALL_TIERS.map((tier) => {
            const tierInfo = INTENT_TIER_LABELS[tier]
            return (
              <label
                key={tier}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  className="mt-0.5"
                  checked={allowedTiers.includes(tier)}
                  onCheckedChange={(checked) => handleToggleTier(tier, checked === true)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{tierInfo.label}</span>
                    {tier === 'balanced' && (
                      <Badge variant="outline" className="text-xs">
                        Rekommenderad
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tierInfo.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    Modeller: {getTierModelNames(tier)}
                  </p>
                </div>
              </label>
            )
          })}
        </div>

        {allowedTiers.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Inga nivåer markerade = alla kvalitetsnivåer tillåtna.
          </p>
        )}

        {/* Default tier dropdown */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Standardnivå för atleter</label>
          <Select
            value={defaultTier ?? 'auto'}
            onValueChange={(v) => setDefaultTier(v === 'auto' ? null : v as ModelIntent)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Automatisk (Balanserad)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automatisk (Balanserad)</SelectItem>
              {defaultCandidates.map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {INTENT_TIER_LABELS[tier].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Save */}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Spara inställningar
        </Button>
      </CardContent>
    </Card>
  )
}
