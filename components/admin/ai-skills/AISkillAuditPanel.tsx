'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useLocale } from '@/i18n/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Bot, BookOpen, CheckCircle2, RefreshCw, Search, TriangleAlert } from 'lucide-react'

type SkillHealth =
  | 'ready'
  | 'inactive'
  | 'missing_document'
  | 'document_failed'
  | 'no_chunks'
  | 'missing_embedding'

type SkillSurface = {
  name: string
  status: 'connected' | 'separate'
  detail: string
}

type SkillRow = {
  id: string
  name: string
  nameEn: string | null
  category: string
  isActive: boolean
  priority: number
  maxChunks: number
  keywords: string[]
  documentCount: number
  totalChunks: number
  hasEmbedding: boolean
  health: SkillHealth
  updatedAt: string
}

type SkillAuditResponse = {
  success: boolean
  data?: {
    summary: {
      totalSkills: number
      activeSkills: number
      inactiveSkills: number
      linkedDocumentIds: number
      linkedSystemDocuments: number
      linkedChunks: number
      readySkills: number
      skillsWithoutDocuments: number
      skillsWithMissingDocuments: number
      skillsWithoutChunks: number
      skillsWithoutEmbedding: number
      failedDocuments: number
    }
    surfaces: SkillSurface[]
    skills: SkillRow[]
  }
  error?: string
}

type AppLocale = 'en' | 'sv'

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en')

const healthLabels: Record<AppLocale, Record<SkillHealth, string>> = {
  en: {
    ready: 'Ready',
    inactive: 'Inactive',
    missing_document: 'Missing document',
    document_failed: 'Document error',
    no_chunks: 'Missing chunks',
    missing_embedding: 'Missing embedding',
  },
  sv: {
    ready: 'Redo',
    inactive: 'Inaktiv',
    missing_document: 'Saknar dokument',
    document_failed: 'Dokumentfel',
    no_chunks: 'Saknar chunks',
    missing_embedding: 'Saknar embedding',
  },
}

const labels = {
  en: {
    fallbackLoadError: 'Could not load AI skills.',
    networkError: 'Could not reach the AI skill audit right now.',
    noAuditData: 'No audit data was found.',
    retry: 'Try again',
    description:
      'Check that knowledge skills are active, linked to documents, and available to the AI surfaces.',
    refresh: 'Refresh',
    activeSkills: 'Active skills',
    of: 'of',
    greenHealth: 'green health status',
    systemDocuments: 'System documents',
    linkedTotal: 'linked total',
    knowledgeChunks: 'Knowledge chunks',
    availableForRetrieval: 'available for retrieval',
    warnings: 'Warnings',
    criticalLinksChunks: 'critical links/chunks',
    connected: 'Connected',
    separate: 'Separate',
    library: 'Skill library',
    libraryDescription:
      'Search by name, category, or trigger word to see what the AI can retrieve.',
    searchPlaceholder: 'Search skills...',
    category: 'Category',
    documents: 'Documents',
    triggerWords: 'Trigger words',
    noMatches: 'No skills match the search.',
  },
  sv: {
    fallbackLoadError: 'Kunde inte läsa AI-skills.',
    networkError: 'Kunde inte nå AI-skill audit just nu.',
    noAuditData: 'Ingen auditdata hittades.',
    retry: 'Försök igen',
    description:
      'Kontrollera att kunskapsskills är aktiva, länkade till dokument och tillgängliga för AI-ytorna.',
    refresh: 'Uppdatera',
    activeSkills: 'Aktiva skills',
    of: 'av',
    greenHealth: 'hälsostatus grön',
    systemDocuments: 'Systemdokument',
    linkedTotal: 'länkade totalt',
    knowledgeChunks: 'Kunskapsbitar',
    availableForRetrieval: 'tillgängliga för retrieval',
    warnings: 'Varningar',
    criticalLinksChunks: 'kritiska länkar/chunks',
    connected: 'Kopplad',
    separate: 'Separat',
    library: 'Skillbibliotek',
    libraryDescription:
      'Sök på namn, kategori eller triggerord för att se vad AI:n kan hämta.',
    searchPlaceholder: 'Sök skills...',
    category: 'Kategori',
    documents: 'Dokument',
    triggerWords: 'Triggerord',
    noMatches: 'Inga skills matchar sökningen.',
  },
}

const healthClasses: Record<SkillHealth, string> = {
  ready: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-slate-100 text-slate-700',
  missing_document: 'bg-red-100 text-red-800',
  document_failed: 'bg-red-100 text-red-800',
  no_chunks: 'bg-amber-100 text-amber-800',
  missing_embedding: 'bg-blue-100 text-blue-800',
}

export function AISkillAuditPanel() {
  const appLocale = getAppLocale(useLocale())
  const copy = labels[appLocale]
  const [data, setData] = useState<SkillAuditResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fetchAudit = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/ai-skills/audit')
      const payload = (await response.json()) as SkillAuditResponse
      if (!response.ok || !payload.success || !payload.data) {
        setError(payload.error || copy.fallbackLoadError)
        return
      }
      setData(payload.data)
    } catch {
      setError(copy.networkError)
    } finally {
      setLoading(false)
    }
  }, [copy.fallbackLoadError, copy.networkError])

  useEffect(() => {
    void Promise.resolve().then(fetchAudit)
  }, [fetchAudit])

  const filteredSkills = useMemo(() => {
    if (!data) return []
    const needle = query.trim().toLowerCase()
    if (!needle) return data.skills
    return data.skills.filter((skill) => {
      return [
        skill.name,
        skill.nameEn || '',
        skill.category,
        ...skill.keywords,
      ].some((value) => value.toLowerCase().includes(needle))
    })
  }, [data, query])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <TriangleAlert className="h-5 w-5 text-amber-600" />
            <span>{error || copy.noAuditData}</span>
          </div>
          <Button variant="outline" onClick={fetchAudit}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {copy.retry}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { summary } = data
  const hasWarnings =
    summary.skillsWithMissingDocuments > 0 ||
    summary.skillsWithoutChunks > 0 ||
    summary.failedDocuments > 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Skills
              </CardTitle>
              <CardDescription>
                {copy.description}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAudit}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {copy.refresh}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">{copy.activeSkills}</p>
              <p className="text-2xl font-bold">{summary.activeSkills}</p>
              <p className="text-xs text-muted-foreground">
                {copy.of} {summary.totalSkills}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">{healthLabels[appLocale].ready}</p>
              <p className="text-2xl font-bold">{summary.readySkills}</p>
              <p className="text-xs text-muted-foreground">{copy.greenHealth}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">{copy.systemDocuments}</p>
              <p className="text-2xl font-bold">{summary.linkedSystemDocuments}</p>
              <p className="text-xs text-muted-foreground">
                {summary.linkedDocumentIds} {copy.linkedTotal}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">{copy.knowledgeChunks}</p>
              <p className="text-2xl font-bold">{summary.linkedChunks}</p>
              <p className="text-xs text-muted-foreground">{copy.availableForRetrieval}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">{copy.warnings}</p>
              <p className={`text-2xl font-bold ${hasWarnings ? 'text-amber-700' : 'text-emerald-700'}`}>
                {summary.skillsWithMissingDocuments + summary.skillsWithoutChunks + summary.failedDocuments}
              </p>
              <p className="text-xs text-muted-foreground">{copy.criticalLinksChunks}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {data.surfaces.map((surface) => (
              <div key={surface.name} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{surface.name}</p>
                  <Badge
                    className={
                      surface.status === 'connected'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }
                  >
                    {surface.status === 'connected' ? copy.connected : copy.separate}
                  </Badge>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{surface.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4" />
                {copy.library}
              </CardTitle>
              <CardDescription>
                {copy.libraryDescription}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={copy.searchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead>{copy.category}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">{copy.documents}</TableHead>
                  <TableHead className="text-right">Chunks</TableHead>
                  <TableHead className="text-right">Max</TableHead>
                  <TableHead>{copy.triggerWords}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSkills.map((skill) => (
                  <TableRow key={skill.id}>
                    <TableCell>
                      <div className="font-medium">{skill.name}</div>
                      {skill.nameEn && (
                        <div className="text-xs text-muted-foreground">{skill.nameEn}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{skill.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={healthClasses[skill.health]}>
                        {skill.health === 'ready' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {healthLabels[appLocale][skill.health]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{skill.documentCount}</TableCell>
                    <TableCell className="text-right">{skill.totalChunks}</TableCell>
                    <TableCell className="text-right">{skill.maxChunks}</TableCell>
                    <TableCell>
                      <div className="flex max-w-xl flex-wrap gap-1">
                        {skill.keywords.slice(0, 7).map((keyword) => (
                          <Badge key={keyword} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {skill.keywords.length > 7 && (
                          <Badge variant="outline" className="text-xs">
                            +{skill.keywords.length - 7}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredSkills.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {copy.noMatches}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
