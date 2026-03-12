'use client'

import React, { useState, useEffect } from 'react'
import { UserCircle, Users, Send, Dumbbell } from 'lucide-react'
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

interface UnassignedAthlete {
  id: string
  name: string | null
  email: string
  sportProfile?: {
    primarySport: string | null
  } | null
}

interface BusinessAthleteBrowserProps {
  businessId: string
  onInvitationSent?: () => void
}

export function BusinessAthleteBrowser({ businessId, onInvitationSent }: BusinessAthleteBrowserProps) {
  const [athletes, setAthletes] = useState<UnassignedAthlete[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAthlete, setSelectedAthlete] = useState<UnassignedAthlete | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchAthletes() {
      try {
        setLoading(true)
        const res = await fetch(`/api/business/${businessId}/athletes/unassigned`)
        if (!res.ok) throw new Error('Kunde inte hämta atleter')
        const json = await res.json()
        setAthletes(json.athletes || [])
      } catch {
        toast({
          title: 'Fel',
          description: 'Kunde inte hämta tillgängliga atleter.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchAthletes()
  }, [businessId, toast])

  const handleOpenDialog = (athlete: UnassignedAthlete) => {
    setSelectedAthlete(athlete)
    setMessage('')
    setDialogOpen(true)
  }

  const handleSendInvitation = async () => {
    if (!selectedAthlete) return
    try {
      setSending(true)
      const res = await fetch(`/api/business/${businessId}/coach-invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteClientId: selectedAthlete.id,
          message: message.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Kunde inte skicka inbjudan')
      }
      toast({
        title: 'Inbjudan skickad',
        description: `Din inbjudan till ${selectedAthlete.name || selectedAthlete.email} har skickats.`,
      })
      setDialogOpen(false)
      setSelectedAthlete(null)
      setMessage('')
      // Remove from list
      setAthletes(prev => prev.filter(a => a.id !== selectedAthlete.id))
      onInvitationSent?.()
    } catch (err: any) {
      toast({
        title: 'Fel',
        description: err.message || 'Kunde inte skicka inbjudan. Försök igen.',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="animate-pulse bg-white/5 rounded-lg h-32" />
        <div className="animate-pulse bg-white/5 rounded-lg h-32" />
      </div>
    )
  }

  if (athletes.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-white/10">
        <CardContent className="py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-400">
            Det finns inga otilldelade atleter just nu
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {athletes.map((athlete) => (
          <Card key={athlete.id} className="bg-slate-900/50 border-white/10 hover:border-white/20 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
                  {(athlete.name || athlete.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg text-white truncate">
                    {athlete.name || athlete.email}
                  </CardTitle>
                  {athlete.name && (
                    <p className="text-sm text-slate-400 mt-0.5">{athlete.email}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {athlete.sportProfile?.primarySport && (
                <div className="flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-slate-400" />
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                    {athlete.sportProfile.primarySport}
                  </Badge>
                </div>
              )}

              <Button
                onClick={() => handleOpenDialog(athlete)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                Skicka inbjudan
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Send invitation dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-950 border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Bjud in {selectedAthlete?.name || selectedAthlete?.email}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-400">
              Atleten kommer att kunna acceptera eller avvisa din inbjudan.
            </p>
            <Textarea
              placeholder="Skriv ett valfritt meddelande till atleten..."
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
              onClick={handleSendInvitation}
              disabled={sending}
              className="bg-blue-500 hover:bg-blue-600 text-white"
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
