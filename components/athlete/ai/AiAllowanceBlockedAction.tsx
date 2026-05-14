'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { cn } from '@/lib/utils'

export interface AiAllowanceAction {
  label: string
  url: string
}

interface AiAllowanceBlockedActionProps {
  action: AiAllowanceAction | null | undefined
  message?: string
  size?: 'sm' | 'default'
  tone?: 'amber' | 'red'
  variant?: 'button' | 'banner'
  className?: string
}

const fallbackLabel = 'Hantera AI-krediter'

export function AiAllowanceBlockedAction({
  action,
  message = 'AI-krediterna är slut för perioden.',
  size = 'sm',
  tone = 'amber',
  variant = 'button',
  className,
}: AiAllowanceBlockedActionProps) {
  const router = useRouter()
  const basePath = useBasePath()

  if (!action) return null

  const href = `${basePath}${action.url}`
  const buttonClassName = cn(
    tone === 'red'
      ? 'border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-100 dark:hover:bg-red-500/20'
      : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/20',
    variant === 'button' && className,
  )

  const button = (
    <Button
      type="button"
      size={size}
      variant="outline"
      className={buttonClassName}
      onClick={() => router.push(href)}
    >
      {action.label || fallbackLabel}
    </Button>
  )

  if (variant === 'button') return button

  return (
    <div
      className={cn(
        'rounded-lg border p-3 text-sm',
        tone === 'red'
          ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-100'
          : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100',
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex min-w-0 items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </span>
        {button}
      </div>
    </div>
  )
}
