// components/coach/videos/MatchReviewTable.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  X,
  Play,
  Search,
  Filter,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

interface VideoMatch {
  id: string
  videoId: string
  videoTitle: string
  videoUrl: string
  thumbnailUrl: string | null
  duration: string | null
  exerciseId: string | null
  exerciseName: string | null
  matchScore: number | null
  matchMethod: string | null
  status: string
}

interface Exercise {
  id: string
  name: string
  nameSv: string | null
  biomechanicalPillar: string | null
}

interface MatchReviewTableProps {
  importId: string
  onApplyComplete: () => void
}

export function MatchReviewTable({ importId, onApplyComplete }: MatchReviewTableProps) {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState<VideoMatch[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [applying, setApplying] = useState(false)
  const [bulkApproving, setBulkApproving] = useState(false)

  // Exercise assignment dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [matchToAssign, setMatchToAssign] = useState<VideoMatch | null>(null)
  const [exerciseSearch, setExerciseSearch] = useState('')

  // Video preview dialog
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [previewMatch, setPreviewMatch] = useState<VideoMatch | null>(null)

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const response = await fetch(`/api/video-imports/${importId}/matches?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Misslyckades med att hämta matchningar')
      }

      setMatches(result.data)
    } catch (error: unknown) {
      console.error('Error fetching matches:', error)
      toast({
        title: 'Kunde inte hämta matchningar',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [importId, statusFilter, toast])

  const fetchExercises = useCallback(async () => {
    try {
      const response = await fetch('/api/exercises?limit=200')
      const result = await response.json()

      if (response.ok && result.data) {
        setExercises(result.data)
      }
    } catch (error) {
      console.error('Error fetching exercises:', error)
    }
  }, [])

  useEffect(() => {
    fetchMatches()
    fetchExercises()
  }, [fetchMatches, fetchExercises])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendingIds = matches
        .filter((m) => m.status === 'PENDING')
        .map((m) => m.id)
      setSelectedIds(new Set(pendingIds))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds)
    if (checked) {
      newSet.add(id)
    } else {
      newSet.delete(id)
    }
    setSelectedIds(newSet)
  }

  const handleApprove = async (matchId: string) => {
    try {
      const response = await fetch(`/api/video-imports/${importId}/matches`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{ matchId, status: 'APPROVED' }],
        }),
      })

      if (!response.ok) {
        throw new Error('Misslyckades med att godkänna')
      }

      await fetchMatches()
      toast({ title: 'Matchning godkänd' })
    } catch (error: unknown) {
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Kunde inte godkänna',
        variant: 'destructive',
      })
    }
  }

  const handleReject = async (matchId: string) => {
    try {
      const response = await fetch(`/api/video-imports/${importId}/matches`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{ matchId, status: 'REJECTED' }],
        }),
      })

      if (!response.ok) {
        throw new Error('Misslyckades med att avvisa')
      }

      await fetchMatches()
      toast({ title: 'Matchning avvisad' })
    } catch (error: unknown) {
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Kunde inte avvisa',
        variant: 'destructive',
      })
    }
  }

  const handleBulkApprove = async (minScore: number = 0.9) => {
    try {
      setBulkApproving(true)
      const response = await fetch(`/api/video-imports/${importId}/matches`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_all',
          minScore,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Misslyckades med att godkänna')
      }

      await fetchMatches()
      toast({
        title: 'Bulk-godkännande klart',
        description: result.message,
      })
    } catch (error: unknown) {
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Kunde inte godkänna',
        variant: 'destructive',
      })
    } finally {
      setBulkApproving(false)
    }
  }

  const handleApplyApproved = async () => {
    try {
      setApplying(true)
      const response = await fetch(`/api/video-imports/${importId}/apply`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Misslyckades med att applicera')
      }

      await fetchMatches()
      onApplyComplete()
      toast({
        title: 'Videor applicerade!',
        description: result.message,
      })
    } catch (error: unknown) {
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Kunde inte applicera',
        variant: 'destructive',
      })
    } finally {
      setApplying(false)
    }
  }

  const handleAssignExercise = async (exerciseId: string) => {
    if (!matchToAssign) return

    try {
      const response = await fetch(`/api/video-imports/${importId}/matches`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{ matchId: matchToAssign.id, exerciseId, status: 'APPROVED' }],
        }),
      })

      if (!response.ok) {
        throw new Error('Misslyckades med att tilldela')
      }

      await fetchMatches()
      setAssignDialogOpen(false)
      setMatchToAssign(null)
      toast({ title: 'Övning tilldelad och godkänd' })
    } catch (error: unknown) {
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Kunde inte tilldela',
        variant: 'destructive',
      })
    }
  }

  const getScoreBadge = (score: number | null) => {
    if (score === null) return null

    const percentage = Math.round(score * 100)
    if (score >= 0.9) {
      return (
        <Badge variant="default" className="bg-green-600">
          {percentage}%
        </Badge>
      )
    } else if (score >= 0.7) {
      return (
        <Badge variant="default" className="bg-yellow-600">
          {percentage}%
        </Badge>
      )
    } else if (score >= 0.5) {
      return (
        <Badge variant="default" className="bg-orange-600">
          {percentage}%
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary">
          {percentage}%
        </Badge>
      )
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Godkänd
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Avvisad
          </Badge>
        )
      case 'APPLIED':
        return (
          <Badge variant="default" className="bg-blue-600">
            <Sparkles className="h-3 w-3 mr-1" />
            Applicerad
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Väntande
          </Badge>
        )
    }
  }

  const pendingCount = matches.filter((m) => m.status === 'PENDING').length
  const approvedCount = matches.filter((m) => m.status === 'APPROVED').length
  const highConfidenceCount = matches.filter(
    (m) => m.status === 'PENDING' && m.matchScore && m.matchScore >= 0.9
  ).length

  const filteredExercises = exercises.filter((ex) => {
    const search = exerciseSearch.toLowerCase()
    return (
      ex.name.toLowerCase().includes(search) ||
      (ex.nameSv && ex.nameSv.toLowerCase().includes(search))
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Granska matchningar</CardTitle>
            <CardDescription>
              {matches.length} videor • {pendingCount} väntande • {approvedCount} godkända
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla</SelectItem>
                <SelectItem value="pending">Väntande</SelectItem>
                <SelectItem value="approved">Godkända</SelectItem>
                <SelectItem value="rejected">Avvisade</SelectItem>
                <SelectItem value="applied">Applicerade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Bulk Actions */}
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkApprove(0.9)}
            disabled={bulkApproving || highConfidenceCount === 0}
          >
            {bulkApproving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Godkänn alla &gt;90% ({highConfidenceCount})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkApprove(0.7)}
            disabled={bulkApproving}
          >
            Godkänn alla &gt;70%
          </Button>
          <div className="flex-1" />
          <Button
            onClick={handleApplyApproved}
            disabled={applying || approvedCount === 0}
          >
            {applying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Applicera godkända ({approvedCount})
          </Button>
        </div>

        {/* Match List */}
        <div className="space-y-2">
          {matches.map((match) => (
            <div
              key={match.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition"
            >
              {/* Checkbox (for pending only) */}
              {match.status === 'PENDING' && (
                <Checkbox
                  checked={selectedIds.has(match.id)}
                  onCheckedChange={(checked) =>
                    handleSelectOne(match.id, checked as boolean)
                  }
                  className="hidden sm:flex"
                />
              )}

              {/* Thumbnail */}
              <div
                className="relative w-full sm:w-32 aspect-video sm:aspect-[16/9] flex-shrink-0 rounded-md overflow-hidden bg-muted cursor-pointer group"
                onClick={() => {
                  setPreviewMatch(match)
                  setPreviewDialogOpen(true)
                }}
              >
                {match.thumbnailUrl ? (
                  <Image
                    src={match.thumbnailUrl}
                    alt={match.videoTitle}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Play className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Play className="h-8 w-8 text-white" />
                </div>
                {match.duration && (
                  <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                    {match.duration}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{match.videoTitle}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {match.exerciseName ? (
                    <span className="text-sm text-muted-foreground">
                      → {match.exerciseName}
                    </span>
                  ) : (
                    <span className="text-sm text-orange-600">Ingen matchning</span>
                  )}
                  {getScoreBadge(match.matchScore)}
                  {getStatusBadge(match.status)}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 sm:gap-2">
                {match.status === 'PENDING' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleApprove(match.id)}
                      disabled={!match.exerciseId}
                      title={match.exerciseId ? 'Godkänn' : 'Tilldela först'}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReject(match.id)}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMatchToAssign(match)
                        setExerciseSearch('')
                        setAssignDialogOpen(true)
                      }}
                    >
                      <Search className="h-4 w-4 mr-1" />
                      Tilldela
                    </Button>
                  </>
                )}
                {match.status === 'APPLIED' && (
                  <a
                    href={match.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}

          {matches.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Inga matchningar hittades</p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Exercise Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tilldela övning</DialogTitle>
            <DialogDescription>
              Välj vilken övning som ska kopplas till videon &quot;{matchToAssign?.videoTitle}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök övningar..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {filteredExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => handleAssignExercise(exercise.id)}
                    className="w-full text-left p-2 rounded-md hover:bg-muted transition"
                  >
                    <p className="font-medium text-sm">{exercise.name}</p>
                    {exercise.nameSv && exercise.nameSv !== exercise.name && (
                      <p className="text-xs text-muted-foreground">{exercise.nameSv}</p>
                    )}
                    {exercise.biomechanicalPillar && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {exercise.biomechanicalPillar.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </button>
                ))}

                {filteredExercises.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Inga övningar hittades
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewMatch?.videoTitle}</DialogTitle>
          </DialogHeader>
          {previewMatch && (
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${previewMatch.videoId}`}
                title={previewMatch.videoTitle}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
