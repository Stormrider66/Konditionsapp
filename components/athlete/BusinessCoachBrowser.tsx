'use client'

import React, { useState, useEffect } from 'react'
import { Users, Star, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/i18n/client'

interface AvailableCoach {
  id: string
  name: string
  headline?: string | null
  specialties?: string[]
  experienceYears?: number | null
  activeClientCount?: number
}

interface BusinessCoachBrowserProps {
  businessId: string
  onRequestSent: () => void
}

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  errors: {
    title: string
    load: string
    loadDescription: string
    send: string
    sendDescription: string
  }
  empty: string
  request: {
    sentTitle: string
    sentDescription: (coachName: string) => string
    button: string
    dialogTitle: (coachName?: string) => string
    dialogDescription: string
    placeholder: string
    cancel: string
    send: string
    sending: string
  }
  labels: {
    experience: (years: number) => string
    activeAthletes: (count: number) => string
  }
}> = {
  en: {
    errors: {
      title: 'Error',
      load: 'Could not fetch coaches',
      loadDescription: 'Could not fetch available coaches.',
      send: 'Could not send request',
      sendDescription: 'Could not send the request. Please try again.',
    },
    empty: 'There are no available coaches right now',
    request: {
      sentTitle: 'Request sent',
      sentDescription: (coachName) => `Your request to ${coachName} has been sent.`,
      button: 'Send request',
      dialogTitle: (coachName) => `Send request to ${coachName ?? ''}`.trim(),
      dialogDescription: 'You can write an optional message to the coach with your request.',
      placeholder: 'Briefly tell them about yourself and your training goals (optional)...',
      cancel: 'Cancel',
      send: 'Send',
      sending: 'Sending...',
    },
    labels: {
      experience: (years) => `${years} ${years === 1 ? 'year' : 'years'} experience`,
      activeAthletes: (count) => `${count} active ${count === 1 ? 'athlete' : 'athletes'}`,
    },
  },
  sv: {
    errors: {
      title: 'Fel',
      load: 'Kunde inte hämta coacher',
      loadDescription: 'Kunde inte hämta tillgängliga coacher.',
      send: 'Kunde inte skicka förfrågan',
      sendDescription: 'Kunde inte skicka förfrågan. Försök igen.',
    },
    empty: 'Det finns inga tillgängliga coacher just nu',
    request: {
      sentTitle: 'Förfrågan skickad',
      sentDescription: (coachName) => `Din förfrågan till ${coachName} har skickats.`,
      button: 'Skicka förfrågan',
      dialogTitle: (coachName) => `Skicka förfrågan till ${coachName ?? ''}`.trim(),
      dialogDescription: 'Du kan skriva ett valfritt meddelande till coachen med din förfrågan.',
      placeholder: 'Berätta kort om dig själv och dina träningsmål (valfritt)...',
      cancel: 'Avbryt',
      send: 'Skicka',
      sending: 'Skickar...',
    },
    labels: {
      experience: (years) => `${years} års erfarenhet`,
      activeAthletes: (count) => `${count} aktiva ${count === 1 ? 'atlet' : 'atleter'}`,
    },
  },
}

export function BusinessCoachBrowser({ businessId, onRequestSent }: BusinessCoachBrowserProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const [coaches, setCoaches] = useState<AvailableCoach[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCoach, setSelectedCoach] = useState<AvailableCoach | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchCoaches() {
      try {
        setLoading(true)
        const res = await fetch(`/api/business/${businessId}/coaches/available`)
        if (!res.ok) throw new Error(copy.errors.load)
        const json = await res.json()
        setCoaches(json.coaches || json || [])
      } catch {
        toast({
          title: copy.errors.title,
          description: copy.errors.loadDescription,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    void fetchCoaches()
  }, [businessId, copy, toast])

  const handleOpenDialog = (coach: AvailableCoach) => {
    setSelectedCoach(coach)
    setMessage('')
    setDialogOpen(true)
  }

  const handleSendRequest = async () => {
    if (!selectedCoach) return
    try {
      setSending(true)
      const res = await fetch(`/api/business/${businessId}/coach-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coachUserId: selectedCoach.id,
          message: message.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || copy.errors.send)
      }
      toast({
        title: copy.request.sentTitle,
        description: copy.request.sentDescription(selectedCoach.name),
      })
      setDialogOpen(false)
      setSelectedCoach(null)
      setMessage('')
      onRequestSent()
    } catch (err) {
      toast({
        title: copy.errors.title,
        description: err instanceof Error ? err.message : copy.errors.sendDescription,
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="animate-pulse bg-white/5 rounded-lg h-48" />
        <div className="animate-pulse bg-white/5 rounded-lg h-48" />
      </div>
    )
  }

  if (coaches.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-white/10">
        <CardContent className="py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-400">
            {copy.empty}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {coaches.map((coach) => (
          <Card key={coach.id} className="bg-slate-900/50 border-white/10 hover:border-white/20 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
                  {coach.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg text-white truncate">{coach.name}</CardTitle>
                  {coach.headline && (
                    <p className="text-sm text-slate-400 mt-0.5 line-clamp-2">{coach.headline}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {coach.specialties && coach.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {coach.specialties.map((specialty) => (
                    <Badge
                      key={specialty}
                      className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-xs"
                    >
                      {specialty}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-400">
                {coach.experienceYears != null && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5" />
                    <span>{copy.labels.experience(coach.experienceYears)}</span>
                  </div>
                )}
                {coach.activeClientCount != null && (
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>{copy.labels.activeAthletes(coach.activeClientCount)}</span>
                  </div>
                )}
              </div>

              <Button
                onClick={() => handleOpenDialog(coach)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                {copy.request.button}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Send request dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-950 border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {copy.request.dialogTitle(selectedCoach?.name)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-400">
              {copy.request.dialogDescription}
            </p>
            <Textarea
              placeholder={copy.request.placeholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-slate-900 border-white/10 text-white placeholder:text-slate-500 min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-slate-500 text-right">{message.length}/500</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-white/10 text-slate-300 hover:bg-white/5"
            >
              {copy.request.cancel}
            </Button>
            <Button
              onClick={handleSendRequest}
              disabled={sending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? copy.request.sending : copy.request.send}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
