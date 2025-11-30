// components/coach/videos/PlaylistImportDialog.tsx
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  Youtube,
  CheckCircle2,
  AlertCircle,
  ListVideo,
  Link2,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface PlaylistImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

interface ImportResult {
  success: boolean
  data?: {
    id: string
    playlistTitle: string
    totalVideos: number
    matchedVideos: number
    matches: Array<{
      videoTitle: string
      exerciseName: string | null
      matchScore: number | null
      matchMethod: string | null
    }>
  }
  message?: string
  error?: string
}

type ImportStep = 'input' | 'importing' | 'complete' | 'error'

export function PlaylistImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: PlaylistImportDialogProps) {
  const { toast } = useToast()

  const [playlistUrl, setPlaylistUrl] = useState('')
  const [step, setStep] = useState<ImportStep>('input')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const resetDialog = () => {
    setPlaylistUrl('')
    setStep('input')
    setProgress(0)
    setResult(null)
    setErrorMessage('')
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      resetDialog()
    }
    onOpenChange(open)
  }

  const handleImport = async () => {
    if (!playlistUrl.trim()) {
      toast({
        title: 'Ange en URL',
        description: 'Du måste ange en YouTube-spellista URL',
        variant: 'destructive',
      })
      return
    }

    setStep('importing')
    setProgress(10)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 500)

      const response = await fetch('/api/video-imports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playlistUrl: playlistUrl.trim() }),
      })

      clearInterval(progressInterval)
      setProgress(100)

      const data: ImportResult = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Misslyckades med att importera spellista')
      }

      setResult(data)
      setStep('complete')

      toast({
        title: 'Import slutförd!',
        description: data.message || `Importerade ${data.data?.totalVideos} videor`,
      })
    } catch (error: unknown) {
      console.error('Import error:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Okänt fel')
      setStep('error')
    }
  }

  const handleComplete = () => {
    onImportComplete()
    resetDialog()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-600" />
            Importera från YouTube
          </DialogTitle>
          <DialogDescription>
            Klistra in en YouTube-spellista URL för att importera videor och
            automatiskt matcha dem med övningar.
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playlist-url">Spellista URL</Label>
              <Input
                id="playlist-url"
                placeholder="https://www.youtube.com/playlist?list=..."
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Spellistan måste vara offentlig eller olistad
              </p>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <h4 className="font-medium mb-2">Tips för bästa matchning:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Namnge videor med övningsnamnet på svenska</li>
                <li>• Systemet matchar automatiskt mot 84 övningar</li>
                <li>• Du kan manuellt justera matchningar efteråt</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Avbryt
              </Button>
              <Button onClick={handleImport} disabled={!playlistUrl.trim()}>
                <ListVideo className="h-4 w-4 mr-2" />
                Importera
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
            <div className="text-center">
              <p className="font-medium">Importerar spellista...</p>
              <p className="text-sm text-muted-foreground">
                Hämtar videor och matchar mot övningar
              </p>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {step === 'complete' && result?.data && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-center">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="text-center">
              <p className="font-medium text-lg">Import slutförd!</p>
              <p className="text-sm text-muted-foreground">
                {result.data.playlistTitle}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold">{result.data.totalVideos}</p>
                <p className="text-xs text-muted-foreground">Totalt videor</p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">
                  {result.data.matchedVideos}
                </p>
                <p className="text-xs text-muted-foreground">Auto-matchade</p>
              </div>
            </div>

            {result.data.matchedVideos > 0 && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Link2 className="h-4 w-4" />
                  Exempel på matchningar:
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {result.data.matches
                    .filter((m) => m.exerciseName)
                    .slice(0, 3)
                    .map((match, i) => (
                      <li key={i} className="truncate">
                        {match.videoTitle} → {match.exerciseName}
                        {match.matchScore && (
                          <span className="text-green-600 ml-1">
                            ({Math.round(match.matchScore * 100)}%)
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleComplete}>
                Granska matchningar
              </Button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <div className="text-center">
              <p className="font-medium text-lg text-destructive">
                Import misslyckades
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {errorMessage}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Stäng
              </Button>
              <Button onClick={() => setStep('input')}>Försök igen</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
