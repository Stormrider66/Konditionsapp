'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle2 } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useLocale } from '@/i18n/client'

interface SendTestResultButtonProps {
  testId: string
  athleteName: string
  athleteEmail: string | null
}

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  sendError: string;
  accountCreated: (name: string, email: string | null) => string;
  resultSent: (email: string | null) => string;
  sentTitle: string;
  unknownError: string;
  missingEmailTitle: string;
  button: string;
  dialogTitle: (name: string) => string;
  dialogDescription: (email: string | null) => string;
  messageLabel: string;
  messagePlaceholder: string;
  messageHelp: string;
  cancel: string;
  sending: string;
  send: string;
}> = {
  en: {
    sendError: 'Could not send result email',
    accountCreated: (name, email) => `Account created for ${name}. An email with a sign-in link was sent to ${email}.`,
    resultSent: (email) => `Email with a link to the result was sent to ${email}.`,
    sentTitle: 'Sent!',
    unknownError: 'Something went wrong',
    missingEmailTitle: 'The client does not have an email address',
    button: 'Send result',
    dialogTitle: (name) => `Send result to ${name}`,
    dialogDescription: (email) =>
      `We email ${email ?? 'the athlete'} a link to their test report. If the athlete does not have an account, we create a free account and let them choose a password before they land on the report. No result data is shown in the email, only a sign-in protected link.`,
    messageLabel: 'Message (optional)',
    messagePlaceholder: 'Example: Hi Max, great work on the test last Friday. See you tomorrow for follow-up.',
    messageHelp: 'Shown in a separate box in the email, signed with your name.',
    cancel: 'Cancel',
    sending: 'Sending...',
    send: 'Send',
  },
  sv: {
    sendError: 'Kunde inte skicka resultatmejl',
    accountCreated: (name, email) => `Konto skapat åt ${name}. Mejl med inloggningslänk skickat till ${email}.`,
    resultSent: (email) => `Mejl med länk till resultatet skickat till ${email}.`,
    sentTitle: 'Skickat!',
    unknownError: 'Något gick fel',
    missingEmailTitle: 'Klienten saknar e-postadress',
    button: 'Skicka resultat',
    dialogTitle: (name) => `Skicka resultat till ${name}`,
    dialogDescription: (email) =>
      `Vi mejlar ${email ?? 'atleten'} en länk till sin testrapport. Om atleten saknar konto skapar vi ett gratiskonto åt dem och låter dem välja lösenord innan de landar på rapporten. Inga resultatdata syns i mejlet - bara en länk bakom inloggning.`,
    messageLabel: 'Meddelande (valfritt)',
    messagePlaceholder: 'Ex: Hej Max - bra jobbat på testet i fredags. Vi ses imorgon för uppföljning.',
    messageHelp: 'Visas i en separat ruta i mejlet, signerat med ditt namn.',
    cancel: 'Avbryt',
    sending: 'Skickar...',
    send: 'Skicka',
  },
}

export function SendTestResultButton({
  testId,
  athleteName,
  athleteEmail,
}: SendTestResultButtonProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const disabled = !athleteEmail

  const handleSend = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/coach/tests/${testId}/send-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || copy.sendError)
      }

      const description = json.athleteAccountCreated
        ? copy.accountCreated(athleteName, athleteEmail)
        : copy.resultSent(athleteEmail)

      toast.success(copy.sentTitle, {
        description,
        icon: <CheckCircle2 className="h-4 w-4" />,
      })
      setOpen(false)
      setMessage('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : copy.unknownError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled} title={disabled ? copy.missingEmailTitle : undefined}>
          <Send className="mr-2 h-4 w-4" />
          {copy.button}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.dialogTitle(athleteName)}</DialogTitle>
          <DialogDescription>
            {copy.dialogDescription(athleteEmail)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="message">{copy.messageLabel}</Label>
          <Textarea
            id="message"
            rows={4}
            placeholder={copy.messagePlaceholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground">
            {copy.messageHelp}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            {copy.cancel}
          </Button>
          <Button onClick={handleSend} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {copy.sending}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> {copy.send}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
