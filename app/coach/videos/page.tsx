// app/coach/videos/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Video,
  Upload,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Eye,
  ListVideo,
  Film,
  Link2,
  ChevronRight,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PlaylistImportDialog } from '@/components/coach/videos/PlaylistImportDialog'
import { MatchReviewTable } from '@/components/coach/videos/MatchReviewTable'

interface VideoImportStats {
  pending: number
  approved: number
  rejected: number
  applied: number
}

interface VideoImport {
  id: string
  playlistId: string
  playlistTitle: string | null
  playlistUrl: string | null
  status: string
  errorMessage: string | null
  totalVideos: number
  matchedVideos: number
  appliedVideos: number
  createdAt: string
  completedAt: string | null
  stats: VideoImportStats
  _count: {
    matches: number
  }
}

export default function CoachVideosPage() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [imports, setImports] = useState<VideoImport[]>([])
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [importToDelete, setImportToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchImports = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/video-imports')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Misslyckades med att hämta importeringar')
      }

      setImports(result.data)
    } catch (error: unknown) {
      console.error('Error fetching imports:', error)
      toast({
        title: 'Kunde inte hämta importeringar',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchImports()
  }, [fetchImports])

  const handleDeleteImport = async () => {
    if (!importToDelete) return

    try {
      setDeleting(true)
      const response = await fetch(`/api/video-imports/${importToDelete}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Misslyckades med att ta bort import')
      }

      toast({
        title: 'Import borttagen',
        description: 'Importen och alla matchningar har tagits bort.',
      })

      // Clear selection if deleted
      if (selectedImportId === importToDelete) {
        setSelectedImportId(null)
      }

      await fetchImports()
    } catch (error: unknown) {
      console.error('Error deleting import:', error)
      toast({
        title: 'Kunde inte ta bort import',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setImportToDelete(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Slutförd
          </Badge>
        )
      case 'PROCESSING':
        return (
          <Badge variant="default" className="bg-blue-600">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Bearbetar
          </Badge>
        )
      case 'FAILED':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Misslyckad
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

  // Calculate overall statistics
  const totalVideos = imports.reduce((sum, imp) => sum + imp.totalVideos, 0)
  const totalMatched = imports.reduce((sum, imp) => sum + imp.matchedVideos, 0)
  const totalApplied = imports.reduce((sum, imp) => sum + imp.appliedVideos, 0)
  const totalPending = imports.reduce((sum, imp) => sum + (imp.stats?.pending || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6">
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Video className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              Videohantering
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Importera och hantera övningsvideor från YouTube
            </p>
          </div>
          <Button
            onClick={() => setImportDialogOpen(true)}
            className="w-full sm:w-auto min-h-[44px]"
          >
            <Upload className="h-4 w-4 mr-2" />
            Importera från spellista
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Film className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Totalt videor</p>
                <p className="text-xl font-bold">{totalVideos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Link2 className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Matchade</p>
                <p className="text-xl font-bold">{totalMatched}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Väntar</p>
                <p className="text-xl font-bold">{totalPending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Applicerade</p>
                <p className="text-xl font-bold">{totalApplied}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedImportId ? (
        // Show Match Review Table
        <div>
          <Button
            variant="ghost"
            onClick={() => setSelectedImportId(null)}
            className="mb-4"
          >
            <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
            Tillbaka till importlistan
          </Button>
          <MatchReviewTable
            importId={selectedImportId}
            onApplyComplete={() => {
              fetchImports()
            }}
          />
        </div>
      ) : (
        // Show Import List
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ListVideo className="h-5 w-5" />
              Importeringar
            </CardTitle>
            <CardDescription>
              Hantera dina importerade YouTube-spellistor
            </CardDescription>
          </CardHeader>
          <CardContent>
            {imports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Inga importeringar ännu</p>
                <p className="text-sm mb-4">
                  Börja med att importera en YouTube-spellista med övningsvideor
                </p>
                <Button onClick={() => setImportDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importera spellista
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {imports.map((imp) => (
                  <div
                    key={imp.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">
                          {imp.playlistTitle || 'Okänd spellista'}
                        </h3>
                        {getStatusBadge(imp.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>{imp.totalVideos} videor</span>
                        <span>{imp.matchedVideos} matchade</span>
                        {imp.stats && (
                          <>
                            <span className="text-orange-600">
                              {imp.stats.pending} väntar
                            </span>
                            <span className="text-green-600">
                              {imp.stats.applied} applicerade
                            </span>
                          </>
                        )}
                        <span>
                          {format(new Date(imp.createdAt), 'PPp', { locale: sv })}
                        </span>
                      </div>
                      {imp.errorMessage && (
                        <p className="text-sm text-destructive mt-1">
                          {imp.errorMessage}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedImportId(imp.id)}
                        disabled={imp.status !== 'COMPLETED'}
                        className="min-h-[36px]"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Granska
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setImportToDelete(imp.id)
                          setDeleteDialogOpen(true)
                        }}
                        className="min-h-[36px] text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Dialog */}
      <PlaylistImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={() => {
          fetchImports()
          setImportDialogOpen(false)
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort import?</AlertDialogTitle>
            <AlertDialogDescription>
              Detta kommer att ta bort importen och alla tillhörande matchningar.
              Videor som redan har applicerats på övningar påverkas inte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteImport}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Tar bort...
                </>
              ) : (
                'Ta bort'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
