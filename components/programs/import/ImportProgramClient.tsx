'use client'

/**
 * Import Program (coach) — client component.
 *
 * One screen: drop a file or paste text → click Parse → the AI extracts a
 * ParsedProgram JSON, which we hand to EnhancedProgramPreview for review and
 * inline editing. When the coach is ready they pick an athlete and the
 * existing PublishProgramDialog handles the save into TrainingProgram + weeks.
 *
 * This is Phase 1 scope: text / CSV / Excel / PDF-text. Images and handwritten
 * photos come in a later phase (Gemini 3.1 Pro vision).
 */

import { useCallback, useMemo, useRef, useState } from 'react'
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
  AlertCircle,
  FileSpreadsheet,
  FileText,
  FileUp,
  Loader2,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { EnhancedProgramPreview } from '@/components/ai-studio/EnhancedProgramPreview'
import { PublishProgramDialog } from '@/components/ai-studio/PublishProgramDialog'
import type { ModelIntent } from '@/types/ai-models'
import {
  applyExerciseMappings,
  extractExerciseNames,
  type ExerciseMappings,
} from '@/lib/ai/program-exercise-resolver'

interface ClientOption {
  id: string
  name: string
}

interface ImportProgramClientProps {
  clients: ClientOption[]
  basePath: string
}

type ParseResponse = {
  success: true
  aiOutput: string
  parsedOk: boolean
  warnings: string[]
  modelUsed: string
  inputKind: 'text' | 'excel' | 'csv' | 'pdf'
}

interface Candidate {
  id: string
  name: string
  category?: string | null
  biomechanicalPillar?: string | null
  equipment?: string | null
  score: number
}

interface Resolution {
  name: string
  bestMatch: Candidate | null
  candidates: Candidate[]
}

const ACCEPTED_FILE_EXTENSIONS = '.xlsx,.xls,.csv,.pdf,.txt,.md'

const INTENT_OPTIONS: { value: ModelIntent; label: string; hint: string }[] = [
  {
    value: 'fast',
    label: 'Snabb (billigast)',
    hint: 'Lättast paste/CSV. Snabb men tar missar i komplexa PDF:er.',
  },
  {
    value: 'balanced',
    label: 'Balanserad (rekommenderas)',
    hint: 'Gemini 3 Flash / Sonnet / GPT-5 Mini. Bäst kostnad/kvalitet.',
  },
  {
    value: 'powerful',
    label: 'Kraftfull (bäst kvalitet)',
    hint: 'Gemini 3.1 Pro / Opus. Använd för röriga PDF:er och komplexa program.',
  },
]

export function ImportProgramClient({ clients, basePath }: ImportProgramClientProps) {
  const { toast } = useToast()
  const router = useRouter()

  const [tab, setTab] = useState<'paste' | 'upload'>('paste')
  const [pastedText, setPastedText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [intent, setIntent] = useState<ModelIntent>('balanced')

  const [parsing, setParsing] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  // Exercise mapping state (Phase 2). `mappings[name] = exerciseId`. Includes
  // both auto-assigned high-confidence matches and user-picked ones. Applied
  // to the aiOutput only at publish time to avoid churning the preview's
  // internal draft state.
  const [resolving, setResolving] = useState(false)
  const [resolutions, setResolutions] = useState<Resolution[]>([])
  const [mappings, setMappings] = useState<ExerciseMappings>({})

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('')
  const [publishOpen, setPublishOpen] = useState(false)

  const dropRef = useRef<HTMLDivElement>(null)

  const selectedAthlete = clients.find((c) => c.id === selectedAthleteId)

  // Derived: resolutions whose name still isn't mapped to an ID.
  const needsMapping = useMemo(
    () => resolutions.filter((r) => !mappings[r.name]),
    [resolutions, mappings]
  )
  const totalExercises = resolutions.length
  const mappedCount = totalExercises - needsMapping.length

  // Final aiOutput used for publish — source of truth stays `parseResult.aiOutput`,
  // mappings are layered in only at publish time so the preview stays stable.
  const publishOutput = useMemo(() => {
    if (!parseResult) return ''
    if (Object.keys(mappings).length === 0) return parseResult.aiOutput
    return applyExerciseMappings(parseResult.aiOutput, mappings)
  }, [parseResult, mappings])

  const setMapping = (name: string, id: string | null) => {
    setMappings((prev) => {
      const next = { ...prev }
      if (id == null) delete next[name]
      else next[name] = id
      return next
    })
  }

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
    try {
      let response: Response
      if (tab === 'upload' && file) {
        const form = new FormData()
        form.append('file', file)
        form.append('intent', intent)
        response = await fetch('/api/programs/import-parse', {
          method: 'POST',
          body: form,
        })
      } else {
        response = await fetch('/api/programs/import-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: pastedText, intent }),
        })
      }

      const data = await response.json()
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Kunde inte tolka programmet')
      }

      setParseResult(data as ParseResponse)
      // Kick off exercise resolution in the background — auto-map high
      // confidence matches so the coach only sees what actually needs a
      // decision.
      void resolveExercises((data as ParseResponse).aiOutput)
      if ((data as ParseResponse).warnings.length > 0) {
        toast({
          title: 'Importen är klar — läs varningarna',
          description: (data as ParseResponse).warnings[0],
        })
      } else {
        toast({
          title: 'Program importerat',
          description: `Modell: ${(data as ParseResponse).modelUsed}. Granska i editorn nedan.`,
        })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Okänt fel'
      setParseError(msg)
      toast({
        title: 'Import misslyckades',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setParsing(false)
    }
  }

  const resolveExercises = async (aiOutput: string) => {
    const names = extractExerciseNames(aiOutput)
    if (names.length === 0) {
      setResolutions([])
      setMappings({})
      return
    }
    setResolving(true)
    try {
      const res = await fetch('/api/programs/resolve-exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names }),
      })
      if (!res.ok) throw new Error('Resolver request failed')
      const data = (await res.json()) as { resolutions: Resolution[] }
      setResolutions(data.resolutions ?? [])
      // Auto-assign every bestMatch. The coach can override any of these in
      // the panel below if they disagree.
      const auto: ExerciseMappings = {}
      for (const r of data.resolutions ?? []) {
        if (r.bestMatch) auto[r.name] = r.bestMatch.id
      }
      setMappings(auto)
    } catch {
      // Non-fatal — exercises just stay as free text until the coach maps
      // them or edits in the preview. Keep UX moving.
      setResolutions([])
    } finally {
      setResolving(false)
    }
  }

  const handleReset = () => {
    setParseResult(null)
    setParseError(null)
    setPastedText('')
    setFile(null)
    setResolutions([])
    setMappings({})
  }

  const handlePublishClick = () => {
    if (!selectedAthleteId) {
      toast({
        title: 'Välj en atlet',
        description: 'Välj vem programmet ska tilldelas innan du publicerar.',
        variant: 'destructive',
      })
      return
    }
    setPublishOpen(true)
  }

  return (
    <div className="space-y-6">
      {!parseResult ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              Steg 1 — Lämna in programmet
            </CardTitle>
            <CardDescription>
              Välj hur du vill lämna in det. Vi tolkar innehållet med AI och
              lägger resultatet i den vanliga programredigeraren.
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
                  placeholder={`Klistra in programmet här.\n\nT.ex.\nVecka 1 (Bas):\n  Mån – Lugn löpning 45 min zon 2\n  Tis – Styrka (knäböj 3x8, utfall 3x10, plankan 3x45s)\n  Ons – Vila\n  Tor – Tempo 10 min + 5 x 3 min tröskel + 10 min\n  ...`}
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
                    'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                    isDragging
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                      : 'border-slate-300 dark:border-slate-700'
                  )}
                >
                  {file ? (
                    <div className="flex items-center justify-between gap-2 text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        {/\.(xlsx|xls|csv)$/i.test(file.name) ? (
                          <FileSpreadsheet className="h-8 w-8 text-green-600 shrink-0" />
                        ) : (
                          <FileText className="h-8 w-8 text-red-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{file.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setFile(null)}
                        aria-label="Ta bort filen"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                      <p className="text-sm font-medium mb-1">
                        Släpp en fil här, eller klicka för att välja
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Stödda format: Excel (.xlsx, .xls), CSV, PDF, text (.txt, .md)
                      </p>
                      <input
                        type="file"
                        accept={ACCEPTED_FILE_EXTENSIONS}
                        className="hidden"
                        id="import-file-input"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) setFile(f)
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() =>
                          document.getElementById('import-file-input')?.click()
                        }
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
                <Select
                  value={intent}
                  onValueChange={(v) => setIntent(v as ModelIntent)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTENT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {opt.hint}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1" />

              <Button
                onClick={handleParse}
                disabled={!hasInput || parsing}
                size="lg"
              >
                {parsing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Tolkar programmet…
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
                    Steg 2 — Granska och publicera
                    <Badge variant="outline">{parseResult.inputKind}</Badge>
                    <Badge variant="secondary">{parseResult.modelUsed}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Rätta fält, lägg till/ta bort pass och tilldela till en
                    atlet. Inga ändringar sparas till databasen förrän du
                    publicerar.
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

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            <div>
              <EnhancedProgramPreview
                content={parseResult.aiOutput}
                athleteId={selectedAthleteId || null}
                athleteName={selectedAthlete?.name || null}
                onPublish={handlePublishClick}
                onProgramSaved={(programId) => {
                  router.push(`${basePath}/programs/${programId}`)
                }}
              />
            </div>
            <div className="space-y-4">
              <Card className="h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Tilldela atlet</CardTitle>
                  <CardDescription className="text-xs">
                    Välj vem programmet ska publiceras till.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Select
                    value={selectedAthleteId}
                    onValueChange={setSelectedAthleteId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj atlet…" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.length === 0 ? (
                        <div className="px-2 py-1 text-sm text-muted-foreground">
                          Inga atleter funna
                        </div>
                      ) : (
                        clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Använd &quot;Publicera&quot;-knappen i editorn när du är klar.
                  </p>
                </CardContent>
              </Card>

              {(resolving || totalExercises > 0) && (
                <Card className="h-fit">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>Övningskoppling</span>
                      {!resolving && (
                        <Badge
                          variant={needsMapping.length === 0 ? 'outline' : 'secondary'}
                          className={
                            needsMapping.length === 0
                              ? 'text-green-700 border-green-300'
                              : ''
                          }
                        >
                          {mappedCount}/{totalExercises} mappade
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {resolving
                        ? 'Söker matchningar i övningsbiblioteket…'
                        : needsMapping.length === 0
                        ? 'Alla övningar kopplade till biblioteket.'
                        : 'Välj rätt övning för att länka styrkepass till progressionsdata.'}
                    </CardDescription>
                  </CardHeader>
                  {!resolving && needsMapping.length > 0 && (
                    <CardContent className="space-y-3 max-h-[520px] overflow-y-auto">
                      {needsMapping.map((r) => (
                        <NeedsMappingRow
                          key={r.name}
                          resolution={r}
                          onPick={(id) => setMapping(r.name, id)}
                          onSkip={() => {
                            // Record an explicit skip by mapping to empty sentinel;
                            // here we just leave it unmapped. Skip button hides it
                            // from the visible list by flagging it locally.
                            setResolutions((prev) =>
                              prev.filter((x) => x.name !== r.name)
                            )
                          }}
                        />
                      ))}
                    </CardContent>
                  )}
                </Card>
              )}
            </div>
          </div>

          {selectedAthlete && (
            <PublishProgramDialog
              open={publishOpen}
              onOpenChange={setPublishOpen}
              programName={extractProgramName(parseResult.aiOutput)}
              athleteId={selectedAthlete.id}
              athleteName={selectedAthlete.name}
              aiOutput={publishOutput}
              onSuccess={(programId) => {
                toast({
                  title: 'Programmet publicerades',
                  description: 'Öppnar programvyn…',
                })
                router.push(`${basePath}/programs/${programId}`)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}

/**
 * Cheap best-effort extraction of the program name from the AI JSON.
 * EnhancedProgramPreview re-parses on its own; this is just for the dialog
 * header while we wait for the full parse.
 */
function extractProgramName(output: string): string {
  const m = output.match(/"name"\s*:\s*"([^"\\]{1,120})"/)
  return m?.[1] ?? 'Importerat program'
}

/**
 * One row of the "needs mapping" panel — shows the source exercise name and
 * the top candidate picks with their confidence scores.
 */
function NeedsMappingRow({
  resolution,
  onPick,
  onSkip,
}: {
  resolution: Resolution
  onPick: (exerciseId: string) => void
  onSkip: () => void
}) {
  const top = resolution.candidates.slice(0, 3)
  return (
    <div className="border rounded-lg p-2 space-y-1.5 bg-white dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-sm truncate" title={resolution.name}>
            {resolution.name}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Från importen
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          onClick={onSkip}
          title="Hoppa över — låt den stanna som fritext"
        >
          Hoppa över
        </Button>
      </div>
      {top.length === 0 ? (
        <div className="text-xs text-muted-foreground italic py-1">
          Inga rimliga träffar hittades. Skapa övningen manuellt efter publicering.
        </div>
      ) : (
        <div className="space-y-1">
          {top.map((c) => {
            const pct = Math.round(c.score * 100)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onPick(c.id)}
                className="w-full text-left px-2 py-1.5 rounded border border-transparent hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm truncate">{c.name}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] shrink-0',
                      pct >= 85 && 'text-green-700 border-green-300',
                      pct >= 60 && pct < 85 && 'text-amber-700 border-amber-300',
                      pct < 60 && 'text-muted-foreground'
                    )}
                  >
                    {pct}%
                  </Badge>
                </div>
                <div className="flex gap-1 mt-0.5">
                  {c.biomechanicalPillar && (
                    <span className="text-[10px] text-muted-foreground">
                      {c.biomechanicalPillar}
                    </span>
                  )}
                  {c.equipment && (
                    <span className="text-[10px] text-muted-foreground">
                      · {c.equipment}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
