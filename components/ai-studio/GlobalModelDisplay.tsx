'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Bot, Brain, Sparkles, Zap, Settings, FileText } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/i18n/client'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'
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

interface GlobalModelDisplayProps {
  model: AIModel | null
}

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  chooseModel: string
  weeksProgram: (weeks: number) => string
  price: string
  input: string
  output: string
  goodForLongPrograms: string
  changeModel: string
}> = {
  en: {
    chooseModel: 'Choose model',
    weeksProgram: (weeks) => `${weeks}-week program`,
    price: 'Price',
    input: 'in',
    output: 'out',
    goodForLongPrograms: 'Good for long programs',
    changeModel: 'Click to change model',
  },
  sv: {
    chooseModel: 'Välj modell',
    weeksProgram: (weeks) => `${weeks} veckors program`,
    price: 'Pris',
    input: 'in',
    output: 'ut',
    goodForLongPrograms: 'Bra för långa program',
    changeModel: 'Klicka för att ändra modell',
  },
}

export function GlobalModelDisplay({ model }: GlobalModelDisplayProps) {
  const pathname = usePathname()
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const pathBusinessSlug = getBusinessSlugFromPathname(pathname)
  const basePath = pathBusinessSlug ? `/${pathBusinessSlug}` : ''

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
        <Link href={`${basePath}/coach/settings/ai`} className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{copy.chooseModel}</span>
          <Settings className="h-3 w-3 ml-1" />
        </Link>
      </Button>
    )
  }

  // Get max output tokens (handle both old array format and new object format)
  const getMaxOutputTokens = () => {
    if (!model.capabilities) return null
    if (Array.isArray(model.capabilities)) return null
    return model.capabilities.maxOutputTokens
  }

  const maxOutputTokens = getMaxOutputTokens()
  const displayName = model.displayName || model.name || model.modelId

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" asChild className="h-9">
            <Link href={`${basePath}/coach/settings/ai`} className="flex items-center gap-2">
              {getProviderIcon(model.provider)}
              <span className="font-medium">{displayName}</span>
              {maxOutputTokens && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 hidden md:inline-flex gap-1">
                  <FileText className="h-2.5 w-2.5" />
                  {formatTokenCount(maxOutputTokens)}
                </Badge>
              )}
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 hidden sm:inline-flex">
                {getProviderLabel(model.provider)}
              </Badge>
              <Settings className="h-3 w-3 ml-1 text-muted-foreground" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[300px]">
          <div className="space-y-1.5">
            <p className="font-medium">{displayName}</p>
            {maxOutputTokens && (
              <p className="text-xs text-muted-foreground">
                Max output: {formatTokenCount(maxOutputTokens)} tokens
                <span className="text-muted-foreground/70">
                  {' '}(~{copy.weeksProgram(estimateWeeksFromTokens(maxOutputTokens))})
                </span>
              </p>
            )}
            {model.pricing && (
              <p className="text-xs text-muted-foreground">
                {copy.price}: ${model.pricing.input}/1M {copy.input}, ${model.pricing.output}/1M {copy.output}
              </p>
            )}
            {model.bestForLongOutput && (
              <Badge variant="outline" className="text-xs border-green-500 text-green-600 mt-1">
                {copy.goodForLongPrograms}
              </Badge>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {copy.changeModel}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
