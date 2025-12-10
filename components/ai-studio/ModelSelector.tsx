'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Bot, Zap, Brain, Sparkles, AlertCircle } from 'lucide-react'
import type { AIProvider } from '@prisma/client'

interface AIModel {
  id: string
  provider: AIProvider
  modelId: string
  displayName: string
  description: string | null
  capabilities: string[]
  isDefault: boolean
}

interface ModelSelectorProps {
  models: AIModel[]
  selectedModel: AIModel | null
  onModelChange: (model: AIModel | null) => void
  apiKeyStatus: {
    anthropic: boolean
    google: boolean
    openai: boolean
  }
}

export function ModelSelector({
  models,
  selectedModel,
  onModelChange,
  apiKeyStatus,
}: ModelSelectorProps) {
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

  const availableModels = models.filter((m) => isProviderAvailable(m.provider))
  const unavailableModels = models.filter((m) => !isProviderAvailable(m.provider))

  return (
    <Select
      value={selectedModel?.id || ''}
      onValueChange={(value) => {
        const model = models.find((m) => m.id === value)
        onModelChange(model || null)
      }}
    >
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Välj AI-modell">
          {selectedModel && (
            <div className="flex items-center gap-2">
              {getProviderIcon(selectedModel.provider)}
              <span className="truncate">{selectedModel.displayName}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {availableModels.length > 0 && (
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Tillgängliga modeller
          </div>
        )}
        {availableModels.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            <div className="flex items-center gap-2">
              {getProviderIcon(model.provider)}
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span>{model.displayName}</span>
                  {model.isDefault && (
                    <Badge variant="secondary" className="text-xs py-0">
                      Standard
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {getProviderLabel(model.provider)}
                  {model.capabilities.length > 0 && (
                    <> • {model.capabilities.slice(0, 2).join(', ')}</>
                  )}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}

        {unavailableModels.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2 border-t pt-2">
              Ej konfigurerade (saknar API-nyckel)
            </div>
            {unavailableModels.map((model) => (
              <SelectItem key={model.id} value={model.id} disabled>
                <div className="flex items-center gap-2 opacity-50">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <div className="flex flex-col">
                    <span>{model.displayName}</span>
                    <span className="text-xs text-muted-foreground">
                      {getProviderLabel(model.provider)} - API-nyckel saknas
                    </span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </>
        )}

        {models.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Inga AI-modeller konfigurerade
          </div>
        )}
      </SelectContent>
    </Select>
  )
}
