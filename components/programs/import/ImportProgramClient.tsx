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
import { useTranslations } from '@/i18n/client'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
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
import { Switch } from '@/components/ui/switch'
import {
  AlertCircle,
  FileSpreadsheet,
  FileText,
  FileUp,
  ImageIcon,
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
import {
  type AiAllowanceExhaustedError,
  getAiAllowanceUpgradeMessage,
  isAiAllowanceExhaustedError,
  parseAiAllowanceError,
} from '@/lib/ai/billing/client-errors'
import {
  AiAllowanceBlockedAction,
  type AiAllowanceAction,
} from '@/components/athlete/ai/AiAllowanceBlockedAction'

interface ClientOption {
  id: string
  name: string
}

interface ImportProgramClientProps {
  clients: ClientOption[]
  basePath: string
  /**
   * When true, auto-selects the single client in the list and hides the
   * "Tilldela atlet" card. Used by the athlete-side importer where the
   * only valid target is the athlete themselves.
   */
  selfOnly?: boolean
  /**
   * Route fragment that follows basePath when redirecting to a saved
   * program. Defaults to "/programs/:id" for coaches; athletes pass
   * the athlete-flavored path.
   */
  programDetailPath?: (basePath: string, programId: string) => string
}

type ParseResponse = {
  success: true
  aiOutput: string
  parsedOk: boolean
  warnings: string[]
  modelUsed: string
  inputKind: 'text' | 'excel' | 'csv' | 'pdf' | 'image'
  /**
   * Exercise resolutions computed server-side in the same call. Present when
   * the parse produced at least one strength segment with an exerciseName.
   */
  resolutions?: Resolution[]
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

const ACCEPTED_FILE_EXTENSIONS =
  '.xlsx,.xls,.csv,.pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif,image/*'

const IMAGE_EXTENSION_RE = /\.(png|jpe?g|webp|gif|heic|heif)$/i

function isImageFile(f: File | null): boolean {
  if (!f) return false
  return f.type.startsWith('image/') || IMAGE_EXTENSION_RE.test(f.name)
}

export function ImportProgramClient({
  clients,
  basePath,
  selfOnly = false,
  programDetailPath,
}: ImportProgramClientProps) {
  const { toast } = useToast()
  const router = useRouter()
  const t = useTranslations('components.programImportClient')

  const [tab, setTab] = useState<'paste' | 'upload'>('paste')
  const [pastedText, setPastedText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [intent, setIntent] = useState<ModelIntent>('balanced')
  // Opt-in: force the call to Anthropic regardless of which keys are
  // configured. Gemini occasionally emits placeholder exerciseNames on
  // text-heavy strength programs; Claude tends to be more literal when
  // copying source data verbatim.
  const [preferClaude, setPreferClaude] = useState(false)

  const resolveProgramPath = useCallback(
    (programId: string) => {
      if (programDetailPath) return programDetailPath(basePath, programId)
      return `${basePath}/programs/${programId}`
    },
    [basePath, programDetailPath]
  )

  const intentOptions = [
    {
      value: 'fast' as ModelIntent,
      label: t('intent.fast.label'),
      hint: t('intent.fast.hint'),
    },
    {
      value: 'balanced' as ModelIntent,
      label: t('intent.balanced.label'),
      hint: t('intent.balanced.hint'),
    },
    {
      value: 'powerful' as ModelIntent,
      label: t('intent.powerful.label'),
      hint: t('intent.powerful.hint'),
    },
  ]

  const [parsing, setParsing] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [aiAllowanceAction, setAiAllowanceAction] = useState<AiAllowanceAction | null>(null)
  const [fixingFormat, setFixingFormat] = useState(false)

  // Exercise mapping state (Phase 2). `mappings[name] = exerciseId`. Includes
  // both auto-assigned high-confidence matches and user-picked ones. Applied
  // to the aiOutput only at publish time to avoid churning the preview's
  // internal draft state.
  const [resolving, setResolving] = useState(false)
  const [resolutions, setResolutions] = useState<Resolution[]>([])
  const [mappings, setMappings] = useState<ExerciseMappings>({})
  // Names the coach explicitly skipped — persisted across re-scans this session
  // so they don't pop back into the mapping panel every time a new segment is
  // added in the preview editor.
  const [skippedNames, setSkippedNames] = useState<Set<string>>(new Set())
  // Latest draft from EnhancedProgramPreview. Updated continuously so the
  // re-scan button can resolve exercises against in-place edits, not just the
  // original AI output.
  const [latestDraftJson, setLatestDraftJson] = useState<string>('')

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(
    selfOnly && clients.length === 1 ? clients[0].id : ''
  )
  const [publishOpen, setPublishOpen] = useState(false)
  // Frozen snapshot of the program JSON captured the moment Publish was clicked.
  // We build it from (a) the edited draft the preview hands back on publish and
  // (b) the current exercise mappings — so preview edits can't drift from what
  // actually gets saved to the database.
  const [publishContent, setPublishContent] = useState<string>('')

  const dropRef = useRef<HTMLDivElement>(null)

  const selectedAthlete = clients.find((c) => c.id === selectedAthleteId)

  // Image preview URL (cleaned up when the file changes or component unmounts).
  const imagePreviewUrl = useMemo(() => {
    if (!isImageFile(file)) return null
    return URL.createObjectURL(file as File)
  }, [file])

  // Images always route to a vision-capable model server-side regardless of
  // this UI control. Keep the selector visible for non-image inputs so the
  // coach can still choose between cost tiers.
  const fileIsImage = isImageFile(file)

  // Derived: resolutions whose name still isn't mapped to an ID and hasn't
  // been explicitly skipped by the coach.
  const needsMapping = useMemo(
    () => resolutions.filter((r) => !mappings[r.name] && !skippedNames.has(r.name)),
    [resolutions, mappings, skippedNames]
  )
  const totalExercises = resolutions.length
  const mappedCount = resolutions.filter((r) => !!mappings[r.name]).length
  const skippedCount = resolutions.filter((r) => skippedNames.has(r.name)).length

  // `publishContent` is computed at click-time inside handlePublishClick so
  // the preview's edited draft flows through. The useMemo variant we had
  // before only layered mappings on `parseResult.aiOutput`, which silently
  // lost any edits the coach made in EnhancedProgramPreview.

  const setMapping = (name: string, id: string | null) => {
    setMappings((prev) => {
      const next = { ...prev }
      if (id == null) delete next[name]
      else next[name] = id
      return next
    })
    // Persist the mapping so future imports of the same name on this coach's
    // library auto-resolve. Fire-and-forget: a failure shouldn't block the
    // user — they can always re-map manually again.
    if (id) {
      void fetch('/api/programs/save-exercise-alias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: name, exerciseId: id }),
      }).catch(() => {})
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) setFile(f)
  }, [])

  const hasInput = tab === 'upload' ? !!file : pastedText.trim().length > 0

  const clearParseError = () => {
    setParseError(null)
    setAiAllowanceAction(null)
  }

  const showAiAllowanceError = (allowanceError: AiAllowanceExhaustedError) => {
    const description = `${allowanceError.message} ${getAiAllowanceUpgradeMessage(allowanceError)}`
    setParseError(description)
    setAiAllowanceAction({
      label: allowanceError.actionLabel,
      url: allowanceError.actionUrl,
    })
    return description
  }

  const handleParse = async () => {
    setParsing(true)
    clearParseError()
    setParseResult(null)
    try {
      let response: Response
      if (tab === 'upload' && file) {
        const form = new FormData()
        form.append('file', file)
        form.append('intent', intent)
        if (preferClaude) form.append('provider', 'anthropic')
        response = await fetch('/api/programs/import-parse', {
          method: 'POST',
          body: form,
        })
      } else {
        response = await fetch('/api/programs/import-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: pastedText,
            intent,
            ...(preferClaude && { provider: 'anthropic' }),
          }),
        })
      }

      const data = await response.json()
      if (!response.ok || !data?.success) {
        const allowanceError = parseAiAllowanceError(data)
        if (allowanceError) throw allowanceError
        throw new Error(data?.error || t('toasts.parseFailedDescription'))
      }

      const typedData = data as ParseResponse
      setParseResult(typedData)
      // Resolutions come back in the same payload now — apply them right away
      // so auto-maps land without a second round-trip.
      applyResolutions(typedData.resolutions ?? [])
      if (typedData.warnings.length > 0) {
        toast({
          title: t('toasts.parseWarningsTitle'),
          description: typedData.warnings[0],
        })
      } else {
        toast({
          title: t('toasts.parseSuccessTitle'),
          description: t('toasts.parseSuccessDescription', {
            model: typedData.modelUsed,
          }),
        })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('toasts.unknownError')
      const description = isAiAllowanceExhaustedError(e) ? showAiAllowanceError(e) : msg
      if (!isAiAllowanceExhaustedError(e)) {
        setParseError(description)
        setAiAllowanceAction(null)
      }
      toast({
        title: t('toasts.parseFailedTitle'),
        description,
        variant: 'destructive',
      })
    } finally {
      setParsing(false)
    }
  }

  /** Merge a resolution batch into local state — auto-map high confidence. */
  const applyResolutions = (next: Resolution[]) => {
    setResolutions(next)
    const auto: ExerciseMappings = {}
    for (const r of next) {
      if (r.bestMatch) auto[r.name] = r.bestMatch.id
    }
    setMappings(auto)
  }

  /**
   * Re-run exercise resolution against the current program (used by the
   * "Scanna igen" button after the coach has edited the preview to add new
   * strength segments). Hits the standalone resolver endpoint.
   */
  const rescanExercises = async (sourceJson: string) => {
    const names = extractExerciseNames(sourceJson)
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
      applyResolutions(data.resolutions ?? [])
    } catch {
      setResolutions([])
      toast({
        title: t('toasts.resolveFailedTitle'),
        description:
          t('toasts.resolveFailedDescription'),
      })
    } finally {
      setResolving(false)
    }
  }

  /**
   * "Fixa format" recovery. Re-runs parse at the 'powerful' intent tier to
   * get a vision-capable, higher-reasoning model to try again. Reuses the
   * original input (pastedText or file) still held in state.
   */
  const handleFixFormat = async () => {
    if (!hasInput) return
    setFixingFormat(true)
    clearParseError()
    try {
      let response: Response
      if (tab === 'upload' && file) {
        const form = new FormData()
        form.append('file', file)
        form.append('intent', 'powerful')
        if (preferClaude) form.append('provider', 'anthropic')
        response = await fetch('/api/programs/import-parse', {
          method: 'POST',
          body: form,
        })
      } else {
        response = await fetch('/api/programs/import-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: pastedText,
            intent: 'powerful',
            ...(preferClaude && { provider: 'anthropic' }),
          }),
        })
      }
      const data = await response.json()
      if (!response.ok || !data?.success) {
        const allowanceError = parseAiAllowanceError(data)
        if (allowanceError) throw allowanceError
        throw new Error(data?.error || t('toasts.parseFailedDescription'))
      }
      const typedData = data as ParseResponse
      setParseResult(typedData)
      applyResolutions(typedData.resolutions ?? [])
      setSkippedNames(new Set())
      toast({
        title: t('toasts.retryUpdated'),
        description: t('toasts.parseSuccessDescription', { model: typedData.modelUsed }),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('toasts.unknownError')
      const description = isAiAllowanceExhaustedError(e) ? showAiAllowanceError(e) : msg
      if (!isAiAllowanceExhaustedError(e)) {
        setParseError(description)
        setAiAllowanceAction(null)
      }
      toast({
        title: t('toasts.retryFailedTitle'),
        description,
        variant: 'destructive',
      })
    } finally {
      setFixingFormat(false)
    }
  }

  const handleReset = () => {
    setParseResult(null)
    clearParseError()
    setPastedText('')
    setFile(null)
    setResolutions([])
    setMappings({})
    setSkippedNames(new Set())
    setLatestDraftJson('')
  }

  const handlePublishClick = (currentDraftJson: string) => {
    if (!selectedAthleteId) {
      toast({
        title: t('toasts.missingAthleteTitle'),
        description: t('toasts.missingAthleteDescription'),
        variant: 'destructive',
      })
      return
    }
    // The preview hands back the live draft (including any inline edits).
    // Layer exercise mappings on top so learned / picked IDs persist to DB.
    const mapped =
      Object.keys(mappings).length === 0
        ? currentDraftJson
        : applyExerciseMappings(currentDraftJson, mappings)
    setPublishContent(mapped)
    setPublishOpen(true)
  }

  return (
    <div className="space-y-6">
      {!parseResult ? (
        <GlassCard glow="blue">
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              {t('title.step1')}
            </GlassCardTitle>
            <GlassCardDescription>{t('step1Description')}</GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'paste' | 'upload')}>
              <TabsList className="grid grid-cols-2 max-w-md">
                <TabsTrigger value="paste">
                  <FileText className="h-4 w-4 mr-1" />
                  {t('tabs.pasteText')}
                </TabsTrigger>
                <TabsTrigger value="upload">
                  <FileUp className="h-4 w-4 mr-1" />
                  {t('tabs.uploadFile')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="pt-4">
                <Textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  rows={14}
                  placeholder={t('pastePlaceholder')}
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
                        {fileIsImage && imagePreviewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imagePreviewUrl}
                            alt={file.name}
                            className="h-16 w-16 object-cover rounded border shrink-0"
                          />
                        ) : fileIsImage ? (
                          <ImageIcon className="h-8 w-8 text-purple-500 shrink-0" />
                        ) : /\.(xlsx|xls|csv)$/i.test(file.name) ? (
                          <FileSpreadsheet className="h-8 w-8 text-green-600 shrink-0" />
                        ) : (
                          <FileText className="h-8 w-8 text-red-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{file.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                            {fileIsImage && (
                              <>
                                {' · '}
                                <span className="text-purple-600">
                                  {t('visionHint')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setFile(null)}
                        aria-label={t('removeFile')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                      <p className="text-sm font-medium mb-1">
                        {t('dropHint')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('supportedFormats')}
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
                        {t('selectFileCta')}
                      </Button>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-2">
              <div className="space-y-1 flex-1 max-w-sm">
                <Label className="text-xs">{t('aiQualityLabel')}</Label>
                <Select
                  value={intent}
                  onValueChange={(v) => setIntent(v as ModelIntent)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {intentOptions.map((opt) => (
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

              <div className="flex items-center gap-3 rounded-lg border px-3 py-2 bg-muted/30">
                <Switch
                  id="prefer-claude"
                  checked={preferClaude}
                  onCheckedChange={setPreferClaude}
                />
                <label htmlFor="prefer-claude" className="text-xs cursor-pointer select-none">
                  <div className="font-medium">{t('preferClaudeTitle')}</div>
                  <div className="text-muted-foreground">
                    {t('preferClaudeDescription')}
                  </div>
                </label>
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
                    {t('parseButton.parsing')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t('parseButton.default')}
                  </>
                )}
              </Button>
            </div>

            {parseError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="text-sm text-red-700">{parseError}</div>
                  <AiAllowanceBlockedAction action={aiAllowanceAction} tone="red" />
                </div>
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      ) : (
        <>
          <GlassCard glow="blue">
            <GlassCardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <GlassCardTitle className="text-base flex items-center gap-2">
                    {t('title.step2')}
                    <Badge variant="outline">{parseResult.inputKind}</Badge>
                    <Badge variant="secondary">{parseResult.modelUsed}</Badge>
                  </GlassCardTitle>
                  <GlassCardDescription>
                    {t('step2Description')}
                  </GlassCardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <X className="h-4 w-4 mr-1" />
                  {t('reset')}
                </Button>
              </div>
            </GlassCardHeader>
            {parseResult.warnings.length > 0 && (
              <GlassCardContent className="pt-0">
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <ul className="text-sm text-amber-800 space-y-0.5">
                    {parseResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              </GlassCardContent>
            )}
          </GlassCard>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            <div>
              <EnhancedProgramPreview
                content={parseResult.aiOutput}
                athleteId={selectedAthleteId || null}
                athleteName={selectedAthlete?.name || null}
                onPublish={handlePublishClick}
                onDraftChange={setLatestDraftJson}
                onFixFormat={handleFixFormat}
                isFixingFormat={fixingFormat}
                onProgramSaved={(programId) => {
                  router.push(resolveProgramPath(programId))
                }}
              />
            </div>
            <div className="space-y-4">
              {!selfOnly && (
                <GlassCard glow="blue" className="h-fit">
                  <GlassCardHeader className="pb-3">
                    <GlassCardTitle className="text-sm">{t('assignAthlete.title')}</GlassCardTitle>
                    <GlassCardDescription className="text-xs">
                      {t('assignAthlete.description')}
                    </GlassCardDescription>
                  </GlassCardHeader>
                  <GlassCardContent className="space-y-2">
                    <Select
                      value={selectedAthleteId}
                      onValueChange={setSelectedAthleteId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('assignAthlete.placeholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.length === 0 ? (
                          <div className="px-2 py-1 text-sm text-muted-foreground">
                            {t('assignAthlete.noAthletes')}
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
                      {t('assignAthlete.publishHint')}
                    </p>
                  </GlassCardContent>
                </GlassCard>
              )}
              {selfOnly && (
                <GlassCard glow="blue" className="h-fit border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">
                  <GlassCardHeader className="pb-3">
                    <GlassCardTitle className="text-sm">{t('ownProgram.title')}</GlassCardTitle>
                    <GlassCardDescription className="text-xs">
                      {t('ownProgram.description')}
                    </GlassCardDescription>
                  </GlassCardHeader>
                </GlassCard>
              )}

              {(resolving || totalExercises > 0) && (
                <GlassCard glow="blue" className="h-fit">
                  <GlassCardHeader className="pb-3">
                    <GlassCardTitle className="text-sm flex items-center justify-between">
                      <span>{t('mapping.heading')}</span>
                      {!resolving && (
                        <Badge
                          variant={needsMapping.length === 0 ? 'outline' : 'secondary'}
                          className={
                            needsMapping.length === 0
                              ? 'text-green-700 border-green-300'
                              : ''
                          }
                        >
                          {t('mapping.badge.mappedCount', {
                            mapped: mappedCount,
                            total: totalExercises,
                          })}
                          {skippedCount > 0 &&
                            t('mapping.badge.skippedCount', { count: skippedCount })}
                        </Badge>
                      )}
                    </GlassCardTitle>
                    <GlassCardDescription className="text-xs">
                      {resolving
                        ? t('mapping.status.resolving')
                        : needsMapping.length === 0
                        ? skippedCount > 0
                          ? t('mapping.status.allLinkedSkips', {
                              skipped: t('mapping.badge.skippedCount', {
                                count: skippedCount,
                              }),
                            })
                          : t('mapping.status.allLinked')
                        : t('mapping.status.linkHint')}
                    </GlassCardDescription>
                  </GlassCardHeader>
                  {!resolving && (
                    <GlassCardContent className="space-y-3 max-h-[520px] overflow-y-auto">
                      {needsMapping.map((r) => (
                        <NeedsMappingRow
                          key={r.name}
                          resolution={r}
                          onPick={(id) => setMapping(r.name, id)}
                          onSkip={() => {
                            setSkippedNames((prev) => {
                              const next = new Set(prev)
                              next.add(r.name)
                              return next
                            })
                          }}
                        />
                      ))}
                      <div className="pt-1 flex items-center justify-between gap-2 border-t">
                        <p className="text-[11px] text-muted-foreground">
                          {t('mapping.empty.newMappingHint')}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            rescanExercises(latestDraftJson || parseResult.aiOutput)
                          }
                          disabled={resolving}
                        >
                          {t('mapping.scanAgain')}
                        </Button>
                      </div>
                    </GlassCardContent>
                  )}
                </GlassCard>
              )}
            </div>
          </div>

          {selectedAthlete && publishContent && (
            <PublishProgramDialog
              open={publishOpen}
              onOpenChange={setPublishOpen}
              programName={extractProgramName(publishContent, t('toasts.importedProgramName'))}
              athleteId={selectedAthlete.id}
              athleteName={selectedAthlete.name}
              aiOutput={publishContent}
              onSuccess={(programId) => {
                toast({
                  title: t('toasts.publishedTitle'),
                  description: t('toasts.publishedDescription'),
                })
                router.push(resolveProgramPath(programId))
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
function extractProgramName(output: string, fallbackName: string): string {
  const m = output.match(/"name"\s*:\s*"([^"\\]{1,120})"/)
  return m?.[1] ?? fallbackName
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
  const t = useTranslations('components.programImportClient')
  const top = resolution.candidates.slice(0, 3)
  return (
    <div className="border rounded-lg p-2 space-y-1.5 bg-white dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-sm truncate" title={resolution.name}>
            {resolution.name}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {t('mapping.rowSource')}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          onClick={onSkip}
          title={t('mapping.rowSkipTitle')}
        >
          {t('mapping.rowSkip')}
        </Button>
      </div>
      {top.length === 0 ? (
        <div className="text-xs text-muted-foreground italic py-1">
          {t('mapping.missing')}
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
