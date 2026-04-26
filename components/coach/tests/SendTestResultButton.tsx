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

interface SendTestResultButtonProps {
  testId: string
  athleteName: string
  athleteEmail: string | null
}

export function SendTestResultButton({
  testId,
  athleteName,
  athleteEmail,
}: SendTestResultButtonProps) {
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
        throw new Error(json.error || 'Kunde inte skicka resultatmejl')
      }

      const description = json.athleteAccountCreated
        ? `Konto skapat åt ${athleteName}. Mejl med inloggningslänk skickat till ${athleteEmail}.`
        : `Mejl med länk till resultatet skickat till ${athleteEmail}.`

      toast.success('Skickat!', {
        description,
        icon: <CheckCircle2 className="h-4 w-4" />,
      })
      setOpen(false)
      setMessage('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Något gick fel')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled} title={disabled ? 'Klienten saknar e-postadress' : undefined}>
          <Send className="mr-2 h-4 w-4" />
          Skicka resultat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Skicka resultat till {athleteName}</DialogTitle>
          <DialogDescription>
            Vi mejlar {athleteEmail ?? 'atleten'} en länk till sin testrapport. Om
            atleten saknar konto skapar vi ett gratiskonto åt dem och låter dem välja
            lösenord innan de landar på rapporten. Inga resultatdata syns i mejlet —
            bara en länk bakom inloggning.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="message">Meddelande (valfritt)</Label>
          <Textarea
            id="message"
            rows={4}
            placeholder="Ex: Hej Max — bra jobbat på testet i fredags. Vi ses imorgon för uppföljning."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground">
            Visas i en separat ruta i mejlet, signerat med ditt namn.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Avbryt
          </Button>
          <Button onClick={handleSend} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Skickar…
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> Skicka
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
