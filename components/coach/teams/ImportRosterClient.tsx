'use client'

/**
 * Roster Importer — client component.
 *
 * Step 1: drop a file OR paste text → /api/coach/teams/[teamId]/import-parse
 *         returns an array of athlete rows + warnings.
 * Step 2: preview editable table → user adjusts/deletes rows → submit to
 *         /api/coach/teams/[teamId]/members/bulk.
 *
 * Mirrors the program importer's UX (ImportProgramClient.tsx) so coaches
 * see a familiar flow whether they're importing a program or a roster.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertCircle,
  FileSpreadsheet,
  FileText,
  FileUp,
  ImageIcon,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import type { ModelIntent } from '@/types/ai-models'

type RosterRow = {
  name: string
  jerseyNumber?: number
  position?: string
  email?: string
  phone?: string
  birthDate?: string
  gender?: 'MALE' | 'FEMALE'
  height?: number
  weight?: number
  notes?: string
}

type ParseResponse = {
  success: true
  rows: RosterRow[]
  warnings: string[]
  modelUsed: string
  inputKind: 'text' | 'excel' | 'csv' | 'pdf' | 'image'
}

interface Props {
  teamId: string
  teamName: string
  teamPath: string
}

const ACCEPTED_FILE_EXTENSIONS =
  '.xlsx,.xls,.csv,.pdf,.txt,.md,.jpg,.jpeg,.png,.webp,.heic,.heif'

const IMAGE_REGEX = /\.(jpe?g|png|webp|heic|heif)$/i

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  return IMAGE_REGEX.test(file.name)
}

const INTENT_OPTIONS: { value: ModelIntent; label: string; hint: string }[] = [
  { value: 'fast', label: 'Snabb (billigast)', hint: 'Räcker för tydliga Excel-listor.' },
  { value: 'balanced', label: 'Balanserad (rekommenderas)', hint: 'Bäst kostnad/kvalitet för text, PDF och foton.' },
  { value: 'powerful', label: 'Kraftfull (bäst kvalitet)', hint: 'För röriga scan-PDF:er, handskriven whiteboard eller svårlästa foton.' },
]

export function ImportRosterClient({ teamId, teamName, teamPath }: Props) {
  const { toast } = useToast()
  const router = useRouter()

  const [tab, setTab] = useState<'paste' | 'upload'>('paste')
  const [pastedText, setPastedText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [intent, setIntent] = useState<ModelIntent>('balanced')

  // Generate object URL preview when an image file is selected
  useEffect(() => {
    if (file && isImageFile(file)) {
      const url = URL.createObjectURL(file)
      setFilePreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setFilePreview(null)
  }, [file])

  // Paste-from-clipboard: if the user pastes an image anywhere on the page
  // while the upload tab is active, grab it as the file.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (tab !== 'upload') return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const blob = item.getAsFile()
          if (blob) {
            const named = new File([blob], `inklistrad-${Date.now()}.png`, { type: blob.type })
            setFile(named)
            e.preventDefault()
            return
          }
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [tab])

  const [parsing, setParsing] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null)
  const [rows, setRows] = useState<RosterRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [createAthleteAccounts, setCreateAthleteAccounts] = useState(true)

  const dropRef = useRef<HTMLDivElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) setFile(f)
  }, [])

  const hasInput = tab === 'upload' ? !!file : pastedText.trim().length > 0

  const handleParse = async () => {
    setParsing(true)
    setParseError(null)
    setParseResult(null)
    setRows([])
    try {
      let response: Response
      if (tab === 'upload' && file) {
        const form = new FormData()
        form.append('file', file)
        form.append('intent', intent)
        response = await fetch(`/api/coach/teams/${teamId}/import-parse`, {
          method: 'POST',
          body: form,
        })
      } else {
        response = await fetch(`/api/coach/teams/${teamId}/import-parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: pastedText, intent }),
        })
      }

      const data = await response.json()
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Kunde inte tolka källan')
      }
      setParseResult(data as ParseResponse)
      setRows((data.rows as RosterRow[]) ?? [])

      const count = (data.rows as RosterRow[])?.length ?? 0
      if (count === 0) {
        toast({ title: 'Inga spelare hittades', description: data.warnings?.[0] ?? 'Pröva att rensa källan.', variant: 'destructive' })
      } else {
        toast({
          title: `Hittade ${count} spelare`,
          description: `Modell: ${data.modelUsed}. Granska innan du sparar.`,
        })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Okänt fel'
      setParseError(msg)
      toast({ title: 'Import misslyckades', description: msg, variant: 'destructive' })
    } finally {
      setParsing(false)
    }
  }

  const handleReset = () => {
    setParseResult(null)
    setRows([])
    setParseError(null)
    setPastedText('')
    setFile(null)
  }

  const updateRow = (idx: number, patch: Partial<RosterRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    const valid = rows.filter((r) => r.name.trim().length >= 2)
    if (valid.length === 0) {
      toast({ title: 'Inga giltiga rader', description: 'Varje rad behöver ett namn.', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const payload = valid.map((r) => ({
        ...r,
        createAthleteAccount: createAthleteAccounts,
      }))
      const res = await fetch(`/api/coach/teams/${teamId}/members/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Import misslyckades')

      const { summary } = data
      toast({
        title: `${summary.created} spelare tillagda`,
        description:
          summary.skipped || summary.errored
            ? `${summary.skipped} hoppade över, ${summary.errored} fel.`
            : `Lades till i ${teamName}`,
      })
      router.push(teamPath)
      router.refresh()
    } catch (e) {
      toast({
        title: 'Import misslyckades',
        description: e instanceof Error ? e.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {!parseResult ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              Steg 1 — Lämna in rostret
            </CardTitle>
            <CardDescription>
              Välj hur du vill lämna in det. Vi tolkar innehållet med AI och visar resultatet i en
              granskningstabell innan något sparas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'paste' | 'upload')}>
              <TabsList className="grid grid-cols-2 max-w-md">
                <TabsTrigger value="paste">
                  <FileText className="h-4 w-4 mr-1" />
                  Klistra in text
                </TabsTrigger>
                <TabsTrigger value="upload">
                  <FileUp className="h-4 w-4 mr-1" />
                  Ladda upp fil
                </TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="pt-4">
                <Textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  rows={14}
                  placeholder={`Klistra in laguppställningen.\n\nT.ex.\n1  Anna Svensson   Målvakt\n27 Johan Berg     Center\n7  Lisa Nilsson    Back\n...`}
                  className="font-mono text-sm"
                />
              </TabsContent>

              <TabsContent value="upload" className="pt-4">
                <div
                  ref={dropRef}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                    isDragging
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                      : 'border-slate-300 dark:border-slate-700'
                  )}
                >
                  {file ? (
                    <div className="flex items-center justify-between gap-3 text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        {filePreview ? (
                          <img
                            src={filePreview}
                            alt="Förhandsgranskning"
                            className="h-20 w-20 object-cover rounded border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : /\.(xlsx|xls|csv)$/i.test(file.name) ? (
                          <FileSpreadsheet className="h-10 w-10 text-green-600 shrink-0" />
                        ) : (
                          <FileText className="h-10 w-10 text-red-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{file.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                            {isImageFile(file) && ' · bild'}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-4 text-slate-400 mb-2">
                        <Upload className="h-9 w-9" />
                        <ImageIcon className="h-9 w-9" />
                      </div>
                      <p className="text-sm font-medium mb-1">
                        Släpp en fil eller bild här, eller klicka för att välja
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Excel, CSV, PDF, text — eller foto/screenshot (.jpg, .png, .webp, .heic)
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tips: klistra in (⌘/Ctrl + V) en skärmdump direkt på sidan.
                      </p>
                      <input
                        type="file"
                        accept={ACCEPTED_FILE_EXTENSIONS}
                        className="hidden"
                        id="roster-file-input"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) setFile(f)
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => document.getElementById('roster-file-input')?.click()}
                      >
                        Välj fil
                      </Button>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-2">
              <div className="space-y-1 flex-1 max-w-sm">
                <Label className="text-xs">AI-kvalitet</Label>
                <Select value={intent} onValueChange={(v) => setIntent(v as ModelIntent)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTENT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                          <span className="text-xs text-muted-foreground">{opt.hint}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1" />

              <Button onClick={handleParse} disabled={!hasInput || parsing} size="lg">
                {parsing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Tolkar rostret…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Tolka med AI
                  </>
                )}
              </Button>
            </div>

            {parseError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <div className="text-sm text-red-700">{parseError}</div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Steg 2 — Granska och spara
                    <Badge variant="outline">{parseResult.inputKind}</Badge>
                    <Badge variant="secondary">{parseResult.modelUsed}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Rätta fält, ta bort felaktiga rader. Inga ändringar sparas förrän du klickar Spara.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <X className="h-4 w-4 mr-1" />
                  Börja om
                </Button>
              </div>
            </CardHeader>
            {parseResult.warnings.length > 0 && (
              <CardContent className="pt-0">
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <ul className="text-sm text-amber-800 space-y-0.5">
                    {parseResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {rows.length} {rows.length === 1 ? 'spelare' : 'spelare'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Inga rader att granska.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead className="min-w-[180px]">Namn</TableHead>
                        <TableHead className="w-36">Position</TableHead>
                        <TableHead className="min-w-[180px]">E-post</TableHead>
                        <TableHead className="w-36">Födelsedatum</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={999}
                              value={r.jerseyNumber ?? ''}
                              onChange={(e) => {
                                const v = e.target.value
                                updateRow(idx, { jerseyNumber: v === '' ? undefined : Number(v) })
                              }}
                              className="h-8 w-16 text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={r.name}
                              onChange={(e) => updateRow(idx, { name: e.target.value })}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={r.position ?? ''}
                              onChange={(e) =>
                                updateRow(idx, { position: e.target.value || undefined })
                              }
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="email"
                              value={r.email ?? ''}
                              onChange={(e) =>
                                updateRow(idx, { email: e.target.value || undefined })
                              }
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={r.birthDate ?? ''}
                              onChange={(e) =>
                                updateRow(idx, { birthDate: e.target.value || undefined })
                              }
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeRow(idx)}
                              aria-label={`Ta bort ${r.name}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-4 border-t">
                <label className="text-sm flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createAthleteAccounts}
                    onChange={(e) => setCreateAthleteAccounts(e.target.checked)}
                  />
                  Skapa atletkonto för spelare med e-post
                </label>
                <Button onClick={handleSubmit} disabled={submitting || rows.length === 0}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sparar…
                    </>
                  ) : (
                    `Spara ${rows.length} spelare`
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
