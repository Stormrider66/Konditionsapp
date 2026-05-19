'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Check, Copy, Loader2, MessageSquare, Send, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'

type CoachMessageAction = {
  type: 'sendCoachMessage'
  title: string
  description: string
  recipientType: 'ATHLETE' | 'TEAM'
  targetLabel: string
  recipientCount: number
  recipients: Array<{ clientId: string; name: string; teamName: string | null }>
  content: string
  subject: string | null
  requiresConfirmation: true
  confirmLabel: string
  confirmEndpoint: string
  reviewHref: string
  draft: unknown
}

export interface ChatActionResult {
  success: boolean
  action?: CoachMessageAction
  message?: string
  error?: string
  needsClarification?: boolean
  candidates?: Array<{ id: string; name: string; team?: string | null; sportType?: string | null }>
}

interface ChatActionCardProps {
  result: ChatActionResult
  businessSlug?: string | null
  basePath?: string
}

function resolveHref(href: string, basePath = '') {
  if (!basePath || !href.startsWith('/coach')) return href
  return `${basePath}${href}`
}

export function ChatActionCard({ result, businessSlug, basePath = '' }: ChatActionCardProps) {
  const { toast } = useToast()
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [sentCount, setSentCount] = useState<number | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const t = useTranslations('components.chatActionCard')

  if (!result.action || result.action.type !== 'sendCoachMessage') return null
  const action = result.action

  const isSent = status === 'sent'
  const previewRecipients = action.recipients.slice(0, 4)
  const extraRecipientCount = Math.max(0, action.recipientCount - previewRecipients.length)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(action.content)
      toast({
        title: t('toastCopiedTitle'),
        description: t('toastCopiedDescription'),
      })
    } catch {
      toast({
        title: t('toastCopyFailedTitle'),
        description: t('toastCopyFailedDescription'),
        variant: 'destructive',
      })
    }
  }

  async function handleConfirm() {
    if (status === 'sending' || isSent) return
    setStatus('sending')
    try {
      const response = await fetch(action.confirmEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: action.type,
          businessSlug: businessSlug || undefined,
          draft: action.draft,
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.error || t('errorSendCouldNotSend'))
      }

      setSentCount(data.sent ?? action.recipientCount)
      setStatus('sent')
      const count = data.sent ?? action.recipientCount
      setStatusMessage(
        data.message ||
          t('statusSentMessage', {
            count,
          }),
      )
      toast({
        title: t('toastSentTitle'),
        description:
          data.message ||
          t('toastSentDescription', {
            count,
          }),
      })
    } catch (error) {
      setStatus('error')
      setStatusMessage(
        t('statusSendErrorMessage', {
          error: error instanceof Error ? error.message : t('errorTryAgain'),
        }),
      )
      toast({
        title: t('toastSendFailedTitle'),
        description: error instanceof Error ? error.message : t('errorTryAgain'),
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="ml-11 mt-2 max-w-[88%] rounded-lg border bg-background shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 border-b bg-primary/5 px-3 py-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {action.recipientType === 'TEAM' ? (
            <Users className="h-4 w-4" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold">{action.title}</h4>
            {isSent && (
              <Badge variant="secondary" className="h-5 shrink-0 gap-1 px-1.5 text-[10px]">
                <Check className="h-3 w-3" />
                {t('statusSentBadge')}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('labels.recipients')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {previewRecipients.map((recipient) => (
              <Badge key={recipient.clientId} variant="outline" className="max-w-full truncate text-[11px]">
                {recipient.name}
              </Badge>
            ))}
            {extraRecipientCount > 0 && (
              <Badge variant="outline" className="text-[11px]">
                +{extraRecipientCount}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {action.targetLabel} · {t('recipientCount', { count: action.recipientCount })}
          </p>
        </div>

        {action.subject && (
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('labels.subject')}
            </p>
            <p className="text-sm">{action.subject}</p>
          </div>
        )}

        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('labels.message')}
          </p>
          <div className="max-h-44 overflow-auto rounded-md bg-muted/60 p-3 text-sm leading-relaxed whitespace-pre-wrap">
            {action.content}
          </div>
        </div>

        {!isSent && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{t('sendConfirmationMessage')}</span>
          </div>
        )}

        {status === 'error' && (
          <p className="text-xs text-destructive">
            {t('statusSendingError')}
          </p>
        )}

        {statusMessage && (
          <div
            className={cn(
              'rounded-md px-3 py-2 text-xs',
              isSent
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'bg-destructive/10 text-destructive'
            )}
          >
            {statusMessage}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={status === 'sending' || isSent}
            className={cn('h-9', isSent && 'bg-emerald-600 hover:bg-emerald-600')}
          >
            {status === 'sending' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isSent ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {isSent
              ? sentCount
                ? t('sentButtonLabelWithCount', { count: sentCount })
                : t('sentButtonLabel')
              : action.confirmLabel}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="h-9">
            <Copy className="mr-2 h-4 w-4" />
            {t('buttons.copy')}
          </Button>
          <Button asChild type="button" variant="ghost" size="sm" className="h-9">
            <Link href={resolveHref(action.reviewHref, basePath)}>{t('buttons.messages')}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
