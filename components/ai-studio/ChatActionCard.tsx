'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Check, Copy, Loader2, MessageSquare, Send, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useLocale, useTranslations } from '@/i18n/client'

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

type AiCapabilityAction = {
  type: 'aiCapabilityAction'
  id: string
  capabilityId: string
  title: string
  description: string
  targetLabel?: string
  subject?: string | null
  body?: string | null
  details: string[]
  recipients?: Array<{ clientId: string; name: string; teamName: string | null }>
  recipientCount?: number
  requiresConfirmation: true
  confirmLabel: string
  cancelLabel: string
  confirmEndpoint: string
  cancelEndpoint: string
  reviewHref?: string
}

export interface ChatActionResult {
  success: boolean
  action?: CoachMessageAction | AiCapabilityAction
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
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'cancelled' | 'error'>('idle')
  const [sentCount, setSentCount] = useState<number | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const t = useTranslations('components.chatActionCard')
  const locale = useLocale() === 'sv' ? 'sv' : 'en'

  if (!result.action) return null
  const action = result.action

  const isSent = status === 'sent'

  if (action.type === 'aiCapabilityAction') {
    const genericAction = action
    const previewRecipients = genericAction.recipients?.slice(0, 4) || []
    const extraRecipientCount = Math.max(0, (genericAction.recipientCount || 0) - previewRecipients.length)
    const copyText = [
      genericAction.subject,
      genericAction.body,
      ...(genericAction.details || []),
    ].filter(Boolean).join('\n')

    async function handleGenericCopy() {
      try {
        await navigator.clipboard.writeText(copyText || genericAction.title)
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

    async function handleGenericConfirm() {
      if (status === 'sending' || isSent || status === 'cancelled') return
      setStatus('sending')
      try {
        const response = await fetch(genericAction.confirmEndpoint, { method: 'POST' })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.success) {
          throw new Error(data.error || (locale === 'sv' ? 'Åtgärden kunde inte köras.' : 'The action could not be executed.'))
        }

        setStatus('sent')
        setStatusMessage(data.message || (locale === 'sv' ? 'Åtgärden har körts.' : 'Action executed.'))
        toast({
          title: locale === 'sv' ? 'Åtgärd utförd' : 'Action executed',
          description: data.message || genericAction.title,
        })
      } catch (error) {
        setStatus('error')
        const message = error instanceof Error ? error.message : (locale === 'sv' ? 'Försök igen.' : 'Try again.')
        setStatusMessage(message)
        toast({
          title: locale === 'sv' ? 'Åtgärden misslyckades' : 'Action failed',
          description: message,
          variant: 'destructive',
        })
      }
    }

    async function handleGenericCancel() {
      if (status === 'sending' || isSent || status === 'cancelled') return
      setStatus('sending')
      try {
        const response = await fetch(genericAction.cancelEndpoint, { method: 'POST' })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.success) {
          throw new Error(data.error || (locale === 'sv' ? 'Åtgärden kunde inte avbrytas.' : 'The action could not be cancelled.'))
        }

        setStatus('cancelled')
        setStatusMessage(data.message || (locale === 'sv' ? 'Åtgärden avbröts.' : 'Action cancelled.'))
      } catch (error) {
        setStatus('error')
        setStatusMessage(error instanceof Error ? error.message : (locale === 'sv' ? 'Försök igen.' : 'Try again.'))
      }
    }

    return (
      <div className="ml-11 mt-2 max-w-[88%] rounded-lg border bg-background shadow-sm overflow-hidden">
        <div className="flex items-start gap-3 border-b bg-primary/5 px-3 py-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="truncate text-sm font-semibold">{genericAction.title}</h4>
              {isSent && (
                <Badge variant="secondary" className="h-5 shrink-0 gap-1 px-1.5 text-[10px]">
                  <Check className="h-3 w-3" />
                  {t('statusSentBadge')}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{genericAction.description}</p>
          </div>
        </div>

        <div className="space-y-3 p-3">
          {genericAction.targetLabel && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {locale === 'sv' ? 'Mål' : 'Target'}
              </p>
              <p className="text-sm">{genericAction.targetLabel}</p>
            </div>
          )}

          {previewRecipients.length > 0 && (
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
            </div>
          )}

          {genericAction.subject && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('labels.subject')}
              </p>
              <p className="text-sm">{genericAction.subject}</p>
            </div>
          )}

          {genericAction.body && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {locale === 'sv' ? 'Innehåll' : 'Content'}
              </p>
              <div className="max-h-44 overflow-auto rounded-md bg-muted/60 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                {genericAction.body}
              </div>
            </div>
          )}

          {genericAction.details.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {locale === 'sv' ? 'Detaljer' : 'Details'}
              </p>
              <ul className="space-y-1 rounded-md bg-muted/60 p-3 text-xs">
                {genericAction.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </div>
          )}

          {!isSent && status !== 'cancelled' && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {locale === 'sv'
                  ? 'Åtgärden körs först när du bekräftar. Inga ändringar görs innan dess.'
                  : 'This action only runs after you confirm. No changes are made before then.'}
              </span>
            </div>
          )}

          {statusMessage && (
            <div
              className={cn(
                'rounded-md px-3 py-2 text-xs',
                isSent
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : status === 'cancelled'
                    ? 'bg-muted text-muted-foreground'
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
              onClick={handleGenericConfirm}
              disabled={status === 'sending' || isSent || status === 'cancelled'}
              className={cn('h-9', isSent && 'bg-emerald-600 hover:bg-emerald-600')}
            >
              {status === 'sending' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isSent ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {isSent ? t('sentButtonLabel') : genericAction.confirmLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenericCancel}
              disabled={status === 'sending' || isSent || status === 'cancelled'}
              className="h-9"
            >
              {status === 'cancelled' ? (locale === 'sv' ? 'Avbruten' : 'Cancelled') : genericAction.cancelLabel}
            </Button>
            {copyText && (
              <Button type="button" variant="outline" size="sm" onClick={handleGenericCopy} className="h-9">
                <Copy className="mr-2 h-4 w-4" />
                {t('buttons.copy')}
              </Button>
            )}
            {genericAction.reviewHref && (
              <Button asChild type="button" variant="ghost" size="sm" className="h-9">
                <Link href={resolveHref(genericAction.reviewHref, basePath)}>{locale === 'sv' ? 'Öppna' : 'Open'}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const coachAction = action
  const previewRecipients = coachAction.recipients.slice(0, 4)
  const extraRecipientCount = Math.max(0, coachAction.recipientCount - previewRecipients.length)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(coachAction.content)
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
      const response = await fetch(coachAction.confirmEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: coachAction.type,
          businessSlug: businessSlug || undefined,
          draft: coachAction.draft,
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.error || t('errorSendCouldNotSend'))
      }

      setSentCount(data.sent ?? coachAction.recipientCount)
      setStatus('sent')
      const count = data.sent ?? coachAction.recipientCount
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
          {coachAction.recipientType === 'TEAM' ? (
            <Users className="h-4 w-4" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold">{coachAction.title}</h4>
            {isSent && (
              <Badge variant="secondary" className="h-5 shrink-0 gap-1 px-1.5 text-[10px]">
                <Check className="h-3 w-3" />
                {t('statusSentBadge')}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{coachAction.description}</p>
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
            {coachAction.targetLabel} · {t('recipientCount', { count: coachAction.recipientCount })}
          </p>
        </div>

        {coachAction.subject && (
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('labels.subject')}
            </p>
            <p className="text-sm">{coachAction.subject}</p>
          </div>
        )}

        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('labels.message')}
          </p>
          <div className="max-h-44 overflow-auto rounded-md bg-muted/60 p-3 text-sm leading-relaxed whitespace-pre-wrap">
            {coachAction.content}
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
              : coachAction.confirmLabel}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="h-9">
            <Copy className="mr-2 h-4 w-4" />
            {t('buttons.copy')}
          </Button>
          <Button asChild type="button" variant="ghost" size="sm" className="h-9">
            <Link href={resolveHref(coachAction.reviewHref, basePath)}>{t('buttons.messages')}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
