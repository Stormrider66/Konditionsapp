'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Building2,
  Trophy,
  Clock,
  Mail,
  Phone,
  Globe,
  MapPin,
  Users,
} from 'lucide-react'

interface Application {
  id: string
  type: string
  status: string
  contactName: string
  contactEmail: string
  contactPhone: string | null
  organizationName: string
  city: string | null
  country: string | null
  website: string | null
  description: string | null
  primarySport: string | null
  estimatedMembers: number | null
  estimatedCoaches: number | null
  reviewNotes: string | null
  createdAt: string
  business?: { id: string; name: string; slug: string } | null
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
}

export function ApplicationReviewPanel() {
  const { toast } = useToast()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('')
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [revenueShare, setRevenueShare] = useState(20)
  const [slug, setSlug] = useState('')

  const fetchApplications = useCallback(async () => {
    try {
      const url = filter
        ? `/api/business-applications?status=${filter}`
        : '/api/business-applications'
      const response = await fetch(url)
      const data = await response.json()
      setApplications(data.applications || [])
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch applications', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [filter, toast])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  const handleReview = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      setReviewingId(id)
      const response = await fetch(`/api/admin/business-applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reviewNotes,
          revenueShare,
          businessSlug: slug || undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to review')
      }

      toast({
        title: action === 'APPROVE' ? 'Approved' : 'Rejected',
        description: action === 'APPROVE'
          ? `Business created. Claim URL sent to applicant.`
          : 'Application rejected.',
      })

      setReviewNotes('')
      setSlug('')
      fetchApplications()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to review application',
        variant: 'destructive',
      })
    } finally {
      setReviewingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status || 'All'}
          </Button>
        ))}
      </div>

      {applications.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No applications found</p>
      )}

      {/* Application Cards */}
      {applications.map((app) => (
        <Card key={app.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {app.type === 'GYM' ? (
                  <Building2 className="h-5 w-5 text-purple-600" />
                ) : (
                  <Trophy className="h-5 w-5 text-amber-600" />
                )}
                <div>
                  <CardTitle className="text-lg">{app.organizationName}</CardTitle>
                  <p className="text-sm text-muted-foreground">{app.contactName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusColors[app.status]}>{app.status}</Badge>
                <Badge variant="outline">{app.type}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Contact Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <a href={`mailto:${app.contactEmail}`} className="text-blue-600 hover:underline truncate">
                  {app.contactEmail}
                </a>
              </div>
              {app.contactPhone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{app.contactPhone}</span>
                </div>
              )}
              {app.city && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{app.city}</span>
                </div>
              )}
              {app.website && (
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={app.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                    {app.website}
                  </a>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex gap-4 text-sm">
              {app.estimatedMembers && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{app.estimatedMembers} members</span>
                </div>
              )}
              {app.estimatedCoaches && (
                <span>{app.estimatedCoaches} coaches</span>
              )}
              {app.primarySport && (
                <span>Sport: {app.primarySport}</span>
              )}
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{new Date(app.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {app.description && (
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">{app.description}</p>
            )}

            {/* Review Actions */}
            {app.status === 'PENDING' && (
              <div className="space-y-3 pt-3 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Business Slug</label>
                    <input
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      placeholder={app.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Platform Share %</label>
                    <input
                      type="number"
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      value={revenueShare}
                      onChange={(e) => setRevenueShare(parseInt(e.target.value) || 20)}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Notes</label>
                    <input
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      placeholder="Review notes..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleReview(app.id, 'APPROVE')}
                    disabled={reviewingId === app.id}
                  >
                    {reviewingId === app.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReview(app.id, 'REJECT')}
                    disabled={reviewingId === app.id}
                  >
                    {reviewingId === app.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                    Reject
                  </Button>
                </div>
              </div>
            )}

            {/* Approved business info */}
            {app.business && (
              <div className="text-sm text-green-700 bg-green-50 p-3 rounded-md">
                Business created: <strong>{app.business.name}</strong> (/{app.business.slug})
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
