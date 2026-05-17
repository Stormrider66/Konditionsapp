// components/client/CreateAthleteAccountDialog.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, UserPlus, Mail, Check, AlertCircle, MessageCircle, Smartphone, Copy } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTranslations } from '@/i18n/client'

interface CreateAthleteAccountDialogProps {
  clientId: string
  clientName: string
  clientEmail?: string | null
  clientPhone?: string | null
  hasExistingAccount?: boolean
  onAccountCreated?: () => void
  trigger?: React.ReactNode
}

type InviteMethod = 'sms' | 'whatsapp' | 'email'

function normalizeSmsRecipient(phone?: string | null) {
  if (!phone) return ''
  const trimmed = phone.trim()
  const hasInternationalPrefix = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')

  if (!digits) return ''
  if (hasInternationalPrefix) return `+${digits}`
  if (digits.startsWith('00')) return `+${digits.slice(2)}`
  return digits
}

interface CreatedAccountInfo {
  email: string
  mode: 'created' | 'invited'
  inviteUrl?: string
  inviteText?: string
  method: InviteMethod
}

export function CreateAthleteAccountDialog({
  clientId,
  clientName,
  clientEmail,
  clientPhone,
  hasExistingAccount = false,
  onAccountCreated,
  trigger,
}: CreateAthleteAccountDialogProps) {
  const t = useTranslations('components.createAthleteAccountDialog')
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState(clientEmail || '')
  const [createdAccount, setCreatedAccount] = useState<CreatedAccountInfo | null>(null)

  const openSms = (text: string) => {
    const recipient = normalizeSmsRecipient(clientPhone)
    window.location.href = `sms:${recipient}?&body=${encodeURIComponent(text)}`
  }

  const openWhatsApp = (text: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  const copyInvite = async (text?: string) => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    toast({
      title: t('toasts.inviteCopiedTitle'),
      description: t('toasts.inviteCopiedDescription'),
    })
  }

  const shareInvite = (method: InviteMethod, text?: string) => {
    if (!text) return
    if (method === 'sms') openSms(text)
    if (method === 'whatsapp') openWhatsApp(text)
  }

  const handleSubmit = async (method: InviteMethod) => {
    if (!email) {
      toast({
        title: t('toasts.emailRequiredTitle'),
        description: t('toasts.emailRequiredDescription'),
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        hasExistingAccount ? `/api/athlete-accounts/${clientId}/invite` : '/api/athlete-accounts',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: hasExistingAccount
            ? JSON.stringify({ deliveryMethod: method })
            : JSON.stringify({ clientId, email, deliveryMethod: method }),
        }
      )

      const data = await response.json()

      if (response.ok) {
        setCreatedAccount({
          email: data.email || email,
          mode: hasExistingAccount ? 'invited' : 'created',
          inviteUrl: data.inviteUrl,
          inviteText: data.inviteText,
          method,
        })
        if (method === 'sms' || method === 'whatsapp') {
          shareInvite(method, data.inviteText)
        }
        toast({
          title: method === 'email'
            ? (hasExistingAccount ? t('toasts.inviteSentTitle') : t('toasts.accountCreatedTitle'))
            : (hasExistingAccount ? t('toasts.inviteLinkCreatedTitle') : t('toasts.accountCreatedTitle')),
          description: data.message || (
            method === 'email'
              ? t('toasts.inviteSentDescription', { email })
              : t('toasts.shareTextDescription')
          ),
        })
        onAccountCreated?.()
      } else {
        toast({
          title: hasExistingAccount ? t('toasts.inviteFailedTitle') : t('toasts.accountCreateFailedTitle'),
          description: data.error || t('toasts.genericError'),
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: t('toasts.networkErrorTitle'),
        description: t('toasts.networkErrorDescription'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    // Reset state after dialog closes
    setTimeout(() => {
      setCreatedAccount(null)
      setEmail(clientEmail || '')
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose()
      else setOpen(true)
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            {hasExistingAccount ? (
              <Mail className="w-4 h-4 mr-2" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            {hasExistingAccount ? t('trigger.sendInvite') : t('trigger.inviteAthlete')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {hasExistingAccount ? t('dialog.sendInviteTitle') : t('dialog.createAndInviteTitle')}
          </DialogTitle>
          <DialogDescription>
            {hasExistingAccount
              ? <>{t('dialog.sendInviteDescriptionPrefix')} <strong>{clientName}</strong>. {t('dialog.sendInviteDescriptionSuffix')}</>
              : <>{t('dialog.createDescriptionPrefix')} <strong>{clientName}</strong> {t('dialog.createDescriptionSuffix')}</>}
          </DialogDescription>
        </DialogHeader>

        {createdAccount ? (
          <div className="space-y-4 py-4">
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {createdAccount.method === 'email'
                  ? createdAccount.mode === 'created'
                    ? t('success.createdEmail')
                    : t('success.invitedEmail')
                  : createdAccount.mode === 'created'
                    ? t('success.createdShare')
                    : t('success.linkReady')}
              </AlertDescription>
            </Alert>

            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-xs text-gray-500">{t('fields.email')}</Label>
                <p className="font-medium">{createdAccount.email}</p>
              </div>
              {createdAccount.inviteText && (
                <div>
                  <Label className="text-xs text-gray-500">{t('fields.inviteText')}</Label>
                  <p className="mt-1 whitespace-pre-line rounded-md border bg-white p-3 text-sm">
                    {createdAccount.inviteText}
                  </p>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-500">
              {t('passwordHelp')}
            </p>

            <DialogFooter>
              <div className="grid w-full gap-2 sm:grid-cols-2">
                {createdAccount.inviteText && (
                  <>
                    <Button variant="outline" onClick={() => openSms(createdAccount.inviteText!)}>
                      <Smartphone className="w-4 h-4 mr-2" />
                      SMS
                    </Button>
                    <Button variant="outline" onClick={() => openWhatsApp(createdAccount.inviteText!)}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button variant="outline" onClick={() => copyInvite(createdAccount.inviteText)}>
                      <Copy className="w-4 h-4 mr-2" />
                      {t('actions.copy')}
                    </Button>
                  </>
                )}
                <Button onClick={handleClose}>
                  {t('actions.close')}
                </Button>
              </div>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="athlete-email">{t('fields.emailAddress')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="athlete-email"
                  type="email"
                  placeholder="atlet@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading || hasExistingAccount}
                />
              </div>
              <p className="text-xs text-gray-500">
                {hasExistingAccount
                  ? t('emailHelp.existing')
                  : t('emailHelp.new')}
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('shareHelp')}
              </AlertDescription>
            </Alert>

            <DialogFooter className="flex-col gap-2 sm:flex-col sm:gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                {t('actions.cancel')}
              </Button>
              <div className="grid w-full gap-2 sm:grid-cols-3">
                <Button onClick={() => handleSubmit('sms')} disabled={isLoading || !email}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Smartphone className="w-4 h-4 mr-2" />
                  )}
                  SMS
                </Button>
                <Button onClick={() => handleSubmit('whatsapp')} disabled={isLoading || !email} variant="outline">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4 mr-2" />
                  )}
                  WhatsApp
                </Button>
                <Button onClick={() => handleSubmit('email')} disabled={isLoading || !email} variant="outline">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('actions.sending')}
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      {t('actions.email')}
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
