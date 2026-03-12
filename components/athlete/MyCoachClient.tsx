'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { UserCircle, Briefcase, Clock, Check, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { BusinessCoachBrowser } from '@/components/athlete/BusinessCoachBrowser'

interface Coach {
  id: string
  name: string
  headline?: string | null
  specialties?: string[]
  connectedSince?: string
}

interface PendingRequest {
  id: string
  coach: {
    id: string
    name: string
    headline?: string | null
    specialties?: string[]
  }
  message?: string | null
  createdAt: string
}

interface MyCoachData {
  coach: Coach | null
  pendingRequest: PendingRequest | null
}

interface MyCoachClientProps {
  businessId: string
  businessSlug: string
}

export function MyCoachClient({ businessId, businessSlug }: MyCoachClientProps) {
  const [data, setData] = useState<MyCoachData | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [ending, setEnding] = useState(false)
  const { toast } = useToast()

  const fetchCoachData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/business/${businessId}/my-coach`)
      if (!res.ok) throw new Error('Kunde inte hämta coachdata')
      const json = await res.json()
      setData(json)
    } catch (err) {
      toast({
        title: 'Fel',
        description: 'Kunde inte hämta coachdata. Försök igen.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [businessId, toast])

  useEffect(() => {
    fetchCoachData()
  }, [fetchCoachData])

  const handleCancelRequest = async (requestId: string) => {
    try {
      setCancelling(true)
      const res = await fetch('/api/athlete/coach-requests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      })
      if (!res.ok) throw new Error('Kunde inte avbryta förfrågan')
      toast({
        title: 'Förfrågan avbruten',
        description: 'Din coachförfrågan har avbrutits.',
      })
      await fetchCoachData()
    } catch (err) {
      toast({
        title: 'Fel',
        description: 'Kunde inte avbryta förfrågan. Försök igen.',
        variant: 'destructive',
      })
    } finally {
      setCancelling(false)
    }
  }

  const handleEndAgreement = async () => {
    if (!data?.coach) return
    try {
      setEnding(true)
      const res = await fetch(`/api/business/${businessId}/my-coach`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Kunde inte avsluta samarbetet')
      toast({
        title: 'Samarbete avslutat',
        description: 'Du har avslutat samarbetet med din coach.',
      })
      await fetchCoachData()
    } catch (err) {
      toast({
        title: 'Fel',
        description: 'Kunde inte avsluta samarbetet. Försök igen.',
        variant: 'destructive',
      })
    } finally {
      setEnding(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <h1 className="text-2xl font-bold text-white mb-6">Min Coach</h1>
        <div className="space-y-4">
          <div className="animate-pulse bg-white/5 rounded-lg h-48" />
          <div className="animate-pulse bg-white/5 rounded-lg h-32" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-6">Min Coach</h1>

      {/* State 1: Has active coach */}
      {data?.coach && (
        <Card className="bg-slate-900/50 border-white/10">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-xl font-bold">
                  {data.coach.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <CardTitle className="text-xl text-white">{data.coach.name}</CardTitle>
                  {data.coach.headline && (
                    <p className="text-sm text-slate-400 mt-1">{data.coach.headline}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Check className="w-4 h-4 text-green-500" />
                <span>Aktiv</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.coach.specialties && data.coach.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.coach.specialties.map((specialty) => (
                  <Badge
                    key={specialty}
                    className="bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20"
                  >
                    {specialty}
                  </Badge>
                ))}
              </div>
            )}

            {data.coach.connectedSince && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock className="w-4 h-4" />
                <span>
                  Kopplad sedan{' '}
                  {new Date(data.coach.connectedSince).toLocaleDateString('sv-SE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}

            <div className="pt-4 border-t border-white/5">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Avsluta samarbete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-950 border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Avsluta samarbete?</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                      Vill du verkligen avsluta samarbetet med {data.coach.name}? Din coach kommer inte
                      längre kunna se dina träningsdata eller skapa program åt dig.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700">
                      Avbryt
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleEndAgreement}
                      disabled={ending}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      {ending ? 'Avslutar...' : 'Ja, avsluta'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* State 2: Has pending request */}
      {data?.pendingRequest && !data?.coach && (
        <Card className="bg-slate-900/50 border-white/10">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-xl font-bold">
                  {data.pendingRequest.coach.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <CardTitle className="text-xl text-white">
                    {data.pendingRequest.coach.name}
                  </CardTitle>
                  {data.pendingRequest.coach.headline && (
                    <p className="text-sm text-slate-400 mt-1">
                      {data.pendingRequest.coach.headline}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-orange-400">
                <Clock className="w-4 h-4" />
                <span>Väntar på svar</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.pendingRequest.coach.specialties &&
              data.pendingRequest.coach.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {data.pendingRequest.coach.specialties.map((specialty) => (
                    <Badge
                      key={specialty}
                      className="bg-white/5 text-slate-300 border-white/10"
                    >
                      {specialty}
                    </Badge>
                  ))}
                </div>
              )}

            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Clock className="w-4 h-4" />
              <span>
                Förfrågan skickad{' '}
                {new Date(data.pendingRequest.createdAt).toLocaleDateString('sv-SE', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>

            {data.pendingRequest.message && (
              <div className="bg-white/5 rounded-lg p-3 text-sm text-slate-300">
                <span className="text-slate-500 block mb-1">Ditt meddelande:</span>
                {data.pendingRequest.message}
              </div>
            )}

            <div className="pt-4 border-t border-white/5">
              <Button
                variant="outline"
                onClick={() => handleCancelRequest(data.pendingRequest!.id)}
                disabled={cancelling}
                className="border-white/10 text-slate-300 hover:bg-white/5"
              >
                <X className="w-4 h-4 mr-2" />
                {cancelling ? 'Avbryter...' : 'Avbryt förfrågan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* State 3: No coach, no pending request */}
      {!data?.coach && !data?.pendingRequest && (
        <div className="space-y-6">
          <Card className="bg-slate-900/50 border-white/10">
            <CardContent className="py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <UserCircle className="w-8 h-8 text-slate-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">
                Du har ingen coach just nu
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Bläddra bland tillgängliga coacher nedan och skicka en förfrågan för att komma
                igång med personlig coaching.
              </p>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-orange-500" />
              Tillgängliga coacher
            </h2>
            <BusinessCoachBrowser
              businessId={businessId}
              onRequestSent={fetchCoachData}
            />
          </div>
        </div>
      )}
    </div>
  )
}
