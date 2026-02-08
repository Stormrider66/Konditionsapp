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

interface EligibleModel {
  id: string
  modelId: string
  provider: 'ANTHROPIC' | 'GOOGLE' | 'OPENAI'
  displayName: string
  isDefault: boolean
  inputCostPer1k: number | null
  outputCostPer1k: number | null
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

export function AthleteModelSettings() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [eligibleModels, setEligibleModels] = useState<EligibleModel[]>([])
  const [allowedIds, setAllowedIds] = useState<string[]>([])
  const [defaultModelId, setDefaultModelId] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/athlete-models')
      const data = await response.json()
      if (data.success) {
        setEligibleModels(data.data.eligibleModels)
        setAllowedIds(data.data.allowedAthleteModelIds)
        setDefaultModelId(data.data.athleteDefaultModelId)
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

  function handleToggleModel(modelId: string, checked: boolean) {
    setAllowedIds(prev => {
      if (checked) {
        return [...prev, modelId]
      } else {
        const next = prev.filter(id => id !== modelId)
        // If we remove the default from allowed, clear it
        if (modelId === defaultModelId) {
          setDefaultModelId(null)
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
          allowedModelIds: allowedIds,
          defaultModelId,
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Inställningar sparade',
          description: 'Atleternas modellåtkomst har uppdaterats.',
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

  // Models available for the default dropdown (allowed ones, or all if unrestricted)
  const defaultCandidates = allowedIds.length > 0
    ? eligibleModels.filter(m => allowedIds.includes(m.id))
    : eligibleModels

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
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Atleternas AI-modeller
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Inga AI-modeller är tillgängliga. Se till att du har giltiga API-nycklar konfigurerade
            och att administratören har aktiverat modeller för atleter.
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
          Atleternas AI-modeller
        </CardTitle>
        <CardDescription>
          Välj vilka AI-modeller dina atleter kan använda. Lämna alla omarkerade för att tillåta alla tillgängliga modeller.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Model checklist */}
        <div className="space-y-3">
          {eligibleModels.map((model) => (
            <label
              key={model.id}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <Checkbox
                checked={allowedIds.includes(model.id)}
                onCheckedChange={(checked) => handleToggleModel(model.id, checked === true)}
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

        {allowedIds.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Inga modeller markerade = alla tillgängliga modeller tillåtna.
          </p>
        )}

        {/* Default model dropdown */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Standardmodell för atleter</label>
          <Select
            value={defaultModelId ?? 'auto'}
            onValueChange={(v) => setDefaultModelId(v === 'auto' ? null : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Automatisk (systemstandard)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automatisk (systemstandard)</SelectItem>
              {defaultCandidates.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.displayName} ({providerNames[model.provider]})
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
