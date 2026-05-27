'use client'

import { useState } from 'react'
import { ReportData } from '@/types'
import { generatePDFAsBase64 } from '@/lib/pdf-generator'
import { Mail, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { useLocale, useTranslations } from '@/i18n/client'

interface EmailReportButtonProps {
  reportData: ReportData
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export function EmailReportButton({
  reportData,
  variant = 'default',
  size = 'default',
  className = '',
}: EmailReportButtonProps) {
  const t = useTranslations('components.emailReportButton')
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const { toast } = useToast()
  const [showDialog, setShowDialog] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [email, setEmail] = useState(reportData.client.email || '')
  const [customMessage, setCustomMessage] = useState('')

  const handleSendEmail = async () => {
    if (!email) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.emailRequired'),
        variant: 'destructive',
      })
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.emailInvalid'),
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSending(true)

      // Generate PDF as base64
      toast({
        title: t('toast.generatingTitle'),
        description: t('toast.generatingDescription'),
      })

      const pdfBase64 = await generatePDFAsBase64(reportData, { locale })

      // Send email
      toast({
        title: t('toast.sendingTitle'),
        description: t('toast.sendingDescription'),
      })

      const response = await fetch('/api/send-report-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          clientName: reportData.client.name,
          testDate: format(reportData.test.testDate, 'yyyy-MM-dd'),
          testLeader: reportData.testLeader,
          organization: reportData.organization,
          pdfBase64: pdfBase64,
          customMessage: customMessage || undefined,
          locale,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || t('toast.sendFailed'))
      }

      toast({
        title: t('toast.sentTitle'),
        description: t('toast.sentDescription', { email }),
      })

      setShowDialog(false)
      setCustomMessage('')
    } catch (error) {
      console.error('Error sending email:', error)
      toast({
        title: t('toast.errorTitle'),
        description: error instanceof Error ? error.message : t('toast.sendFailed'),
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        variant={variant}
        size={size}
        className={className}
      >
        <Mail className="w-4 h-4 mr-2" />
        {t('button')}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email.label')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('email.placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSending}
              />
              <p className="text-sm text-muted-foreground">
                {t('email.recipient', { name: reportData.client.name })}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-message">{t('customMessage.label')}</Label>
              <Textarea
                id="custom-message"
                placeholder={t('customMessage.placeholder')}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={4}
                disabled={isSending}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>{t('content.title')}</strong>
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-disc">
                <li>{t('content.testDate', { date: format(reportData.test.testDate, 'yyyy-MM-dd') })}</li>
                <li>{t('content.testLeader', { testLeader: reportData.testLeader })}</li>
                <li>{t('content.organization', { organization: reportData.organization })}</li>
                <li>{t('content.pdfReport')}</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isSending}
            >
              {t('actions.cancel')}
            </Button>
            <Button onClick={handleSendEmail} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('actions.sending')}
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  {t('actions.send')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
