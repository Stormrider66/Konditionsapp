'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Target,
  Award,
  Calendar,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { sv, enUS } from 'date-fns/locale'

interface AthleteInfo {
  id: string
  name: string
  email: string | null
  gender: string
  age: number
  sport: string | null
  experience: string | null
  goal: string | null
  subscription: {
    tier: string
    status: string
  } | null
}

interface CoachRequest {
  id: string
  status: string
  message: string | null
  requestedAt: string
  respondedAt: string | null
  expiresAt: string
  isExpiringSoon: boolean
  athlete: AthleteInfo
}

interface Props {
  locale?: 'en' | 'sv'
}

export function CoachRequestsPanel({ locale = 'sv' }: Props) {
  const { toast } = useToast()
  const [requests, setRequests] = useState<CoachRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [selectedRequest, setSelectedRequest] = useState<CoachRequest | null>(null)
  const [responseMessage, setResponseMessage] = useState('')
  const [programAction, setProgramAction] = useState<string>('KEPT')
  const [isProcessing, setIsProcessing] = useState(false)
  const [dialogMode, setDialogMode] = useState<'accept' | 'reject' | null>(null)

  const t = (en: string, sv: string) => locale === 'sv' ? sv : en
  const dateLocale = locale === 'sv' ? sv : enUS

  const fetchRequests = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/coach/requests?status=${statusFilter}`)
      const data = await response.json()

      if (data.success) {
        setRequests(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [statusFilter])

  const handleAccept = async () => {
    if (!selectedRequest) return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/coach/requests/${selectedRequest.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: responseMessage || undefined,
          programAction,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: t('Request accepted', 'Förfrågan accepterad'),
          description: t(
            `${selectedRequest.athlete.name} is now connected to you.`,
            `${selectedRequest.athlete.name} är nu kopplad till dig.`
          ),
        })
        setDialogMode(null)
        setSelectedRequest(null)
        setResponseMessage('')
        fetchRequests()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: t('Error', 'Fel'),
        description: error instanceof Error ? error.message : t('Failed to accept request', 'Kunde inte acceptera förfrågan'),
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/coach/requests/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: responseMessage || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: t('Request rejected', 'Förfrågan avvisad'),
          description: t('The athlete has been notified.', 'Atleten har meddelats.'),
        })
        setDialogMode(null)
        setSelectedRequest(null)
        setResponseMessage('')
        fetchRequests()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: t('Error', 'Fel'),
        description: error instanceof Error ? error.message : t('Failed to reject request', 'Kunde inte avvisa förfrågan'),
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status: string, isExpiringSoon: boolean) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant={isExpiringSoon ? 'destructive' : 'secondary'}>
            {isExpiringSoon && <AlertCircle className="w-3 h-3 mr-1" />}
            {t('Pending', 'Väntande')}
          </Badge>
        )
      case 'ACCEPTED':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t('Accepted', 'Accepterad')}
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            {t('Rejected', 'Avvisad')}
          </Badge>
        )
      case 'EXPIRED':
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            {t('Expired', 'Utgången')}
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">{t('Pending', 'Väntande')}</SelectItem>
            <SelectItem value="ACCEPTED">{t('Accepted', 'Accepterade')}</SelectItem>
            <SelectItem value="REJECTED">{t('Rejected', 'Avvisade')}</SelectItem>
            <SelectItem value="all">{t('All', 'Alla')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {t('No requests found', 'Inga förfrågningar hittades')}
            </p>
            <p className="text-muted-foreground">
              {statusFilter === 'PENDING'
                ? t('You have no pending connection requests.', 'Du har inga väntande kontaktförfrågningar.')
                : t('No requests match your filter.', 'Inga förfrågningar matchar ditt filter.')
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map(request => (
            <Card key={request.id} className={request.isExpiringSoon ? 'border-orange-500' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback>
                        {request.athlete.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{request.athlete.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        {request.athlete.email}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(request.status, request.isExpiringSoon)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Athlete Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {request.athlete.sport && (
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      <span>{request.athlete.sport}</span>
                    </div>
                  )}
                  {request.athlete.experience && (
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-muted-foreground" />
                      <span>{request.athlete.experience}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{request.athlete.age} {t('years', 'år')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {formatDistanceToNow(new Date(request.requestedAt), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </span>
                  </div>
                </div>

                {/* Goal */}
                {request.athlete.goal && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">{t('Goal', 'Mål')}</p>
                    <p className="text-sm text-muted-foreground">{request.athlete.goal}</p>
                  </div>
                )}

                {/* Message */}
                {request.message && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">{t('Message', 'Meddelande')}</p>
                    <p className="text-sm text-muted-foreground">{request.message}</p>
                  </div>
                )}

                {/* Expiration Warning */}
                {request.status === 'PENDING' && request.isExpiringSoon && (
                  <div className="flex items-center gap-2 text-orange-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {t('Expires soon! Please respond.', 'Går ut snart! Svara snarast.')}
                  </div>
                )}

                {/* Actions */}
                {request.status === 'PENDING' && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => {
                        setSelectedRequest(request)
                        setDialogMode('accept')
                      }}
                      className="flex-1"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {t('Accept', 'Acceptera')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request)
                        setDialogMode('reject')
                      }}
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {t('Decline', 'Avvisa')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Accept Dialog */}
      <Dialog open={dialogMode === 'accept'} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('Accept Connection Request', 'Acceptera kontaktförfrågan')}
            </DialogTitle>
            <DialogDescription>
              {t(
                `Accept ${selectedRequest?.athlete.name} as your athlete. They will be added to your athlete list.`,
                `Acceptera ${selectedRequest?.athlete.name} som din atlet. De läggs till i din atletlista.`
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('Existing Program', 'Befintligt program')}
              </label>
              <Select value={programAction} onValueChange={setProgramAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KEPT">
                    {t('Keep their current program', 'Behåll deras nuvarande program')}
                  </SelectItem>
                  <SelectItem value="MODIFIED">
                    {t('Review and modify their program', 'Granska och modifiera deras program')}
                  </SelectItem>
                  <SelectItem value="REPLACED">
                    {t('Create a new program for them', 'Skapa ett nytt program för dem')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('Welcome Message (optional)', 'Välkomstmeddelande (valfritt)')}
              </label>
              <Textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder={t(
                  'Write a welcome message to your new athlete...',
                  'Skriv ett välkomstmeddelande till din nya atlet...'
                )}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              {t('Cancel', 'Avbryt')}
            </Button>
            <Button onClick={handleAccept} disabled={isProcessing}>
              {isProcessing ? t('Accepting...', 'Accepterar...') : t('Accept', 'Acceptera')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={dialogMode === 'reject'} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('Decline Connection Request', 'Avvisa kontaktförfrågan')}
            </DialogTitle>
            <DialogDescription>
              {t(
                `Are you sure you want to decline ${selectedRequest?.athlete.name}'s request?`,
                `Är du säker på att du vill avvisa ${selectedRequest?.athlete.name}s förfrågan?`
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('Response (optional)', 'Svar (valfritt)')}
              </label>
              <Textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder={t(
                  'Let them know why you cannot accept at this time...',
                  'Berätta varför du inte kan acceptera just nu...'
                )}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              {t('Cancel', 'Avbryt')}
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
              {isProcessing ? t('Declining...', 'Avvisar...') : t('Decline', 'Avvisa')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
