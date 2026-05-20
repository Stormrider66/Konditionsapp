'use client'

/**
 * ImportWorkoutDialog
 *
 * Shared dialog for importing a single workout (strength / cardio / hybrid /
 * agility) from pasted text, an Excel/CSV/PDF/text file, or an image.
 * Mirrors the program importer's parse flow but tighter: there's no
 * publish step here — the dialog hands the parsed workout up via
 * `onImported`, the parent studio prefills its existing builder with that
 * workout, and editing/saving happen in the builder UI the coach already
 * knows.
 *
 * Lifecycle (two phases inside the dialog):
 *   1. Input  — paste/upload + model-tier selector + parse button
 *   2. Review — parse summary + library-matching panel for unmatched names,
 *               then "Open in builder" hands the workout to the parent
 *
 * Library matching covers Exercise (strength + hybrid) and AgilityDrill
 * (agility). Cardio doesn't need matching.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  ArrowLeft,
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
import { useLocale } from '@/i18n/client'
import { toast } from 'sonner'
import type { ModelIntent } from '@/types/ai-models'
import type { WorkoutImportType, ParsedWorkoutImport } from '@/lib/ai/workout-parser'
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

export type ImportedWorkoutPayload = {
  workoutType: WorkoutImportType
  /** Validated workout JSON in the per-type schema shape. */
  workout: ParsedWorkoutImport
  /**
   * Confirmed name → library-id mapping. Includes both auto-assigned
   * high-confidence matches and coach-picked ones. Names not in this map
   * stay as free text in the builder.
   */
  mappings: Record<string, string>
  /** Resolutions surfaced server-side (full panel data, for debug / audit). */
  resolutions: Resolution[]
  /** AI tier label, e.g. "Gemini 3.5 Flash". */
  modelUsed: string
}

interface ImportWorkoutDialogProps {
  workoutType: WorkoutImportType
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called when the coach clicks "Open in builder" with confirmed data. */
  onImported: (payload: ImportedWorkoutPayload) => void
}

type AppLocale = 'en' | 'sv'

function getAppLocale(locale: string): AppLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

function text(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

const WORKOUT_TYPE_LABELS: Record<
  WorkoutImportType,
  { label: Record<AppLocale, string>; placeholder: Record<AppLocale, string> }
> = {
  STRENGTH: {
    label: { sv: 'styrkepass', en: 'strength workout' },
    placeholder: {
      sv: 'T.ex.\n\nPass A — Knäböj-fokus\nUppvärmning: 5 min cykel + dynamisk mobility\n\nHuvudpass:\n- Knäböj 5x5 @ 80 kg, vila 3 min\n- Rumänsk marklyft 4x8 @ 70 kg\n- Bulgariska utfall 3x10/sida\n- Plankan 3x45s\n\nNedvarvning: foam rolling + stretch',
      en: 'E.g.\n\nSession A — Squat focus\nWarm-up: 5 min bike + dynamic mobility\n\nMain session:\n- Back squat 5x5 @ 80 kg, rest 3 min\n- Romanian deadlift 4x8 @ 70 kg\n- Bulgarian split squat 3x10/side\n- Plank 3x45s\n\nCool-down: foam rolling + stretch',
    },
  },
  CARDIO: {
    label: { sv: 'konditionspass', en: 'cardio workout' },
    placeholder: {
      sv: 'T.ex.\n\nIntervaller 5x1km\n10 min uppvärmning zon 1-2\n5 x 1 km @ 3:40/km, 90s vila lugn jogg\n10 min nedvarvning zon 1',
      en: 'E.g.\n\n5x1 km intervals\n10 min warm-up zone 1-2\n5 x 1 km @ 3:40/km, 90s easy jog recovery\n10 min cool-down zone 1',
    },
  },
  HYBRID: {
    label: { sv: 'hybridpass', en: 'hybrid workout' },
    placeholder: {
      sv: 'T.ex.\n\n"Fran"\nFor time — Cap 8 min\n21-15-9\nThruster 43/30 kg\nPull-ups',
      en: 'E.g.\n\n"Fran"\nFor time — Cap 8 min\n21-15-9\nThruster 43/30 kg\nPull-ups',
    },
  },
  AGILITY: {
    label: { sv: 'agilitypass', en: 'agility workout' },
    placeholder: {
      sv: 'T.ex.\n\nFotarbete + reaktiv agility (45 min)\nUppvärmning: ladder in-in-out-out 3 set, ankle hops 2x10\n\nHuvudpass:\n- 5-10-5 Pro Agility 6 reps, 30s vila\n- T-test 4 reps, 60s vila\n- Reactive mirror drill 3x30s\n\nNedvarvning: walking + breathing 5 min',
      en: 'E.g.\n\nFootwork + reactive agility (45 min)\nWarm-up: ladder in-in-out-out 3 sets, ankle hops 2x10\n\nMain session:\n- 5-10-5 Pro Agility 6 reps, 30s rest\n- T-test 4 reps, 60s rest\n- Reactive mirror drill 3x30s\n\nCool-down: walking + breathing 5 min',
    },
  },
}

const ACCEPTED_FILE_EXTENSIONS =
  '.xlsx,.xls,.csv,.pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif,image/*'

const IMAGE_EXTENSION_RE = /\.(png|jpe?g|webp|gif|heic|heif)$/i

function isImageFile(f: File | null): boolean {
  if (!f) return false
  return f.type.startsWith('image/') || IMAGE_EXTENSION_RE.test(f.name)
}

const INTENT_OPTIONS: {
  value: ModelIntent
  label: Record<AppLocale, string>
  hint: Record<AppLocale, string>
}[] = [
  {
    value: 'fast',
    label: { sv: 'Snabb (billigast)', en: 'Fast (lowest cost)' },
    hint: {
      sv: 'Lättast text. Kan missa nyanser i komplexa Excel/PDF.',
      en: 'Best for simple text. May miss nuance in complex Excel/PDF files.',
    },
  },
  {
    value: 'balanced',
    label: { sv: 'Balanserad (rekommenderas)', en: 'Balanced (recommended)' },
    hint: {
      sv: 'Bäst kostnad/kvalitet för enstaka pass.',
      en: 'Best cost/quality balance for single workouts.',
    },
  },
  {
    value: 'powerful',
    label: { sv: 'Kraftfull', en: 'Powerful' },
    hint: {
      sv: 'Använd för bilder och röriga källor.',
      en: 'Use for images and messy source material.',
    },
  },
]

type ParseResponse = {
  success: true
  workoutType: WorkoutImportType
  workout: ParsedWorkoutImport | null
  aiOutput: string
  parsedOk: boolean
  warnings: string[]
  modelUsed: string
  inputKind: 'text' | 'excel' | 'csv' | 'pdf' | 'image'
  resolutions: Resolution[]
  cached: boolean
}

export function ImportWorkoutDialog({
  workoutType,
  open,
  onOpenChange,
  onImported,
}: ImportWorkoutDialogProps) {
  const locale = getAppLocale(useLocale())
  const labels = WORKOUT_TYPE_LABELS[workoutType]

  const [tab, setTab] = useState<'paste' | 'upload'>('paste')
  const [pastedText, setPastedText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [intent, setIntent] = useState<ModelIntent>('balanced')
  const [preferClaude, setPreferClaude] = useState(false)

  const [parsing, setParsing] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [aiAllowanceAction, setAiAllowanceAction] = useState<AiAllowanceAction | null>(null)
  const [fixingFormat, setFixingFormat] = useState(false)

  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [skipped, setSkipped] = useState<Set<string>>(new Set())

  const dropRef = useRef<HTMLDivElement>(null)

  const fileIsImage = isImageFile(file)
  const imagePreviewUrl = useMemo(() => {
    if (!fileIsImage || !file) return null
    return URL.createObjectURL(file)
  }, [file, fileIsImage])
  // Revoke the previous blob URL whenever the preview source changes or
  // the dialog unmounts — `URL.createObjectURL` leaks otherwise.
  useEffect(() => {
    if (!imagePreviewUrl) return
    return () => URL.revokeObjectURL(imagePreviewUrl)
  }, [imagePreviewUrl])

  const hasInput = tab === 'upload' ? !!file : pastedText.trim().length > 0

  const clearParseError = useCallback(() => {
    setParseError(null)
    setAiAllowanceAction(null)
  }, [])

  const showAiAllowanceError = (allowanceError: AiAllowanceExhaustedError) => {
    const description = `${allowanceError.message} ${getAiAllowanceUpgradeMessage(allowanceError)}`
    setParseError(description)
    setAiAllowanceAction({
      label: allowanceError.actionLabel,
      url: allowanceError.actionUrl,
    })
    return description
  }

  const reset = useCallback(() => {
    setTab('paste')
    setPastedText('')
    setFile(null)
    setParsing(false)
    setParseResult(null)
    clearParseError()
    setMappings({})
    setSkipped(new Set())
  }, [clearParseError])

  const handleClose = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) setFile(f)
  }, [])

  /**
   * Run a parse against the API. Intent override lets the "Fixa format"
   * retry force-bump to 'powerful' without changing the dialog's intent
   * selector (which still reflects the coach's chosen tier).
   */
  const runParse = async (intentOverride?: ModelIntent) => {
    const effectiveIntent = intentOverride ?? intent
    let response: Response
    if (tab === 'upload' && file) {
      const form = new FormData()
      form.append('file', file)
      form.append('workoutType', workoutType)
      form.append('intent', effectiveIntent)
      if (preferClaude) form.append('provider', 'anthropic')
      response = await fetch('/api/workouts/import-parse', {
        method: 'POST',
        body: form,
      })
    } else {
      response = await fetch('/api/workouts/import-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutType,
          text: pastedText,
          intent: effectiveIntent,
          ...(preferClaude && { provider: 'anthropic' }),
        }),
      })
    }
    const data = await response.json()
    if (!response.ok || !data?.success) {
      const allowanceError = parseAiAllowanceError(data)
      if (allowanceError) throw allowanceError
      throw new Error(data?.error || text(locale, 'Kunde inte tolka passet', 'Could not parse the workout'))
    }
    return data as ParseResponse
  }

  const applyParseResult = (typed: ParseResponse) => {
    setParseResult(typed)
    const auto: Record<string, string> = {}
    for (const r of typed.resolutions ?? []) {
      if (r.bestMatch) auto[r.name] = r.bestMatch.id
    }
    setMappings(auto)
    setSkipped(new Set())
  }

  const handleParse = async () => {
    setParsing(true)
    clearParseError()
    setParseResult(null)
    try {
      applyParseResult(await runParse())
    } catch (e) {
      const msg = e instanceof Error ? e.message : text(locale, 'Okänt fel', 'Unknown error')
      const description = isAiAllowanceExhaustedError(e) ? showAiAllowanceError(e) : msg
      if (!isAiAllowanceExhaustedError(e)) {
        setParseError(description)
        setAiAllowanceAction(null)
      }
      toast.error(text(locale, 'Import misslyckades', 'Import failed'), { description })
    } finally {
      setParsing(false)
    }
  }

  /**
   * "Fixa format" recovery — re-run the parse at the 'powerful' tier.
   * Useful when the balanced/fast tier produced warnings or schema
   * validation failures. Reuses the original input held in state.
   */
  const handleFixFormat = async () => {
    if (fixingFormat) return
    setFixingFormat(true)
    clearParseError()
    try {
      const next = await runParse('powerful')
      applyParseResult(next)
      toast.success(text(locale, 'Tolkning uppdaterad', 'Parsing updated'), {
        description: text(locale, `Kör igen med ${next.modelUsed}.`, `Reran with ${next.modelUsed}.`),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : text(locale, 'Okänt fel', 'Unknown error')
      const description = isAiAllowanceExhaustedError(e) ? showAiAllowanceError(e) : msg
      if (!isAiAllowanceExhaustedError(e)) {
        setParseError(description)
        setAiAllowanceAction(null)
      }
      toast.error(text(locale, 'Omkörningen misslyckades', 'Retry failed'), { description })
    } finally {
      setFixingFormat(false)
    }
  }

  const setMapping = (name: string, id: string | null) => {
    setMappings((prev) => {
      const next = { ...prev }
      if (id == null) delete next[name]
      else next[name] = id
      return next
    })
    // Persist exercise-name aliases so future imports of the same name
    // auto-resolve. Only fires for STRENGTH + HYBRID, both of which use
    // the Exercise pool (and thus the existing ExerciseNameAlias table).
    // AGILITY drills don't have an alias table — would need a parallel
    // schema change to support; out of scope for now.
    if (id && (workoutType === 'STRENGTH' || workoutType === 'HYBRID')) {
      void fetch('/api/programs/save-exercise-alias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: name, exerciseId: id }),
      }).catch(() => {})
    }
  }

  const handleConfirm = () => {
    if (!parseResult || !parseResult.workout) return
    onImported({
      workoutType,
      workout: parseResult.workout,
      mappings,
      resolutions: parseResult.resolutions,
      modelUsed: parseResult.modelUsed,
    })
    handleClose(false)
  }

  const resolutions = parseResult?.resolutions ?? []
  const totalToMap = resolutions.length
  const mappedCount = resolutions.filter((r) => !!mappings[r.name]).length
  const skippedCount = resolutions.filter((r) => skipped.has(r.name)).length
  const needsMapping = resolutions.filter(
    (r) => !mappings[r.name] && !skipped.has(r.name)
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            {text(locale, 'Importera', 'Import')} {labels.label[locale]}
          </DialogTitle>
          <DialogDescription>
            {text(
              locale,
              'Klistra in eller ladda upp en källa — AI tolkar innehållet och fyller byggaren åt dig. Inga ändringar sparas förrän du klickar spara i byggaren.',
              'Paste or upload a source — AI parses the content and fills the builder for you. Nothing is saved until you click save in the builder.'
            )}
          </DialogDescription>
        </DialogHeader>

        {!parseResult ? (
          <div className="space-y-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'paste' | 'upload')}>
              <TabsList className="grid grid-cols-2 max-w-md">
                <TabsTrigger value="paste">
                  <FileText className="h-4 w-4 mr-1" />
                  {text(locale, 'Klistra in text', 'Paste text')}
                </TabsTrigger>
                <TabsTrigger value="upload">
                  <FileUp className="h-4 w-4 mr-1" />
                  {text(locale, 'Ladda upp fil', 'Upload file')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="pt-3">
                <Textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  rows={12}
                  placeholder={labels.placeholder[locale]}
                  className="font-mono text-sm"
                />
              </TabsContent>

              <TabsContent value="upload" className="pt-3">
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
                    <div className="flex items-center justify-between gap-2 text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        {fileIsImage && imagePreviewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imagePreviewUrl}
                            alt={file.name}
                            className="h-14 w-14 object-cover rounded border shrink-0"
                          />
                        ) : fileIsImage ? (
                          <ImageIcon className="h-7 w-7 text-purple-500 shrink-0" />
                        ) : /\.(xlsx|xls|csv)$/i.test(file.name) ? (
                          <FileSpreadsheet className="h-7 w-7 text-green-600 shrink-0" />
                        ) : (
                          <FileText className="h-7 w-7 text-red-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{file.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                            {fileIsImage &&
                              text(locale, ' · Bild → vision-läge', ' · Image -> vision mode')}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setFile(null)}
                        aria-label={text(locale, 'Ta bort filen', 'Remove file')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                      <p className="text-sm font-medium mb-1">
                        {text(
                          locale,
                          'Släpp en fil här, eller klicka för att välja',
                          'Drop a file here, or click to choose'
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {text(locale, 'Excel · CSV · PDF · text · bild', 'Excel · CSV · PDF · text · image')}
                      </p>
                      <input
                        type="file"
                        accept={ACCEPTED_FILE_EXTENSIONS}
                        className="hidden"
                        id={`workout-import-file-${workoutType}`}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) setFile(f)
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() =>
                          document
                            .getElementById(`workout-import-file-${workoutType}`)
                            ?.click()
                        }
                      >
                        {text(locale, 'Välj fil', 'Choose file')}
                      </Button>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="space-y-1 flex-1 max-w-sm">
                <Label className="text-xs">{text(locale, 'AI-kvalitet', 'AI quality')}</Label>
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
                          <span>{opt.label[locale]}</span>
                          <span className="text-xs text-muted-foreground">{opt.hint[locale]}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 rounded-lg border px-3 py-2 bg-muted/30">
                <Switch
                  id={`prefer-claude-${workoutType}`}
                  checked={preferClaude}
                  onCheckedChange={setPreferClaude}
                />
                <label
                  htmlFor={`prefer-claude-${workoutType}`}
                  className="text-xs cursor-pointer select-none"
                >
                  <div className="font-medium">{text(locale, 'Prioritera Claude', 'Prioritize Claude')}</div>
                  <div className="text-muted-foreground">
                    {text(
                      locale,
                      'Mer ordagrann — kräver Anthropic-nyckel',
                      'More literal — requires an Anthropic key'
                    )}
                  </div>
                </label>
              </div>

              <div className="flex-1" />

              <Button onClick={handleParse} disabled={!hasInput || parsing} size="lg">
                {parsing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {text(locale, 'Tolkar…', 'Parsing…')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {text(locale, 'Tolka med AI', 'Parse with AI')}
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
          </div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {text(locale, 'Förhandsgranska', 'Preview')}
                      <Badge variant="outline">{parseResult.inputKind}</Badge>
                      <Badge variant="secondary">{parseResult.modelUsed}</Badge>
                    </CardTitle>
                    <CardDescription>
                      {parseResult.workout
                        ? parseResult.workout.name
                        : text(locale, 'Schemavalidering misslyckades', 'Schema validation failed')}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setParseResult(null)}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    {text(locale, 'Ändra', 'Edit')}
                  </Button>
                </div>
              </CardHeader>
              {parseResult.workout && (
                <CardContent className="text-xs space-y-1">
                  <WorkoutSummary workout={parseResult.workout} locale={locale} />
                </CardContent>
              )}
            </Card>

            {(parseResult.warnings.length > 0 || !parseResult.parsedOk) && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <ul className="text-sm text-amber-800 space-y-0.5">
                    {parseResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                    {!parseResult.parsedOk && parseResult.warnings.length === 0 && (
                      <li>
                        {text(
                          locale,
                          'Schemavalideringen misslyckades — innehållet kanske inte fyller byggaren korrekt.',
                          'Schema validation failed — the content may not fill the builder correctly.'
                        )}
                      </li>
                    )}
                  </ul>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFixFormat}
                    disabled={fixingFormat}
                    className="bg-white"
                  >
                    {fixingFormat ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        {text(locale, 'Försöker igen…', 'Retrying…')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 mr-1" />
                        {text(
                          locale,
                          'Fixa format med kraftfullare modell',
                          'Fix format with a more powerful model'
                        )}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {totalToMap > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>
                      {workoutType === 'AGILITY'
                        ? text(locale, 'Drillkoppling', 'Drill matching')
                        : text(locale, 'Övningskoppling', 'Exercise matching')}
                    </span>
                    <Badge
                      variant={needsMapping.length === 0 ? 'outline' : 'secondary'}
                      className={
                        needsMapping.length === 0
                          ? 'text-green-700 border-green-300'
                          : ''
                      }
                    >
                      {mappedCount}/{totalToMap} {text(locale, 'mappade', 'mapped')}
                      {skippedCount > 0 &&
                        text(locale, ` · ${skippedCount} hoppade över`, ` · ${skippedCount} skipped`)}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {needsMapping.length === 0
                      ? text(
                          locale,
                          'Alla namn kopplade. Resterande stannar som fritext.',
                          'All names are matched. Remaining items stay as free text.'
                        )
                      : text(
                          locale,
                          'Välj rätt rad för att länka till biblioteket — eller hoppa över för att låta dem stanna som fritext.',
                          'Choose the right row to link it to the library, or skip it to keep it as free text.'
                        )}
                  </CardDescription>
                </CardHeader>
                {needsMapping.length > 0 && (
                  <CardContent className="space-y-2 max-h-[280px] overflow-y-auto">
                    {needsMapping.map((r) => (
                      <NeedsMappingRow
                        key={r.name}
                        resolution={r}
                        locale={locale}
                        onPick={(id) => setMapping(r.name, id)}
                        onSkip={() =>
                          setSkipped((prev) => {
                            const next = new Set(prev)
                            next.add(r.name)
                            return next
                          })
                        }
                      />
                    ))}
                  </CardContent>
                )}
              </Card>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => handleClose(false)}>
                {text(locale, 'Avbryt', 'Cancel')}
              </Button>
              <Button onClick={handleConfirm} disabled={!parseResult.workout}>
                <Sparkles className="h-4 w-4 mr-2" />
                {text(locale, 'Öppna i byggaren', 'Open in builder')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function WorkoutSummary({
  workout,
  locale,
}: {
  workout: ParsedWorkoutImport
  locale: AppLocale
}) {
  switch (workout.workoutType) {
    case 'STRENGTH': {
      const main = workout.exercises.length
      const warm = workout.warmupData?.exercises?.length ?? 0
      const prehab = workout.prehabData?.exercises?.length ?? 0
      const core = workout.coreData?.exercises?.length ?? 0
      const cool = workout.cooldownData?.exercises?.length ?? 0
      return (
        <>
          <div className="text-muted-foreground">
            {text(locale, 'Fas', 'Phase')}: {workout.phase || '—'} · {main}{' '}
            {text(locale, 'huvudövningar', 'main exercises')}
            {warm > 0 && text(locale, ` · ${warm} uppvärmning`, ` · ${warm} warm-up`)}
            {prehab > 0 && ` · ${prehab} prehab`}
            {core > 0 && ` · ${core} core`}
            {cool > 0 && text(locale, ` · ${cool} nedvarvning`, ` · ${cool} cool-down`)}
          </div>
          {workout.exercises.slice(0, 5).map((e, i) => (
            <div key={i}>
              {e.exerciseName}
              {e.sets ? ` — ${e.sets} x ${e.reps ?? '?'}` : ''}
              {e.weight ? ` @ ${e.weight} kg` : e.weightLabel ? ` @ ${e.weightLabel}` : ''}
            </div>
          ))}
          {main > 5 && (
            <div className="text-muted-foreground">
              … +{main - 5} {text(locale, 'till', 'more')}
            </div>
          )}
        </>
      )
    }
    case 'CARDIO': {
      return (
        <>
          <div className="text-muted-foreground">
            Sport: {workout.sport} · {workout.segments.length} segment
            {workout.totalDuration ? ` · ${Math.round(workout.totalDuration / 60)} min` : ''}
            {workout.totalDistance ? ` · ${(workout.totalDistance / 1000).toFixed(1)} km` : ''}
          </div>
          {workout.segments.slice(0, 5).map((s, i) => {
            if (s.type === 'REPEAT_GROUP') {
              const stepSummary = s.steps
                .map((st) =>
                  st.distance
                    ? `${st.distance >= 1000 ? `${(st.distance / 1000).toFixed(1)}km` : `${st.distance}m`} ${st.type.toLowerCase()}`
                    : st.duration
                      ? `${Math.round(st.duration / 60)}min ${st.type.toLowerCase()}`
                      : st.type.toLowerCase()
                )
                .join(' + ')
              return (
                <div key={i}>
                  {s.repeats}× ({stepSummary})
                  {s.restBetweenRounds
                    ? text(
                        locale,
                        `, ${s.restBetweenRounds}s mellan varv`,
                        `, ${s.restBetweenRounds}s between rounds`
                      )
                    : ''}
                </div>
              )
            }
            return (
              <div key={i}>
                {s.type}
                {s.duration ? ` — ${Math.round(s.duration / 60)} min` : ''}
                {s.distance ? ` — ${s.distance >= 1000 ? `${(s.distance / 1000).toFixed(1)} km` : `${s.distance} m`}` : ''}
                {s.pace ? ` @ ${s.pace}` : ''}
                {s.zone ? text(locale, ` · zon ${s.zone}`, ` · zone ${s.zone}`) : ''}
              </div>
            )
          })}
          {workout.segments.length > 5 && (
            <div className="text-muted-foreground">
              … +{workout.segments.length - 5} {text(locale, 'till', 'more')}
            </div>
          )}
        </>
      )
    }
    case 'HYBRID': {
      return (
        <>
          <div className="text-muted-foreground">
            Format: {workout.format} · {workout.movements.length}{' '}
            {text(locale, 'rörelser', 'movements')}
            {workout.repScheme ? ` · ${workout.repScheme}` : ''}
            {workout.timeCap ? ` · cap ${Math.round(workout.timeCap / 60)} min` : ''}
            {workout.totalMinutes ? ` · ${workout.totalMinutes} min` : ''}
          </div>
          {workout.movements.slice(0, 5).map((m, i) => (
            <div key={i}>
              {m.exerciseName}
              {m.reps ? ` — ${m.reps} reps` : ''}
              {m.calories ? ` — ${m.calories} cal` : ''}
              {m.distance ? ` — ${m.distance} m` : ''}
              {m.weightMale || m.weightFemale
                ? ` @ ${m.weightMale ?? '?'}/${m.weightFemale ?? '?'} kg`
                : ''}
            </div>
          ))}
          {workout.movements.length > 5 && (
            <div className="text-muted-foreground">
              … +{workout.movements.length - 5} {text(locale, 'till', 'more')}
            </div>
          )}
        </>
      )
    }
    case 'AGILITY': {
      return (
        <>
          <div className="text-muted-foreground">
            Format: {workout.format} · {workout.drills.length} drills
            {workout.totalDuration ? ` · ${workout.totalDuration} min` : ''}
          </div>
          {workout.drills.slice(0, 5).map((d, i) => (
            <div key={i}>
              {d.drillName}
              {d.sets ? ` — ${d.sets} set` : ''}
              {d.reps ? ` x ${d.reps}` : ''}
              {d.duration ? ` — ${d.duration}s` : ''}
            </div>
          ))}
          {workout.drills.length > 5 && (
            <div className="text-muted-foreground">
              … +{workout.drills.length - 5} {text(locale, 'till', 'more')}
            </div>
          )}
        </>
      )
    }
  }
}

function NeedsMappingRow({
  resolution,
  locale,
  onPick,
  onSkip,
}: {
  resolution: Resolution
  locale: AppLocale
  onPick: (id: string) => void
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
            {text(locale, 'Från importen', 'From import')}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          onClick={onSkip}
        >
          {text(locale, 'Hoppa över', 'Skip')}
        </Button>
      </div>
      {top.length === 0 ? (
        <div className="text-xs text-muted-foreground italic py-1">
          {text(
            locale,
            'Inga rimliga träffar — namnet stannar som fritext.',
            'No reasonable matches — the name will stay as free text.'
          )}
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
                {(c.biomechanicalPillar || c.equipment) && (
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
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
