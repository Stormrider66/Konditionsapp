'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RefreshCw, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/i18n/client'

interface AIModel {
  id: string
  provider: 'ANTHROPIC' | 'GOOGLE' | 'OPENAI'
  modelId: string
  displayName: string
  description: string | null
  isActive: boolean
  isDefault: boolean
  availableForAthletes: boolean
  inputCostPer1k: number | null
  outputCostPer1k: number | null
}

const providerColors: Record<string, string> = {
  ANTHROPIC: 'bg-orange-100 text-orange-800',
  GOOGLE: 'bg-blue-100 text-blue-800',
  OPENAI: 'bg-green-100 text-green-800',
}

const providerNames: Record<string, string> = {
  ANTHROPIC: 'Anthropic',
  GOOGLE: 'Google',
  OPENAI: 'OpenAI',
}

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  toasts: {
    updated: string
    accessDescription: (modelName: string, available: boolean) => string
    updateFailed: string
    retry: string
  }
  description: string
  refresh: string
  modelCount: (count: number) => string
  headers: {
    model: string
    modelId: string
    active: string
    default: string
    athleteAccess: string
    price: string
  }
  badges: {
    yes: string
    no: string
    default: string
  }
  empty: string
}> = {
  en: {
    toasts: {
      updated: 'Model updated',
      accessDescription: (modelName, available) => `${modelName} is ${available ? 'available' : 'not available'} for athletes`,
      updateFailed: 'Could not update',
      retry: 'Please try again later.',
    },
    description: 'Manage which AI models are available to athletes. These toggles control global availability; coaches can restrict further.',
    refresh: 'Refresh',
    modelCount: (count) => `${count} ${count === 1 ? 'model' : 'models'}`,
    headers: {
      model: 'Model',
      modelId: 'Model ID',
      active: 'Active',
      default: 'Default',
      athleteAccess: 'Athlete access',
      price: 'Price (per 1K tokens)',
    },
    badges: {
      yes: 'Yes',
      no: 'No',
      default: 'Default',
    },
    empty: 'No AI models were found in the database.',
  },
  sv: {
    toasts: {
      updated: 'Modell uppdaterad',
      accessDescription: (modelName, available) => `${modelName} ${available ? 'tillgänglig' : 'inte tillgänglig'} för atleter`,
      updateFailed: 'Kunde inte uppdatera',
      retry: 'Försök igen senare.',
    },
    description: 'Hantera vilka AI-modeller som är tillgängliga för atleter. Togglarna styr den globala tillgängligheten — coacher kan ytterligare begränsa.',
    refresh: 'Uppdatera',
    modelCount: (count) => `${count} ${count === 1 ? 'modell' : 'modeller'}`,
    headers: {
      model: 'Modell',
      modelId: 'Model ID',
      active: 'Aktiv',
      default: 'Standard',
      athleteAccess: 'Atlet-tillgång',
      price: 'Pris (per 1K tokens)',
    },
    badges: {
      yes: 'Ja',
      no: 'Nej',
      default: 'Standard',
    },
    empty: 'Inga AI-modeller hittades i databasen.',
  },
}

export function AIModelsManager() {
  const { toast } = useToast()
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const [models, setModels] = useState<AIModel[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchModels = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/ai-models')
      const data = await response.json()
      if (data.success) {
        setModels(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch AI models:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(fetchModels)
  }, [fetchModels])

  async function handleToggleAthleteAccess(modelId: string, availableForAthletes: boolean) {
    setUpdating(modelId)
    try {
      const response = await fetch('/api/admin/ai-models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, availableForAthletes }),
      })
      const data = await response.json()
      if (data.success) {
        setModels(prev =>
          prev.map(m => m.id === modelId ? { ...m, availableForAthletes } : m)
        )
        toast({
          title: copy.toasts.updated,
          description: copy.toasts.accessDescription(data.data.displayName, availableForAthletes),
        })
      }
    } catch (error) {
      console.error('Failed to update model:', error)
      toast({
        title: copy.toasts.updateFailed,
        description: copy.toasts.retry,
        variant: 'destructive',
      })
    } finally {
      setUpdating(null)
    }
  }

  // Group models by provider
  const grouped = models.reduce<Record<string, AIModel[]>>((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = []
    acc[model.provider].push(model)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Models
              </CardTitle>
              <CardDescription>
                {copy.description}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void fetchModels()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              {copy.refresh}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {Object.entries(grouped).map(([provider, providerModels]) => (
            <div key={provider} className="mb-6 last:mb-0">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Badge className={providerColors[provider]}>
                  {providerNames[provider]}
                </Badge>
                <span className="text-muted-foreground">
                  ({copy.modelCount(providerModels.length)})
                </span>
              </h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{copy.headers.model}</TableHead>
                      <TableHead>{copy.headers.modelId}</TableHead>
                      <TableHead className="text-center">{copy.headers.active}</TableHead>
                      <TableHead className="text-center">{copy.headers.default}</TableHead>
                      <TableHead className="text-center">{copy.headers.athleteAccess}</TableHead>
                      <TableHead className="text-right">{copy.headers.price}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providerModels.map((model) => (
                      <TableRow key={model.id} className={!model.isActive ? 'opacity-50' : ''}>
                        <TableCell className="font-medium">{model.displayName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {model.modelId}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={model.isActive ? 'default' : 'secondary'} className="text-xs">
                            {model.isActive ? copy.badges.yes : copy.badges.no}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {model.isDefault && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">{copy.badges.default}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={model.availableForAthletes}
                            onCheckedChange={(checked) =>
                              handleToggleAthleteAccess(model.id, checked)
                            }
                            disabled={updating === model.id || !model.isActive}
                          />
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {model.inputCostPer1k != null
                            ? `$${model.inputCostPer1k} / $${model.outputCostPer1k}`
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}

          {models.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {copy.empty}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
