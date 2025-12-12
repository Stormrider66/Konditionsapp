'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { usePageContextOptional } from '@/components/ai-studio/PageContextProvider'
import { VideoUploader } from './VideoUploader'
import { VideoAnalysisCard } from './VideoAnalysisCard'
import {
  Video,
  Upload,
  Search,
  Filter,
  Loader2,
  VideoOff,
} from 'lucide-react'

interface Issue {
  issue: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  timestamp?: string
  description: string
}

interface Recommendation {
  priority: number
  recommendation: string
  explanation: string
}

interface VideoAnalysis {
  id: string
  videoUrl: string
  videoType: string
  status: string
  formScore: number | null
  aiAnalysis: string | null
  issuesDetected: Issue[] | null
  recommendations: Recommendation[] | null
  createdAt: string
  athlete: { id: string; name: string } | null
  exercise: { id: string; name: string; nameSv: string | null } | null
}

interface Athlete {
  id: string
  name: string
}

interface Exercise {
  id: string
  name: string
  nameSv: string | null
}

export function VideoAnalysisList() {
  const { toast } = useToast()
  const pageContextValue = usePageContextOptional()
  const [analyses, setAnalyses] = useState<VideoAnalysis[]>([])
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUploader, setShowUploader] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [athleteFilter, setAthleteFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Update page context when analyses change so FloatingAIChat can access them
  // Extract stable references to avoid infinite loops
  const setPageContext = pageContextValue?.setPageContext
  const clearPageContext = pageContextValue?.clearPageContext

  useEffect(() => {
    if (setPageContext && analyses.length > 0) {
      // Build a summary of video analyses for the AI
      const completedAnalyses = analyses.filter(a => a.status === 'COMPLETED')
      const summary = completedAnalyses.length > 0
        ? `${completedAnalyses.length} videoanalyser klara av ${analyses.length} totalt. ` +
          `Övningar: ${[...new Set(completedAnalyses.map(a => a.exercise?.nameSv || a.exercise?.name).filter(Boolean))].join(', ')}.`
        : `${analyses.length} videoanalyser laddade, ingen klar ännu.`

      setPageContext({
        type: 'video-analysis',
        title: 'Videoanalyser',
        summary,
        data: {
          totalAnalyses: analyses.length,
          completedCount: completedAnalyses.length,
          analyses: analyses.map(a => ({
            id: a.id,
            videoType: a.videoType,
            status: a.status,
            formScore: a.formScore,
            athleteName: a.athlete?.name || 'Okänd',
            exerciseName: a.exercise?.nameSv || a.exercise?.name || 'Okänd övning',
            issuesDetected: a.issuesDetected?.map(i => ({
              issue: i.issue,
              severity: i.severity,
              description: i.description,
            })) || [],
            recommendations: a.recommendations?.map(r => ({
              priority: r.priority,
              recommendation: r.recommendation,
              explanation: r.explanation,
            })) || [],
            aiAnalysis: a.aiAnalysis,
            createdAt: a.createdAt,
          })),
        },
      })
    }

    // Cleanup on unmount
    return () => {
      if (clearPageContext) {
        clearPageContext()
      }
    }
  }, [analyses, setPageContext, clearPageContext])

  const fetchAnalyses = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter && typeFilter !== 'all') params.set('videoType', typeFilter)
      if (athleteFilter && athleteFilter !== 'all') params.set('athleteId', athleteFilter)

      const response = await fetch(`/api/video-analysis?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte hämta analyser')
      }

      setAnalyses(data.analyses || [])
    } catch (error) {
      toast({
        title: 'Fel',
        description: error instanceof Error ? error.message : 'Kunde inte hämta analyser',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, typeFilter, athleteFilter, toast])

  const fetchAthletes = async () => {
    try {
      const response = await fetch('/api/clients?limit=100')
      const data = await response.json()
      if (data.clients) {
        setAthletes(data.clients.map((c: { id: string; name: string }) => ({
          id: c.id,
          name: c.name,
        })))
      }
    } catch (error) {
      console.error('Failed to fetch athletes:', error)
    }
  }

  const fetchExercises = async () => {
    try {
      const response = await fetch('/api/exercises?limit=100')
      const data = await response.json()
      if (data.exercises) {
        setExercises(data.exercises.map((e: { id: string; name: string; nameSv: string | null }) => ({
          id: e.id,
          name: e.name,
          nameSv: e.nameSv,
        })))
      }
    } catch (error) {
      console.error('Failed to fetch exercises:', error)
    }
  }

  useEffect(() => {
    fetchAnalyses()
    fetchAthletes()
    fetchExercises()
  }, [fetchAnalyses])

  // Filter analyses by search query
  const filteredAnalyses = analyses.filter((analysis) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      analysis.athlete?.name.toLowerCase().includes(query) ||
      analysis.exercise?.name.toLowerCase().includes(query) ||
      analysis.exercise?.nameSv?.toLowerCase().includes(query)
    )
  })

  const handleUploadComplete = () => {
    setShowUploader(false)
    fetchAnalyses()
  }

  const handleDelete = () => {
    fetchAnalyses()
  }

  const handleAnalysisComplete = () => {
    fetchAnalyses()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Video className="h-6 w-6" />
            Videoanalys
          </h1>
          <p className="text-muted-foreground mt-1">
            Ladda upp videos för AI-driven teknikanalys
          </p>
        </div>
        <Button onClick={() => setShowUploader(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Ladda upp video
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök på atlet eller övning..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla status</SelectItem>
              <SelectItem value="PENDING">Väntar</SelectItem>
              <SelectItem value="PROCESSING">Bearbetar</SelectItem>
              <SelectItem value="COMPLETED">Klara</SelectItem>
              <SelectItem value="FAILED">Misslyckade</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla typer</SelectItem>
              <SelectItem value="STRENGTH">Styrkeövning</SelectItem>
              <SelectItem value="RUNNING_GAIT">Löpteknik</SelectItem>
              <SelectItem value="SPORT_SPECIFIC">Sportspecifik</SelectItem>
            </SelectContent>
          </Select>

          <Select value={athleteFilter} onValueChange={setAthleteFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Atlet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla atleter</SelectItem>
              {athletes.map((athlete) => (
                <SelectItem key={athlete.id} value={athlete.id}>
                  {athlete.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredAnalyses.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <VideoOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Inga videoanalyser</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || athleteFilter !== 'all'
              ? 'Inga analyser matchar dina filter'
              : 'Ladda upp din första video för AI-analys'}
          </p>
          {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && athleteFilter === 'all' && (
            <Button onClick={() => setShowUploader(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Ladda upp video
            </Button>
          )}
        </div>
      )}

      {/* Analysis grid */}
      {!isLoading && filteredAnalyses.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAnalyses.map((analysis) => (
            <VideoAnalysisCard
              key={analysis.id}
              analysis={analysis}
              onDelete={handleDelete}
              onAnalysisComplete={handleAnalysisComplete}
            />
          ))}
        </div>
      )}

      {/* Upload dialog */}
      <VideoUploader
        open={showUploader}
        onClose={() => setShowUploader(false)}
        onUploadComplete={handleUploadComplete}
        athletes={athletes}
        exercises={exercises}
      />
    </div>
  )
}
