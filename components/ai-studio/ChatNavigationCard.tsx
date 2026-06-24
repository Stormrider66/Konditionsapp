'use client'

import Link from 'next/link'
import { ArrowRight, Map, User, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'

export interface ChatNavigationResult {
  success?: boolean
  navigation?: {
    href: string
    label: string
    description: string
    destination: string
    entityType?: 'page' | 'athlete' | 'team'
    entityId?: string | null
    entityName?: string | null
    autoNavigate?: boolean
  }
}

interface ChatNavigationCardProps {
  result: ChatNavigationResult
  basePath?: string
}

function resolveHref(href: string, basePath?: string) {
  if (!basePath || href.startsWith(basePath) || href.startsWith('http')) return href
  if (href.startsWith('/coach')) return `${basePath}${href}`
  return href
}

export function ChatNavigationCard({ result, basePath }: ChatNavigationCardProps) {
  const tChatNavigation = useTranslations('components.chatNavigation')

  if (!result.success || !result.navigation) return null

  const { navigation } = result
  const href = resolveHref(navigation.href, basePath)
  const Icon = navigation.entityType === 'athlete'
    ? User
    : navigation.entityType === 'team'
      ? Users
      : Map

  return (
    <div className="ml-11 mt-2 max-w-[80%] rounded-lg border bg-background p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-md bg-blue-500/10 p-2 text-blue-600 dark:text-blue-300">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {navigation.label}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {navigation.description}
          </p>
          {navigation.entityName && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {navigation.entityName}
            </p>
          )}
          <Button
            asChild
            size="sm"
            className={cn('mt-3 h-8 bg-blue-600 text-xs text-white hover:bg-blue-700')}
          >
            <Link href={href}>
              {tChatNavigation('open')}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
