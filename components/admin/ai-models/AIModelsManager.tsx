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

export function AIModelsManager() {
  const { toast } = useToast()
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
    fetchModels()
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
          title: 'Modell uppdaterad',
          description: `${data.data.displayName} ${availableForAthletes ? 'tillgänglig' : 'inte tillgänglig'} för atleter`,
        })
      }
    } catch (error) {
      console.error('Failed to update model:', error)
      toast({
        title: 'Kunde inte uppdatera',
        description: 'Försök igen senare.',
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
                Hantera vilka AI-modeller som är tillgängliga för atleter.
                Togglarna styr den globala tillgängligheten — coacher kan ytterligare begränsa.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchModels}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Uppdatera
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
                  ({providerModels.length} modeller)
                </span>
              </h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Modell</TableHead>
                      <TableHead>Model ID</TableHead>
                      <TableHead className="text-center">Aktiv</TableHead>
                      <TableHead className="text-center">Standard</TableHead>
                      <TableHead className="text-center">Atlet-tillgång</TableHead>
                      <TableHead className="text-right">Pris (per 1K tokens)</TableHead>
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
                            {model.isActive ? 'Ja' : 'Nej'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {model.isDefault && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">Standard</Badge>
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
              Inga AI-modeller hittades i databasen.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
