'use client'

import React, { useState, useEffect } from 'react'
import { Check, X, UserPlus, Dumbbell, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

interface CoachRequestItem {
  id: string
  message: string | null
  requestedAt: string
  athlete: {
    id: string
    name: string | null
    email: string
    sportProfile?: {
      primarySport: string | null
    } | null
  }
}

interface PendingCoachRequestsProps {
  businessId: string
  onRequestHandled?: () => void
}

export function PendingCoachRequests({ businessId, onRequestHandled }: PendingCoachRequestsProps) {
  const [requests, setRequests] = useState<CoachRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchRequests() {
      try {
        setLoading(true)
        const res = await fetch(`/api/business/${businessId}/coach-requests?status=PENDING`)
        if (!res.ok) throw new Error('Kunde inte hämta förfrågningar')
        const json = await res.json()
        setRequests(json.requests || [])
      } catch {
        toast({
          title: 'Fel',
          description: 'Kunde inte hämta väntande förfrågningar.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchRequests()
  }, [businessId, toast])

  const handleAccept = async (requestId: string) => {
    try {
      setActionLoading(requestId)
      const res = await fetch(`/api/business/${businessId}/coach-requests/${requestId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Kunde inte acceptera förfrågan')
      }
      const req = requests.find(r => r.id === requestId)
      toast({
        title: 'Förfrågan accepterad',
        description: `${req?.athlete.name || req?.athlete.email} är nu din atlet.`,
      })
      setRequests(prev => prev.filter(r => r.id !== requestId))
      onRequestHandled?.()
    } catch (err: any) {
      toast({
        title: 'Fel',
        description: err.message || 'Kunde inte acceptera förfrågan.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (requestId: string) => {
    try {
      setActionLoading(requestId)
      const res = await fetch(`/api/business/${businessId}/coach-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Kunde inte avvisa förfrågan')
      }
      toast({
        title: 'Förfrågan avvisad',
      })
      setRequests(prev => prev.filter(r => r.id !== requestId))
    } catch (err: any) {
      toast({
        title: 'Fel',
        description: err.message || 'Kunde inte avvisa förfrågan.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-white/10">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    )
  }

  if (requests.length === 0) {
    return null
  }

  return (
    <Card className="bg-slate-900/50 border-amber-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-amber-400" />
          <CardTitle className="text-lg text-white">
            Inkommande förfrågningar ({requests.length})
          </CardTitle>
        </div>
        <p className="text-sm text-slate-400">
          Atleter som vill ha dig som coach
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex items-start gap-3 p-3 rounded-lg border border-white/10 bg-white/5"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold shrink-0">
              {(req.athlete.name || req.athlete.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">
                {req.athlete.name || req.athlete.email}
              </p>
              {req.athlete.name && (
                <p className="text-xs text-slate-400">{req.athlete.email}</p>
              )}
              {req.athlete.sportProfile?.primarySport && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Dumbbell className="w-3 h-3 text-slate-400" />
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                    {req.athlete.sportProfile.primarySport}
                  </Badge>
                </div>
              )}
              {req.message && (
                <p className="text-xs text-slate-300 mt-2 italic">
                  &quot;{req.message}&quot;
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {format(new Date(req.requestedAt), 'yyyy-MM-dd')}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => handleAccept(req.id)}
                disabled={actionLoading === req.id}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {actionLoading === req.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Acceptera
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReject(req.id)}
                disabled={actionLoading === req.id}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <X className="w-4 h-4 mr-1" />
                Avvisa
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
