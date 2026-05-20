'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { UserCircle, Briefcase, Clock, Check, X, Mail } from 'lucide-react'
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
import { useLocale } from '@/i18n/client'

type AppLocale = 'en' | 'sv'

const copy = {
  en: {
    pageTitle: 'My Coach',
    errorTitle: 'Error',
    fetchFailed: 'Could not fetch coach data. Try again.',
    cancelRequestFailed: 'Could not cancel request. Try again.',
    cancelRequestSuccessTitle: 'Request canceled',
    cancelRequestSuccessDescription: 'Your coach request has been canceled.',
    acceptInvitationFallback: 'Could not accept invitation',
    acceptInvitationFailed: 'Could not accept invitation. Try again.',
    acceptInvitationSuccessTitle: 'Invitation accepted',
    acceptInvitationSuccessDescription: 'You now have an active coach.',
    rejectInvitationFailed: 'Could not reject invitation. Try again.',
    rejectInvitationSuccessTitle: 'Invitation rejected',
    rejectInvitationSuccessDescription: 'The invitation has been rejected.',
    endAgreementFailed: 'Could not end the collaboration. Try again.',
    endAgreementSuccessTitle: 'Collaboration ended',
    endAgreementSuccessDescription: 'You have ended the collaboration with your coach.',
    active: 'Active',
    connectedSince: 'Connected since',
    endCollaboration: 'End collaboration',
    endCollaborationQuestion: 'End collaboration?',
    endCollaborationDescription: (coachName: string) =>
      `Are you sure you want to end the collaboration with ${coachName}? Your coach will no longer be able to see your training data or create programs for you.`,
    cancel: 'Cancel',
    ending: 'Ending...',
    confirmEnd: 'Yes, end',
    pendingResponse: 'Waiting for response',
    requestSent: 'Request sent',
    yourMessage: 'Your message:',
    canceling: 'Canceling...',
    cancelRequest: 'Cancel request',
    coachInvitations: 'Invitations from coaches',
    invitation: 'Invitation',
    messageFromCoach: 'Message from coach:',
    sent: 'Sent',
    accepting: 'Accepting...',
    accept: 'Accept',
    reject: 'Reject',
    noCoachTitle: 'You do not have a coach right now',
    noCoachDescription: 'Browse available coaches below and send a request to get started with personal coaching.',
    availableCoaches: 'Available coaches',
  },
  sv: {
    pageTitle: 'Min Coach',
    errorTitle: 'Fel',
    fetchFailed: 'Kunde inte hämta coachdata. Försök igen.',
    cancelRequestFailed: 'Kunde inte avbryta förfrågan. Försök igen.',
    cancelRequestSuccessTitle: 'Förfrågan avbruten',
    cancelRequestSuccessDescription: 'Din coachförfrågan har avbrutits.',
    acceptInvitationFallback: 'Kunde inte acceptera inbjudan',
    acceptInvitationFailed: 'Kunde inte acceptera inbjudan. Försök igen.',
    acceptInvitationSuccessTitle: 'Inbjudan accepterad',
    acceptInvitationSuccessDescription: 'Du har nu en aktiv coach!',
    rejectInvitationFailed: 'Kunde inte avvisa inbjudan. Försök igen.',
    rejectInvitationSuccessTitle: 'Inbjudan avvisad',
    rejectInvitationSuccessDescription: 'Inbjudan har avvisats.',
    endAgreementFailed: 'Kunde inte avsluta samarbetet. Försök igen.',
    endAgreementSuccessTitle: 'Samarbete avslutat',
    endAgreementSuccessDescription: 'Du har avslutat samarbetet med din coach.',
    active: 'Aktiv',
    connectedSince: 'Kopplad sedan',
    endCollaboration: 'Avsluta samarbete',
    endCollaborationQuestion: 'Avsluta samarbete?',
    endCollaborationDescription: (coachName: string) =>
      `Vill du verkligen avsluta samarbetet med ${coachName}? Din coach kommer inte längre kunna se dina träningsdata eller skapa program åt dig.`,
    cancel: 'Avbryt',
    ending: 'Avslutar...',
    confirmEnd: 'Ja, avsluta',
    pendingResponse: 'Väntar på svar',
    requestSent: 'Förfrågan skickad',
    yourMessage: 'Ditt meddelande:',
    canceling: 'Avbryter...',
    cancelRequest: 'Avbryt förfrågan',
    coachInvitations: 'Inbjudningar från coacher',
    invitation: 'Inbjudan',
    messageFromCoach: 'Meddelande från coachen:',
    sent: 'Skickad',
    accepting: 'Accepterar...',
    accept: 'Acceptera',
    reject: 'Avvisa',
    noCoachTitle: 'Du har ingen coach just nu',
    noCoachDescription: 'Bläddra bland tillgängliga coacher nedan och skicka en förfrågan för att komma igång med personlig coaching.',
    availableCoaches: 'Tillgängliga coacher',
  },
} satisfies Record<AppLocale, {
  pageTitle: string
  errorTitle: string
  fetchFailed: string
  cancelRequestFailed: string
  cancelRequestSuccessTitle: string
  cancelRequestSuccessDescription: string
  acceptInvitationFallback: string
  acceptInvitationFailed: string
  acceptInvitationSuccessTitle: string
  acceptInvitationSuccessDescription: string
  rejectInvitationFailed: string
  rejectInvitationSuccessTitle: string
  rejectInvitationSuccessDescription: string
  endAgreementFailed: string
  endAgreementSuccessTitle: string
  endAgreementSuccessDescription: string
  active: string
  connectedSince: string
  endCollaboration: string
  endCollaborationQuestion: string
  endCollaborationDescription: (coachName: string) => string
  cancel: string
  ending: string
  confirmEnd: string
  pendingResponse: string
  requestSent: string
  yourMessage: string
  canceling: string
  cancelRequest: string
  coachInvitations: string
  invitation: string
  messageFromCoach: string
  sent: string
  accepting: string
  accept: string
  reject: string
  noCoachTitle: string
  noCoachDescription: string
  availableCoaches: string
}>

function formatDate(value: string, locale: AppLocale): string {
  return new Date(value).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

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

interface CoachInvitation {
  id: string
  message?: string | null
  requestedAt: string
  coach: {
    id: string
    name: string
    email?: string | null
    coachProfile?: {
      headline?: string | null
      specialties?: string[]
      experienceYears?: number | null
    } | null
  }
}

interface MyCoachData {
  coach: Coach | null
  pendingRequest: PendingRequest | null
  coachInvitations: CoachInvitation[]
}

interface MyCoachClientProps {
  businessId: string
  businessSlug: string
}

export function MyCoachClient({ businessId, businessSlug: _businessSlug }: MyCoachClientProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const text = copy[locale]
  const [data, setData] = useState<MyCoachData | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [ending, setEnding] = useState(false)
  const [invitationActionLoading, setInvitationActionLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchCoachData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/business/${businessId}/my-coach`)
      if (!res.ok) throw new Error(text.fetchFailed)
      const json = await res.json()
      setData(json)
    } catch (_err) {
      toast({
        title: text.errorTitle,
        description: text.fetchFailed,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [businessId, text.errorTitle, text.fetchFailed, toast])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchCoachData()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [fetchCoachData])

  const handleCancelRequest = async (requestId: string) => {
    try {
      setCancelling(true)
      const res = await fetch('/api/athlete/coach-requests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      })
      if (!res.ok) throw new Error(text.cancelRequestFailed)
      toast({
        title: text.cancelRequestSuccessTitle,
        description: text.cancelRequestSuccessDescription,
      })
      await fetchCoachData()
    } catch (_err) {
      toast({
        title: text.errorTitle,
        description: text.cancelRequestFailed,
        variant: 'destructive',
      })
    } finally {
      setCancelling(false)
    }
  }

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      setInvitationActionLoading(invitationId)
      const res = await fetch(`/api/business/${businessId}/coach-invitations/${invitationId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || text.acceptInvitationFallback)
      }
      toast({
        title: text.acceptInvitationSuccessTitle,
        description: text.acceptInvitationSuccessDescription,
      })
      await fetchCoachData()
    } catch (err: unknown) {
      toast({
        title: text.errorTitle,
        description: err instanceof Error ? err.message : text.acceptInvitationFailed,
        variant: 'destructive',
      })
    } finally {
      setInvitationActionLoading(null)
    }
  }

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      setInvitationActionLoading(invitationId)
      const res = await fetch(`/api/business/${businessId}/coach-invitations/${invitationId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error(text.rejectInvitationFailed)
      toast({
        title: text.rejectInvitationSuccessTitle,
        description: text.rejectInvitationSuccessDescription,
      })
      await fetchCoachData()
    } catch {
      toast({
        title: text.errorTitle,
        description: text.rejectInvitationFailed,
        variant: 'destructive',
      })
    } finally {
      setInvitationActionLoading(null)
    }
  }

  const handleEndAgreement = async () => {
    if (!data?.coach) return
    try {
      setEnding(true)
      const res = await fetch(`/api/business/${businessId}/my-coach`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(text.endAgreementFailed)
      toast({
        title: text.endAgreementSuccessTitle,
        description: text.endAgreementSuccessDescription,
      })
      await fetchCoachData()
    } catch (_err) {
      toast({
        title: text.errorTitle,
        description: text.endAgreementFailed,
        variant: 'destructive',
      })
    } finally {
      setEnding(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <h1 className="text-2xl font-bold text-white mb-6">{text.pageTitle}</h1>
        <div className="space-y-4">
          <div className="animate-pulse bg-white/5 rounded-lg h-48" />
          <div className="animate-pulse bg-white/5 rounded-lg h-32" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-6">{text.pageTitle}</h1>

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
                <span>{text.active}</span>
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
                  {text.connectedSince} {formatDate(data.coach.connectedSince, locale)}
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
                    {text.endCollaboration}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-950 border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">{text.endCollaborationQuestion}</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                      {text.endCollaborationDescription(data.coach.name)}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700">
                      {text.cancel}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleEndAgreement}
                      disabled={ending}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      {ending ? text.ending : text.confirmEnd}
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
                <span>{text.pendingResponse}</span>
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
                {text.requestSent} {formatDate(data.pendingRequest.createdAt, locale)}
              </span>
            </div>

            {data.pendingRequest.message && (
              <div className="bg-white/5 rounded-lg p-3 text-sm text-slate-300">
                <span className="text-slate-500 block mb-1">{text.yourMessage}</span>
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
                {cancelling ? text.canceling : text.cancelRequest}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coach invitations (shown when athlete has no active coach) */}
      {!data?.coach && data?.coachInvitations && data.coachInvitations.length > 0 && (
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            {text.coachInvitations}
          </h2>
          {data.coachInvitations.map((invitation) => (
            <Card key={invitation.id} className="bg-slate-900/50 border-blue-500/20">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                      {invitation.coach.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-xl text-white">
                        {invitation.coach.name}
                      </CardTitle>
                      {invitation.coach.coachProfile?.headline && (
                        <p className="text-sm text-slate-400 mt-1">
                          {invitation.coach.coachProfile.headline}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-400">
                    <Mail className="w-4 h-4" />
                    <span>{text.invitation}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {invitation.coach.coachProfile?.specialties &&
                  (invitation.coach.coachProfile.specialties as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(invitation.coach.coachProfile.specialties as string[]).map((specialty) => (
                        <Badge
                          key={specialty}
                          className="bg-blue-500/10 text-blue-400 border-blue-500/20"
                        >
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  )}

                {invitation.message && (
                  <div className="bg-white/5 rounded-lg p-3 text-sm text-slate-300">
                    <span className="text-slate-500 block mb-1">{text.messageFromCoach}</span>
                    {invitation.message}
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span>
                    {text.sent} {formatDate(invitation.requestedAt, locale)}
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <Button
                    onClick={() => handleAcceptInvitation(invitation.id)}
                    disabled={invitationActionLoading === invitation.id}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {invitationActionLoading === invitation.id ? text.accepting : text.accept}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRejectInvitation(invitation.id)}
                    disabled={invitationActionLoading === invitation.id}
                    className="border-white/10 text-slate-300 hover:bg-white/5"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {text.reject}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
                {text.noCoachTitle}
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                {text.noCoachDescription}
              </p>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-orange-500" />
              {text.availableCoaches}
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
