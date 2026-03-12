'use client'

import React, { useState, useEffect } from 'react'
import { UserCircle, Briefcase, Users, Star, Send } from 'lucide-react'
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

export function BusinessCoachBrowser({ businessId, onRequestSent }: BusinessCoachBrowserProps) {
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
        if (!res.ok) throw new Error('Kunde inte hämta coacher')
        const json = await res.json()
        setCoaches(json.coaches || json || [])
      } catch (err) {
        toast({
          title: 'Fel',
          description: 'Kunde inte hämta tillgängliga coacher.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchCoaches()
  }, [businessId, toast])

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
        throw new Error(errorData.error || 'Kunde inte skicka förfrågan')
      }
      toast({
        title: 'Förfrågan skickad',
        description: `Din förfrågan till ${selectedCoach.name} har skickats.`,
      })
      setDialogOpen(false)
      setSelectedCoach(null)
      setMessage('')
      onRequestSent()
    } catch (err: any) {
      toast({
        title: 'Fel',
        description: err.message || 'Kunde inte skicka förfrågan. Försök igen.',
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
            Det finns inga tillgängliga coacher just nu
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
                    <span>{coach.experienceYears} års erfarenhet</span>
                  </div>
                )}
                {coach.activeClientCount != null && (
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>{coach.activeClientCount} aktiva atleter</span>
                  </div>
                )}
              </div>

              <Button
                onClick={() => handleOpenDialog(coach)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                Skicka förfrågan
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
              Skicka förfrågan till {selectedCoach?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-400">
              Du kan skriva ett valfritt meddelande till coachen med din förfrågan.
            </p>
            <Textarea
              placeholder="Berätta kort om dig själv och dina träningsmål (valfritt)..."
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
              Avbryt
            </Button>
            <Button
              onClick={handleSendRequest}
              disabled={sending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Skickar...' : 'Skicka'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
