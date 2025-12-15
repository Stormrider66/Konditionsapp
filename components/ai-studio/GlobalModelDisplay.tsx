'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bot, Brain, Sparkles, Zap, Settings } from 'lucide-react'
import Link from 'next/link'
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

interface GlobalModelDisplayProps {
  model: AIModel | null
}

export function GlobalModelDisplay({ model }: GlobalModelDisplayProps) {
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

  if (!model) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href="/coach/settings/ai" className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Välj modell</span>
          <Settings className="h-3 w-3 ml-1" />
        </Link>
      </Button>
    )
  }

  return (
    <Button variant="outline" size="sm" asChild className="h-9">
      <Link href="/coach/settings/ai" className="flex items-center gap-2">
        {getProviderIcon(model.provider)}
        <span className="font-medium">{model.displayName}</span>
        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 hidden sm:inline-flex">
          {getProviderLabel(model.provider)}
        </Badge>
        <Settings className="h-3 w-3 ml-1 text-muted-foreground" />
      </Link>
    </Button>
  )
}
