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
import { Loader2, Save, Shield, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface EligibleModel {
  id: string
  modelId: string
  provider: 'ANTHROPIC' | 'GOOGLE' | 'OPENAI'
  displayName: string
  isDefault: boolean
  inputCostPer1k: number | null
  outputCostPer1k: number | null
  availableForAthletes: boolean
}

const providerColors: Record<string, string> = {
  ANTHROPIC: 'bg-orange-100 text-orange-800',
  GOOGLE: 'bg-blue-100 text-blue-800',
  OPENAI: 'bg-green-100 text-green-800',
}

const providerNames: Record<string, string> = {
  ANTHROPIC: 'Claude',
  GOOGLE: 'Gemini',
  OPENAI: 'GPT',
}

function getCostTier(model: EligibleModel): string {
  const cost = model.inputCostPer1k ?? 0
  if (cost >= 0.01) return 'Hög'
  if (cost >= 0.001) return 'Medel'
  return 'Låg'
}

export function BusinessModelSharingSection() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [eligibleModels, setEligibleModels] = useState<EligibleModel[]>([])
  const [coachAllowedIds, setCoachAllowedIds] = useState<string[]>([])
  const [athleteAllowedIds, setAthleteAllowedIds] = useState<string[]>([])
  const [coachDefaultModelId, setCoachDefaultModelId] = useState<string | null>(null)
  const [athleteDefaultModelId, setAthleteDefaultModelId] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/coach/admin/ai-keys/models')
      const data = await response.json()
      if (data.success) {
        setEligibleModels(data.data.eligibleModels)
        setCoachAllowedIds(data.data.allowedModelIds)
        setAthleteAllowedIds(data.data.allowedAthleteModelIds)
        setCoachDefaultModelId(data.data.defaultModelId)
        setAthleteDefaultModelId(data.data.athleteDefaultModelId)
      }
    } catch (error) {
      console.error('Failed to fetch model sharing settings:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  function handleToggleCoachModel(modelId: string, checked: boolean) {
    setCoachAllowedIds(prev => {
      if (checked) {
        return [...prev, modelId]
      } else {
        const next = prev.filter(id => id !== modelId)
        if (modelId === coachDefaultModelId) {
          setCoachDefaultModelId(null)
        }
        return next
      }
    })
  }

  function handleToggleAthleteModel(modelId: string, checked: boolean) {
    setAthleteAllowedIds(prev => {
      if (checked) {
        return [...prev, modelId]
      } else {
        const next = prev.filter(id => id !== modelId)
        if (modelId === athleteDefaultModelId) {
          setAthleteDefaultModelId(null)
        }
        return next
      }
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const response = await fetch('/api/coach/admin/ai-keys/models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowedModelIds: coachAllowedIds,
          allowedAthleteModelIds: athleteAllowedIds,
          defaultModelId: coachDefaultModelId,
          athleteDefaultModelId: athleteDefaultModelId,
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Inställningar sparade',
          description: 'Modellåtkomsten har uppdaterats.',
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

  const athleteEligibleModels = eligibleModels.filter(m => m.availableForAthletes)

  const coachDefaultCandidates = coachAllowedIds.length > 0
    ? eligibleModels.filter(m => coachAllowedIds.includes(m.id))
    : eligibleModels

  const athleteDefaultCandidates = athleteAllowedIds.length > 0
    ? athleteEligibleModels.filter(m => athleteAllowedIds.includes(m.id))
    : athleteEligibleModels

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (eligibleModels.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Coach model access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Modellåtkomst för coacher
          </CardTitle>
          <CardDescription>
            Välj vilka AI-modeller coacher i din verksamhet kan använda.
            Lämna alla omarkerade för att tillåta alla tillgängliga modeller.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {eligibleModels.map((model) => (
              <label
                key={model.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={coachAllowedIds.includes(model.id)}
                  onCheckedChange={(checked) => handleToggleCoachModel(model.id, checked === true)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{model.displayName}</span>
                    <Badge className={`text-xs ${providerColors[model.provider]}`}>
                      {providerNames[model.provider]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getCostTier(model)} kostnad
                    </Badge>
                  </div>
                </div>
              </label>
            ))}
          </div>

          {coachAllowedIds.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Inga modeller markerade = alla tillgängliga modeller tillåtna.
            </p>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Standardmodell för coacher</label>
            <Select
              value={coachDefaultModelId ?? 'auto'}
              onValueChange={(v) => setCoachDefaultModelId(v === 'auto' ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Automatisk (systemstandard)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatisk (systemstandard)</SelectItem>
                {coachDefaultCandidates.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.displayName} ({providerNames[model.provider]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Athlete model access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Modellåtkomst för atleter
          </CardTitle>
          <CardDescription>
            Välj vilka AI-modeller atleter i din verksamhet kan använda.
            Lämna alla omarkerade för att tillåta alla tillgängliga modeller.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {athleteEligibleModels.map((model) => (
              <label
                key={model.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={athleteAllowedIds.includes(model.id)}
                  onCheckedChange={(checked) => handleToggleAthleteModel(model.id, checked === true)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{model.displayName}</span>
                    <Badge className={`text-xs ${providerColors[model.provider]}`}>
                      {providerNames[model.provider]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getCostTier(model)} kostnad
                    </Badge>
                  </div>
                </div>
              </label>
            ))}
          </div>

          {athleteEligibleModels.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Inga modeller är tillgängliga för atleter. Kontrollera att modeller är markerade som tillgängliga för atleter i systemet.
            </p>
          )}

          {athleteEligibleModels.length > 0 && athleteAllowedIds.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Inga modeller markerade = alla tillgängliga modeller tillåtna.
            </p>
          )}

          {athleteEligibleModels.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Standardmodell för atleter</label>
              <Select
                value={athleteDefaultModelId ?? 'auto'}
                onValueChange={(v) => setAthleteDefaultModelId(v === 'auto' ? null : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Automatisk (systemstandard)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automatisk (systemstandard)</SelectItem>
                  {athleteDefaultCandidates.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.displayName} ({providerNames[model.provider]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save button */}
      <Button onClick={handleSave} disabled={saving}>
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Spara modellåtkomst
      </Button>
    </div>
  )
}
