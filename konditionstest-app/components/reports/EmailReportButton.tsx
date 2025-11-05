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

interface EmailReportButtonProps {
  reportData: ReportData
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function EmailReportButton({
  reportData,
  variant = 'default',
  size = 'md',
  className = '',
}: EmailReportButtonProps) {
  const { toast } = useToast()
  const [showDialog, setShowDialog] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [email, setEmail] = useState(reportData.client.email || '')
  const [customMessage, setCustomMessage] = useState('')

  const handleSendEmail = async () => {
    if (!email) {
      toast({
        title: 'Fel',
        description: 'Vänligen ange en e-postadress',
        variant: 'destructive',
      })
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast({
        title: 'Fel',
        description: 'Vänligen ange en giltig e-postadress',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSending(true)

      // Generate PDF as base64
      toast({
        title: 'Genererar PDF...',
        description: 'Detta kan ta några sekunder',
      })

      const pdfBase64 = await generatePDFAsBase64(reportData)

      // Send email
      toast({
        title: 'Skickar e-post...',
        description: 'Vänta medan rapporten skickas',
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
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Kunde inte skicka e-post')
      }

      toast({
        title: 'E-post skickad!',
        description: `Rapporten har skickats till ${email}`,
      })

      setShowDialog(false)
      setCustomMessage('')
    } catch (error) {
      console.error('Error sending email:', error)
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Kunde inte skicka e-post',
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
        Skicka via E-post
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Skicka testrapport via e-post</DialogTitle>
            <DialogDescription>
              Rapporten kommer att skickas som en PDF-bilaga till mottagaren.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-postadress</Label>
              <Input
                id="email"
                type="email"
                placeholder="exempel@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSending}
              />
              <p className="text-sm text-muted-foreground">
                Rapporten skickas till: {reportData.client.name}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-message">Personligt meddelande (valfritt)</Label>
              <Textarea
                id="custom-message"
                placeholder="Skriv ett personligt meddelande till mottagaren..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={4}
                disabled={isSending}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>Innehåll:</strong>
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-disc">
                <li>Testdatum: {format(reportData.test.testDate, 'yyyy-MM-dd')}</li>
                <li>Testledare: {reportData.testLeader}</li>
                <li>Organisation: {reportData.organization}</li>
                <li>PDF-rapport med alla resultat och träningszoner</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isSending}
            >
              Avbryt
            </Button>
            <Button onClick={handleSendEmail} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Skickar...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Skicka
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
