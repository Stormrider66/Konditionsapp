'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Bot, Brain, Sparkles, Zap, Check, ChevronDown, AlertCircle, FileText, Loader2 } from 'lucide-react'
import type { AIProvider } from '@prisma/client'
import { formatTokenCount, estimateWeeksFromTokens } from '@/types/ai-models'

interface AIModel {
  id: string
  provider: AIProvider
  modelId: string
  displayName?: string
  name?: string
  description: string | null
  capabilities: {
    reasoning?: string
    speed?: string
    contextWindow?: number
    maxOutputTokens?: number
  } | string[]
  pricing?: {
    input: number
    output: number
  }
  isDefault?: boolean
  recommended?: boolean
  bestForLongOutput?: boolean
}

interface ApiKeyStatus {
  anthropic: boolean
  google: boolean
  openai: boolean
}

interface ModelSelectorProps {
  currentModel: AIModel | null
  apiKeyStatus: ApiKeyStatus
  onModelChange: (model: AIModel) => void
}

export function ModelSelector({ currentModel, apiKeyStatus, onModelChange }: ModelSelectorProps) {
  const [models, setModels] = useState<AIModel[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetchModels()
  }, [])

  async function fetchModels() {
    try {
      const response = await fetch('/api/ai/models')
      const data = await response.json()
      if (data.success) {
        setModels(data.models)
      }
    } catch (err) {
      console.error('Failed to fetch models:', err)
    } finally {
      setLoading(false)
    }
  }

  const getProviderIcon = (provider: AIProvider) => {
    switch (provider) {
      case 'ANTHROPIC':
        return <Brain className="h-4 w-4" />
      case 'GOOGLE':
        return <Sparkles className="h-4 w-4" />
      case 'OPENAI':
        return <Zap className="h-4 w-4" />
      default:
        return <Bot className="h-4 w-4" />
    }
  }

  const getProviderLabel = (provider: AIProvider) => {
    switch (provider) {
      case 'ANTHROPIC':
        return 'Anthropic'
      case 'GOOGLE':
        return 'Google'
      case 'OPENAI':
        return 'OpenAI'
      default:
        return provider
    }
  }

  const isProviderAvailable = (provider: AIProvider) => {
    switch (provider) {
      case 'ANTHROPIC':
        return apiKeyStatus.anthropic
      case 'GOOGLE':
        return apiKeyStatus.google
      case 'OPENAI':
        return apiKeyStatus.openai
      default:
        return false
    }
  }

  const getMaxOutputTokens = (model: AIModel) => {
    if (!model.capabilities) return null
    if (Array.isArray(model.capabilities)) return null
    return model.capabilities.maxOutputTokens
  }

  const availableModels = models.filter((m) => isProviderAvailable(m.provider))
  const unavailableModels = models.filter((m) => !isProviderAvailable(m.provider))

  const displayName = currentModel
    ? currentModel.displayName || currentModel.name || currentModel.modelId
    : 'Välj modell'

  const maxOutputTokens = currentModel ? getMaxOutputTokens(currentModel) : null

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled className="h-9">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Laddar...
      </Button>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                {currentModel ? (
                  <>
                    {getProviderIcon(currentModel.provider)}
                    <span className="font-medium max-w-[120px] truncate">{displayName}</span>
                    {maxOutputTokens && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 hidden md:inline-flex gap-1">
                        <FileText className="h-2.5 w-2.5" />
                        {formatTokenCount(maxOutputTokens)}
                      </Badge>
                    )}
                  </>
                ) : (
                  <>
                    <Bot className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Välj modell</span>
                  </>
                )}
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[300px]">
            {currentModel ? (
              <div className="space-y-1.5">
                <p className="font-medium">{displayName}</p>
                {maxOutputTokens && (
                  <p className="text-xs text-muted-foreground">
                    Max output: {formatTokenCount(maxOutputTokens)} tokens
                    <span className="text-muted-foreground/70">
                      {' '}(~{estimateWeeksFromTokens(maxOutputTokens)} veckors program)
                    </span>
                  </p>
                )}
                {currentModel.pricing && (
                  <p className="text-xs text-muted-foreground">
                    Pris: ${currentModel.pricing.input}/1M in, ${currentModel.pricing.output}/1M ut
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Klicka för att byta modell
                </p>
              </div>
            ) : (
              <p className="text-xs">Välj en AI-modell för chatten</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent align="end" className="w-[350px]">
        {availableModels.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Tillgängliga modeller
            </DropdownMenuLabel>
            {availableModels.map((model) => {
              const modelMaxTokens = getMaxOutputTokens(model)
              const isSelected = currentModel?.id === model.id
              return (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => {
                    onModelChange(model)
                    setOpen(false)
                  }}
                  className="py-3 cursor-pointer"
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="flex-shrink-0 mt-0.5">
                      {getProviderIcon(model.provider)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{model.displayName || model.name}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                        {model.recommended && (
                          <Badge variant="secondary" className="text-[10px] py-0">
                            Rekommenderad
                          </Badge>
                        )}
                        {model.bestForLongOutput && (
                          <Badge variant="outline" className="text-[10px] py-0 border-green-500 text-green-600">
                            Långa program
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {modelMaxTokens ? formatTokenCount(modelMaxTokens) : 'N/A'}
                        </span>
                        <span>{getProviderLabel(model.provider)}</span>
                      </div>
                      {model.description && (
                        <span className="text-xs text-muted-foreground/80 line-clamp-1 mt-0.5">
                          {model.description}
                        </span>
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
              )
            })}
          </>
        )}

        {unavailableModels.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Ej tillgängliga (saknar API-nyckel)
            </DropdownMenuLabel>
            {unavailableModels.map((model) => (
              <DropdownMenuItem
                key={model.id}
                disabled
                className="py-3 opacity-50"
              >
                <div className="flex items-start gap-3 w-full">
                  <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{model.displayName || model.name}</span>
                    <div className="text-xs text-muted-foreground mt-1">
                      {getProviderLabel(model.provider)} - API-nyckel saknas
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {models.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Inga AI-modeller tillgängliga
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
