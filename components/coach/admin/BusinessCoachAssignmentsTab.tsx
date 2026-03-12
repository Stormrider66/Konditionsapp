'use client'

import { useState, useEffect, useCallback } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  UserPlus,
  Users,
  Check,
  X,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  useBusinessAdminContext,
  useBusinessAdminHeaders,
} from '@/components/coach/admin/BusinessAdminContext'

// ---------- Types ----------

interface CoachRequest {
  id: string
  athleteName: string
  athleteEmail: string
  message: string | null
  createdAt: string
}

interface UnassignedAthlete {
  id: string
  name: string | null
  email: string
  sport: string | null
}

interface Coach {
  id: string
  name: string | null
  email: string
  athleteCount: number
}

interface CoachSummary {
  id: string
  name: string | null
  email: string
  athleteCount: number
}

// ---------- Component ----------

export function BusinessCoachAssignmentsTab() {
  const { businessId } = useBusinessAdminContext()
  const businessHeaders = useBusinessAdminHeaders()

  // Pending requests
  const [requests, setRequests] = useState<CoachRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [requestActionLoading, setRequestActionLoading] = useState<string | null>(null)

  // Unassigned athletes
  const [unassigned, setUnassigned] = useState<UnassignedAthlete[]>([])
  const [unassignedLoading, setUnassignedLoading] = useState(true)

  // Coaches
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [coachesLoading, setCoachesLoading] = useState(true)

  // Coach summaries (current assignments)
  const [coachSummaries, setCoachSummaries] = useState<CoachSummary[]>([])

  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedAthlete, setSelectedAthlete] = useState<UnassignedAthlete | null>(null)
  const [selectedCoachId, setSelectedCoachId] = useState<string>('')
  const [assignLoading, setAssignLoading] = useState(false)

  // Errors
  const [error, setError] = useState<string | null>(null)

  // ---------- Fetch functions ----------

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true)
    try {
      const res = await fetch(
        `/api/business/${businessId}/coach-requests?status=PENDING`,
        { headers: businessHeaders }
      )
      if (!res.ok) throw new Error('Failed to fetch requests')
      const data = await res.json()
      const rawRequests = data.requests ?? []
      setRequests(
        rawRequests.map((r: any) => ({
          id: r.id,
          athleteName: r.athlete?.name || 'Unknown',
          athleteEmail: r.athlete?.email || '',
          message: r.message,
          createdAt: r.requestedAt || r.createdAt,
        }))
      )
    } catch {
      setRequests([])
    } finally {
      setRequestsLoading(false)
    }
  }, [businessId, businessHeaders])

  const fetchUnassigned = useCallback(async () => {
    setUnassignedLoading(true)
    try {
      const res = await fetch(
        `/api/business/${businessId}/athletes/unassigned`,
        { headers: businessHeaders }
      )
      if (!res.ok) throw new Error('Failed to fetch unassigned athletes')
      const data = await res.json()
      const rawAthletes = data.athletes ?? []
      setUnassigned(
        rawAthletes.map((a: any) => ({
          id: a.id,
          name: a.name || null,
          email: a.email || '',
          sport: a.sportProfile?.primarySport || null,
        }))
      )
    } catch {
      setUnassigned([])
    } finally {
      setUnassignedLoading(false)
    }
  }, [businessId, businessHeaders])

  const fetchCoaches = useCallback(async () => {
    setCoachesLoading(true)
    try {
      const res = await fetch(
        `/api/business/${businessId}/coaches`,
        { headers: businessHeaders }
      )
      if (!res.ok) throw new Error('Failed to fetch coaches')
      const data = await res.json()
      const rawCoaches = data.coaches ?? []
      const coachList: Coach[] = rawCoaches.map((c: any) => ({
        id: c.id,
        name: c.name || null,
        email: c.email || '',
        athleteCount: 0, // Will be enriched below
      }))
      setCoaches(coachList)
      setCoachSummaries(coachList)
    } catch {
      setCoaches([])
      setCoachSummaries([])
    } finally {
      setCoachesLoading(false)
    }
  }, [businessId, businessHeaders])

  useEffect(() => {
    fetchRequests()
    fetchUnassigned()
    fetchCoaches()
  }, [fetchRequests, fetchUnassigned, fetchCoaches])

  // ---------- Actions ----------

  const handleAcceptRequest = async (requestId: string) => {
    setRequestActionLoading(requestId)
    setError(null)
    try {
      const res = await fetch(
        `/api/business/${businessId}/coach-requests/${requestId}/accept`,
        {
          method: 'POST',
          headers: businessHeaders,
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Kunde inte acceptera förfrågan')
      }
      // Refresh all sections
      fetchRequests()
      fetchUnassigned()
      fetchCoaches()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel')
    } finally {
      setRequestActionLoading(null)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    setRequestActionLoading(requestId)
    setError(null)
    try {
      const res = await fetch(
        `/api/business/${businessId}/coach-requests/${requestId}/reject`,
        {
          method: 'POST',
          headers: businessHeaders,
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Kunde inte avvisa förfrågan')
      }
      fetchRequests()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel')
    } finally {
      setRequestActionLoading(null)
    }
  }

  const openAssignDialog = (athlete: UnassignedAthlete) => {
    setSelectedAthlete(athlete)
    setSelectedCoachId('')
    setAssignDialogOpen(true)
  }

  const handleAssignAthlete = async () => {
    if (!selectedAthlete || !selectedCoachId) return
    setAssignLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/business/${businessId}/assign-athlete`,
        {
          method: 'POST',
          headers: {
            ...businessHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            athleteClientId: selectedAthlete.id,
            coachUserId: selectedCoachId,
          }),
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Kunde inte tilldela coach')
      }
      setAssignDialogOpen(false)
      setSelectedAthlete(null)
      setSelectedCoachId('')
      // Refresh
      fetchUnassigned()
      fetchCoaches()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel')
    } finally {
      setAssignLoading(false)
    }
  }

  // ---------- Loading spinner ----------

  const Spinner = () => (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  )

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Global error banner */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Section A: Pending Coach Requests */}
      <Card className="bg-white dark:bg-slate-900/50 border dark:border-white/10">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-sm">Väntande coach-förfrågningar</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {requestsLoading ? (
            <Spinner />
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Inga väntande förfrågningar
            </p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-lg border dark:border-white/10"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {req.athleteName}
                    </p>
                    <p className="text-xs text-muted-foreground">{req.athleteEmail}</p>
                    {req.message && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        &quot;{req.message}&quot;
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(req.createdAt), 'yyyy-MM-dd')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-200 hover:bg-green-50 dark:border-green-900/30 dark:hover:bg-green-950/20"
                      disabled={requestActionLoading === req.id}
                      onClick={() => handleAcceptRequest(req.id)}
                    >
                      {requestActionLoading === req.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Acceptera
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-950/20"
                      disabled={requestActionLoading === req.id}
                      onClick={() => handleRejectRequest(req.id)}
                    >
                      {requestActionLoading === req.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Avvisa
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section B: Unassigned Athletes */}
      <Card className="bg-white dark:bg-slate-900/50 border dark:border-white/10">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-sm">Ej tilldelade atleter</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {unassignedLoading ? (
            <Spinner />
          ) : unassigned.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Alla atleter har en coach
            </p>
          ) : (
            <div className="space-y-2">
              {unassigned.map((athlete) => (
                <div
                  key={athlete.id}
                  className="flex items-center justify-between p-3 rounded-lg border dark:border-white/10"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted dark:bg-white/10">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {athlete.name || athlete.email}
                      </p>
                      {athlete.name && (
                        <p className="text-xs text-muted-foreground">{athlete.email}</p>
                      )}
                      {athlete.sport && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {athlete.sport}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-4 shrink-0"
                    onClick={() => openAssignDialog(athlete)}
                  >
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Tilldela coach
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Coach Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tilldela coach</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground">Atlet</p>
              <p className="font-medium text-sm">
                {selectedAthlete?.name || selectedAthlete?.email}
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Välj coach</p>
              {coachesLoading ? (
                <Spinner />
              ) : coaches.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Inga coaches tillgängliga
                </p>
              ) : (
                <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj en coach..." />
                  </SelectTrigger>
                  <SelectContent>
                    {coaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.name || coach.email}{' '}
                        <span className="text-muted-foreground">
                          ({coach.athleteCount} atleter)
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Avbryt
            </Button>
            <Button
              onClick={handleAssignAthlete}
              disabled={!selectedCoachId || assignLoading}
            >
              {assignLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Tilldela
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section C: Current Assignments Overview */}
      <Card className="bg-white dark:bg-slate-900/50 border dark:border-white/10">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-sm">Nuvarande tilldelningar</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {coachesLoading ? (
            <Spinner />
          ) : coachSummaries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Inga coaches i verksamheten
            </p>
          ) : (
            <div className="space-y-2">
              {coachSummaries.map((coach) => (
                <div
                  key={coach.id}
                  className="flex items-center justify-between p-3 rounded-lg border dark:border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted dark:bg-white/10">
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {coach.name || coach.email}
                      </p>
                      {coach.name && (
                        <p className="text-xs text-muted-foreground">{coach.email}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {coach.athleteCount} {coach.athleteCount === 1 ? 'atlet' : 'atleter'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
