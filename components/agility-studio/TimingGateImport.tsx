'use client'

// components/agility-studio/TimingGateImport.tsx
// Timing gate data import and session management

import { useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Upload,
  FileSpreadsheet,
  Timer,
  Users,
  Check,
  X,
  AlertCircle,
  Trash2,
  Eye
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { TimingGateSession, TimingGateSource } from '@/types'

interface Athlete {
  id: string
  name: string
  email?: string | null
  teamId?: string | null
}

interface TimingGateImportProps {
  sessions: (TimingGateSession & { _count: { results: number } })[]
  athletes: Athlete[]
  onSessionCreated: (session: TimingGateSession & { _count: { results: number } }) => void
}

interface ParsedResult {
  athleteName?: string
  athleteId?: string
  splitTimes: number[]
  totalTime: number
  attemptNumber: number
  valid: boolean
}

interface ImportPreview {
  sessionName: string
  sessionDate: string
  format: TimingGateSource
  gateCount: number
  intervalDistances: number[]
  results: ParsedResult[]
}

const formatLabels: Record<TimingGateSource, string> = {
  CSV_IMPORT: 'Generic CSV',
  BROWER: 'Brower',
  FREELAP: 'Freelap',
  WITTY: 'Witty',
  VALD_API: 'VALD',
  MANUAL: 'Manual Entry'
}

export function TimingGateImport({
  sessions,
  athletes,
  onSessionCreated
}: TimingGateImportProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<(TimingGateSession & { _count: { results: number } }) | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<TimingGateSource>('CSV_IMPORT')
  const [dragActive, setDragActive] = useState(false)
  const [importing, setImporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [athleteMatches, setAthleteMatches] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      await processFile(files[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFormat])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      await processFile(files[0])
    }
  }

  const processFile = async (file: File) => {
    setError(null)
    setImporting(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('format', selectedFormat)

      const response = await fetch('/api/timing-gates/import', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to parse file')
      }

      const data = await response.json()
      setImportPreview(data)

      // Auto-match athletes by name
      const matches: Record<string, string> = {}
      data.results.forEach((result: ParsedResult) => {
        if (result.athleteName) {
          const match = athletes.find(
            a => a.name.toLowerCase() === result.athleteName?.toLowerCase()
          )
          if (match) {
            matches[result.athleteName] = match.id
          }
        }
      })
      setAthleteMatches(matches)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file')
    } finally {
      setImporting(false)
    }
  }

  const handleImport = async () => {
    if (!importPreview) return

    setImporting(true)
    try {
      // Create session with matched athletes
      const resultsWithAthletes = importPreview.results.map(result => ({
        ...result,
        athleteId: result.athleteName ? athleteMatches[result.athleteName] : undefined
      }))

      const response = await fetch('/api/timing-gates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionName: importPreview.sessionName,
          sessionDate: importPreview.sessionDate,
          importSource: importPreview.format,
          gateCount: importPreview.gateCount,
          intervalDistances: importPreview.intervalDistances,
          results: resultsWithAthletes
        })
      })

      if (!response.ok) throw new Error('Failed to create session')

      const session = await response.json()
      onSessionCreated(session)
      setImportDialogOpen(false)
      setImportPreview(null)
      setAthleteMatches({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data')
    } finally {
      setImporting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedSession) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/timing-gates/${selectedSession.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete session')

      setDeleteDialogOpen(false)
      // Note: Parent should refresh sessions list
      window.location.reload()
    } catch (err) {
      console.error('Error deleting session:', err)
    } finally {
      setDeleting(false)
    }
  }

  const updateAthleteMatch = (athleteName: string, athleteId: string) => {
    setAthleteMatches(prev => ({
      ...prev,
      [athleteName]: athleteId
    }))
  }

  const matchedCount = importPreview
    ? importPreview.results.filter(r => r.athleteName && athleteMatches[r.athleteName]).length
    : 0

  return (
    <div className="space-y-6">
      {/* Header with Import Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Timing Gate Sessions</h2>
          <p className="text-sm text-muted-foreground">
            Import and manage speed testing data
          </p>
        </div>
        <Button onClick={() => setImportDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Import Data
        </Button>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Timer className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No timing sessions yet</h3>
          <p>Import timing gate data to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map(session => (
            <Card key={session.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <Badge variant="outline">
                    {formatLabels[session.importSource]}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedSession(session)
                        setDetailDialogOpen(true)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedSession(session)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg">
                  {session.sessionName || 'Timing Session'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    {format(new Date(session.sessionDate), 'PPP')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {session._count.results} results
                  </div>
                  {session.gateCount && (
                    <Badge variant="secondary">
                      {session.gateCount} gates
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Timing Data</DialogTitle>
            <DialogDescription>
              Upload a CSV file from your timing gate system
            </DialogDescription>
          </DialogHeader>

          {!importPreview ? (
            <div className="space-y-4 py-4">
              {/* Format Selector */}
              <div className="space-y-2">
                <Label>Timing System Format</Label>
                <Select
                  value={selectedFormat}
                  onValueChange={(v) => setSelectedFormat(v as TimingGateSource)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CSV_IMPORT">Auto-detect / Generic CSV</SelectItem>
                    <SelectItem value="BROWER">Brower Timing</SelectItem>
                    <SelectItem value="FREELAP">Freelap</SelectItem>
                    <SelectItem value="WITTY">Witty Timer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* File Drop Zone */}
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  Drop your CSV file here
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to browse
                </p>
                <Input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  id="file-upload"
                  onChange={handleFileSelect}
                />
                <Button asChild variant="outline">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Select File
                  </label>
                </Button>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {importing && (
                <div className="text-center text-muted-foreground">
                  Processing file...
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {/* Preview Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{importPreview.sessionName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {importPreview.results.length} results found
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {importPreview.gateCount} gates
                  </Badge>
                  <Badge variant={matchedCount === importPreview.results.length ? 'default' : 'secondary'}>
                    {matchedCount}/{importPreview.results.length} matched
                  </Badge>
                </div>
              </div>

              {/* Results Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Athlete</TableHead>
                      <TableHead>Match To</TableHead>
                      <TableHead>Splits</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Valid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.results.map((result, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {result.athleteName || `Athlete ${i + 1}`}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={result.athleteName ? athleteMatches[result.athleteName] || '' : ''}
                            onValueChange={(v) => result.athleteName && updateAthleteMatch(result.athleteName, v)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Select athlete" />
                            </SelectTrigger>
                            <SelectContent>
                              {athletes.map(athlete => (
                                <SelectItem key={athlete.id} value={athlete.id}>
                                  {athlete.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {result.splitTimes.map((split, j) => (
                              <Badge key={j} variant="secondary" className="text-xs">
                                {split.toFixed(2)}s
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {result.totalTime.toFixed(2)}s
                        </TableCell>
                        <TableCell>
                          {result.valid ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {importPreview ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportPreview(null)
                    setAthleteMatches({})
                    setError(null)
                  }}
                >
                  Back
                </Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? 'Importing...' : `Import ${importPreview.results.length} Results`}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                Cancel
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSession?.sessionName || 'Timing Session'}
            </DialogTitle>
            <DialogDescription>
              {selectedSession && format(new Date(selectedSession.sessionDate), 'PPP')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex gap-4 mb-4">
              <Badge variant="outline">
                {selectedSession && formatLabels[selectedSession.importSource]}
              </Badge>
              {selectedSession?.gateCount && (
                <Badge variant="secondary">
                  {selectedSession.gateCount} gates
                </Badge>
              )}
              <Badge variant="secondary">
                <Users className="h-3 w-3 mr-1" />
                {selectedSession?._count.results} results
              </Badge>
            </div>
            {selectedSession?.intervalDistances && selectedSession.intervalDistances.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Interval Distances</p>
                <div className="flex gap-2">
                  {selectedSession.intervalDistances.map((dist, i) => (
                    <Badge key={i} variant="outline">{dist}m</Badge>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              View detailed results and athlete matching in the full session view.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedSession?.sessionName || 'this session'}&quot;?
              This will also delete all associated results. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
