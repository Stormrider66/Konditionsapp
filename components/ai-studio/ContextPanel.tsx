'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
} from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  User,
  FileText,
  Globe,
  Sparkles,
  ChevronDown,
  Upload,
  FolderOpen,
  Search,
  Filter,
  X,
  FileSpreadsheet,
  FileVideo,
  FileType,
  Info,
  AlertTriangle,
  Clock,
  CheckCircle,
  Activity,
  Trophy,
  Calendar,
  Heart,
  Scale,
  Loader2,
  Video,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AISkillPicker } from '@/components/ai/AISkillPicker'

interface Client {
  id: string
  name: string
  email: string | null
  sportProfile?: {
    primarySport: string
  } | null
}

interface Document {
  id: string
  name: string
  description: string | null
  fileType: string
  chunkCount: number
  createdAt: Date
  processingStatus: string
}

interface ContextPanelProps {
  clients: Client[]
  documents: Document[]
  selectedAthlete: string | null
  selectedDocuments: string[]
  selectedSkillIds: string[]
  webSearchEnabled: boolean
  onAthleteChange: (athleteId: string | null) => void
  onDocumentsChange: (documentIds: string[]) => void
  onSelectedSkillIdsChange: (skillIds: string[]) => void
  onWebSearchChange: (enabled: boolean) => void
  skillSelectionDisabled?: boolean
}

// Document category types
type DocumentCategory = 'ALL' | 'PDF' | 'EXCEL' | 'MARKDOWN' | 'VIDEO'

// Context summary from API
interface ContextSummary {
  athleteName: string
  sport: string | null
  hasProfile: boolean
  hasTests: boolean
  hasRaces: boolean
  hasProgram: boolean
  hasFieldTests: boolean
  hasCheckIns: boolean
  hasInjuries: boolean
  hasBodyComp: boolean
  hasVideoAnalyses: boolean
  counts: {
    tests: number
    races: number
    programs: number
    fieldTests: number
    checkIns: number
    injuries: number
    bodyComps: number
    videoAnalyses: number
  }
  latestTest: {
    date: string
    vo2max: number | null
  } | null
  latestRace: {
    name: string | null
    distance: string
    vdot: number | null
  } | null
  latestVideoAnalysis: {
    date: string
    formScore: number | null
    injuryRiskLevel: string | null
    asymmetryPercent: number | null
  } | null
}

export function ContextPanel({
  clients,
  documents,
  selectedAthlete,
  selectedDocuments,
  selectedSkillIds,
  webSearchEnabled,
  onAthleteChange,
  onDocumentsChange,
  onSelectedSkillIdsChange,
  onWebSearchChange,
  skillSelectionDisabled = false,
}: ContextPanelProps) {
  const pathname = usePathname()
  const pathBusinessSlug = getBusinessSlugFromPathname(pathname)
  const basePath = pathBusinessSlug ? `/${pathBusinessSlug}` : ''
  const documentsHref = pathBusinessSlug ? `${basePath}/coach/documents` : '/login'
  const [mounted, setMounted] = useState(false)
  const [athleteOpen, setAthleteOpen] = useState(true)
  const [documentsOpen, setDocumentsOpen] = useState(true)
  const [skillsOpen, setSkillsOpen] = useState(true)
  const [searchOpen, setSearchOpen] = useState(true)

  // Prevent hydration mismatch with Radix UI IDs
  useEffect(() => {
    setMounted(true)
  }, [])

  // Context summary state
  const [contextSummary, setContextSummary] = useState<ContextSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  // Fetch context summary when athlete changes
  useEffect(() => {
    if (!selectedAthlete) {
      setContextSummary(null)
      return
    }

    async function fetchSummary() {
      setLoadingSummary(true)
      try {
        const response = await fetch(`/api/clients/${selectedAthlete}/context-summary`)
        if (response.ok) {
          const data = await response.json()
          setContextSummary(data)
        }
      } catch (error) {
        console.error('Error fetching context summary:', error)
      } finally {
        setLoadingSummary(false)
      }
    }

    fetchSummary()
  }, [selectedAthlete])

  // Document search and filter state
  const [docSearchQuery, setDocSearchQuery] = useState('')
  const [docCategoryFilter, setDocCategoryFilter] = useState<DocumentCategory>('ALL')

  // Filter documents based on search and category
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Category filter
      if (docCategoryFilter !== 'ALL' && doc.fileType !== docCategoryFilter) {
        return false
      }
      // Search filter
      if (docSearchQuery.trim()) {
        const query = docSearchQuery.toLowerCase()
        return (
          doc.name.toLowerCase().includes(query) ||
          (doc.description && doc.description.toLowerCase().includes(query))
        )
      }
      return true
    })
  }, [documents, docSearchQuery, docCategoryFilter])

  // Count documents by category
  const documentCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: documents.length }
    documents.forEach((doc) => {
      counts[doc.fileType] = (counts[doc.fileType] || 0) + 1
    })
    return counts
  }, [documents])

  const toggleDocument = (docId: string) => {
    if (selectedDocuments.includes(docId)) {
      onDocumentsChange(selectedDocuments.filter((id) => id !== docId))
    } else {
      onDocumentsChange([...selectedDocuments, docId])
    }
  }

  const selectAllFiltered = () => {
    const filteredIds = filteredDocuments.map((d) => d.id)
    const newSelection = [...new Set([...selectedDocuments, ...filteredIds])]
    onDocumentsChange(newSelection)
  }

  const clearDocuments = () => {
    onDocumentsChange([])
  }

  const clearFilters = () => {
    setDocSearchQuery('')
    setDocCategoryFilter('ALL')
  }

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case 'PDF':
        return <FileText className="h-4 w-4 text-red-500" />
      case 'EXCEL':
        return <FileSpreadsheet className="h-4 w-4 text-green-600" />
      case 'MARKDOWN':
        return <FileType className="h-4 w-4 text-blue-500" />
      case 'VIDEO':
        return <FileVideo className="h-4 w-4 text-purple-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getCategoryLabel = (category: DocumentCategory) => {
    switch (category) {
      case 'ALL': return 'Alla'
      case 'PDF': return 'PDF'
      case 'EXCEL': return 'Excel'
      case 'MARKDOWN': return 'Markdown'
      case 'VIDEO': return 'Video'
    }
  }

  const getProcessingStatusInfo = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return {
          icon: <CheckCircle className="h-3 w-3 text-green-500" />,
          label: 'Klar',
          color: 'text-green-600',
          canSelect: true,
        }
      case 'PROCESSING':
        return {
          icon: <Clock className="h-3 w-3 text-blue-500 animate-pulse" />,
          label: 'Bearbetar...',
          color: 'text-blue-600',
          canSelect: false,
        }
      case 'FAILED':
        return {
          icon: <AlertTriangle className="h-3 w-3 text-red-500" />,
          label: 'Misslyckades',
          color: 'text-red-600',
          canSelect: false,
        }
      case 'PENDING':
      default:
        return {
          icon: <Clock className="h-3 w-3 text-amber-500" />,
          label: 'Väntar',
          color: 'text-amber-600',
          canSelect: false,
        }
    }
  }

  const getSportLabel = (sport: string) => {
    const sportLabels: Record<string, string> = {
      RUNNING: 'Löpning',
      CYCLING: 'Cykling',
      SWIMMING: 'Simning',
      TRIATHLON: 'Triathlon',
      HYROX: 'HYROX',
      SKIING: 'Skidåkning',
      GENERAL_FITNESS: 'Allmän träning',
    }
    return sportLabels[sport] || sport
  }

  // Show skeleton while mounting to prevent hydration mismatch
  if (!mounted) {
    return (
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Kontext</h2>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-muted rounded-lg" />
            <div className="h-32 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        </div>
      </ScrollArea>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Kontext</h2>
        </div>

        {/* Athlete Selection */}
        <Collapsible open={athleteOpen} onOpenChange={setAthleteOpen}>
          <GlassCard glow="none">
            <CollapsibleTrigger asChild>
              <GlassCardHeader className="cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/5 transition py-3">
                <GlassCardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Atlet
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      athleteOpen ? 'rotate-180' : ''
                    }`}
                  />
                </GlassCardTitle>
              </GlassCardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <GlassCardContent className="pt-0">
                <Select
                  value={selectedAthlete || 'none'}
                  onValueChange={(value) =>
                    onAthleteChange(value === 'none' ? null : value)
                  }
                >
                  <SelectTrigger className="w-full bg-slate-100 dark:bg-slate-900/40">
                    <SelectValue placeholder="Välj atlet..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ingen atlet vald</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center gap-2">
                          <span>{client.name}</span>
                          {client.sportProfile?.primarySport && (
                            <Badge variant="outline" className="text-xs">
                              {getSportLabel(client.sportProfile.primarySport)}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedAthlete && (
                  <div className="mt-3 p-2 bg-slate-100/80 dark:bg-slate-900/50 rounded-lg text-sm border border-slate-200 dark:border-white/5">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {clients.find((c) => c.id === selectedAthlete)?.name}
                    </p>

                    {/* Context summary indicators */}
                    {loadingSummary ? (
                      <div className="flex items-center gap-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Laddar data...
                      </div>
                    ) : contextSummary ? (
                      <div className="mt-2 space-y-1.5">
                        {/* Data availability badges */}
                        <div className="flex flex-wrap gap-1">
                          <TooltipProvider>
                            {contextSummary.hasTests && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900/50">
                                    <Activity className="h-3 w-3" />
                                    Test
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{contextSummary.counts.tests} laktattest</p>
                                  {contextSummary.latestTest?.vo2max && (
                                    <p className="text-xs">VO2max: {contextSummary.latestTest.vo2max.toFixed(1)}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {contextSummary.hasRaces && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50">
                                    <Trophy className="h-3 w-3" />
                                    Lopp
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{contextSummary.counts.races} tävlingar</p>
                                  {contextSummary.latestRace?.vdot && (
                                    <p className="text-xs">VDOT: {contextSummary.latestRace.vdot.toFixed(1)}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {contextSummary.hasProgram && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50">
                                    <Calendar className="h-3 w-3" />
                                    Program
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{contextSummary.counts.programs} träningsprogram</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {contextSummary.hasCheckIns && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50">
                                    <Heart className="h-3 w-3" />
                                    Check-in
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{contextSummary.counts.checkIns} dagliga check-ins</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {contextSummary.hasBodyComp && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-900/50">
                                    <Scale className="h-3 w-3" />
                                    Kropp
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{contextSummary.counts.bodyComps} kroppssammansättningar</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {contextSummary.hasVideoAnalyses && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-900/50">
                                    <Video className="h-3 w-3" />
                                    Video
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{contextSummary.counts.videoAnalyses} videoanalyser</p>
                                  {contextSummary.latestVideoAnalysis?.formScore && (
                                    <p className="text-xs">Formpoäng: {contextSummary.latestVideoAnalysis.formScore}/100</p>
                                  )}
                                  {contextSummary.latestVideoAnalysis?.injuryRiskLevel && (
                                    <p className="text-xs">Skaderisk: {contextSummary.latestVideoAnalysis.injuryRiskLevel}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </div>

                        {/* No data indicator */}
                        {!contextSummary.hasTests && !contextSummary.hasRaces && !contextSummary.hasProgram && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Ingen träningsdata tillgänglig
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                        Atletens data kommer inkluderas i AI-kontexten
                      </p>
                    )}
                  </div>
                )}
              </GlassCardContent>
            </CollapsibleContent>
          </GlassCard>
        </Collapsible>

        {/* Documents Selection - Enhanced */}
        <Collapsible open={documentsOpen} onOpenChange={setDocumentsOpen}>
          <GlassCard glow="none">
            <CollapsibleTrigger asChild>
              <GlassCardHeader className="cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/5 transition py-3">
                <GlassCardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Dokument
                    {selectedDocuments.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {selectedDocuments.length}
                      </Badge>
                    )}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      documentsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </GlassCardTitle>
              </GlassCardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <GlassCardContent className="pt-0 space-y-3">
                {documents.length === 0 ? (
                  <div className="text-center py-4">
                    <FolderOpen className="h-8 w-8 mx-auto text-slate-400/50 mb-2" />
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Inga dokument uppladdade
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                      Ladda upp träningsdokument, metodikguider, <br />kalender eller Excel-filer
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      asChild
                    >
                      <Link href={documentsHref}>
                        <Upload className="h-3 w-3 mr-1" />
                        Ladda upp dokument
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Search input */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Sök dokument..."
                        value={docSearchQuery}
                        onChange={(e) => setDocSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-sm bg-slate-100 dark:bg-slate-900/40"
                      />
                      {docSearchQuery && (
                        <button
                          onClick={() => setDocSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Category filter buttons */}
                    <div className="flex flex-wrap gap-1">
                      {(['ALL', 'PDF', 'EXCEL', 'MARKDOWN', 'VIDEO'] as DocumentCategory[]).map((cat) => {
                        const count = documentCounts[cat] || 0
                        if (cat !== 'ALL' && count === 0) return null
                        return (
                          <Button
                            key={cat}
                            variant={docCategoryFilter === cat ? 'default' : 'outline'}
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => setDocCategoryFilter(cat)}
                          >
                            {getCategoryLabel(cat)}
                            {cat !== 'ALL' && (
                              <span className="ml-1 opacity-70">({count})</span>
                            )}
                          </Button>
                        )
                      })}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAllFiltered}
                        className="text-xs h-7 hover:bg-slate-200/50 dark:hover:bg-white/5"
                      >
                        Välj {docCategoryFilter !== 'ALL' || docSearchQuery ? 'filtrerade' : 'alla'}
                      </Button>
                      <div className="flex gap-1">
                        {(docCategoryFilter !== 'ALL' || docSearchQuery) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="text-xs h-7 hover:bg-slate-200/50 dark:hover:bg-white/5"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Filter
                          </Button>
                        )}
                        {selectedDocuments.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearDocuments}
                            className="text-xs h-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            Rensa val
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Document list */}
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {filteredDocuments.length === 0 ? (
                        <div className="text-center py-4 text-sm text-slate-500">
                          Inga dokument matchar filtret
                        </div>
                      ) : (
                        filteredDocuments.map((doc) => {
                          const statusInfo = getProcessingStatusInfo(doc.processingStatus)
                          const isSelectable = statusInfo.canSelect

                          return (
                            <div
                              key={doc.id}
                              className={`flex items-start gap-2 p-2 rounded-lg transition ${
                                isSelectable
                                  ? 'hover:bg-slate-200/50 dark:hover:bg-white/5 cursor-pointer'
                                  : 'opacity-60 cursor-not-allowed'
                              } ${
                                selectedDocuments.includes(doc.id) ? 'bg-slate-150/80 dark:bg-slate-900/60 border border-slate-300 dark:border-white/10' : ''
                              }`}
                              onClick={() => isSelectable && toggleDocument(doc.id)}
                            >
                              <Checkbox
                                id={`doc-${doc.id}`}
                                checked={selectedDocuments.includes(doc.id)}
                                onCheckedChange={() => isSelectable && toggleDocument(doc.id)}
                                className="mt-0.5"
                                disabled={!isSelectable}
                              />
                              <label
                                htmlFor={`doc-${doc.id}`}
                                className={`flex-1 min-w-0 ${isSelectable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                              >
                                <div className="flex items-center gap-1.5">
                                  {getFileTypeIcon(doc.fileType)}
                                  <span className="text-sm font-medium truncate text-slate-800 dark:text-slate-200">
                                    {doc.name}
                                  </span>
                                </div>
                                {doc.description && (
                                  <p className="text-xs text-slate-550 dark:text-slate-400 truncate mt-0.5">
                                    {doc.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                                    {doc.fileType}
                                  </Badge>
                                  {doc.processingStatus === 'COMPLETED' ? (
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                      {doc.chunkCount} delar
                                    </span>
                                  ) : (
                                    <span className={`text-[10px] flex items-center gap-1 ${statusInfo.color}`}>
                                      {statusInfo.icon}
                                      {statusInfo.label}
                                    </span>
                                  )}
                                </div>
                              </label>
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* Pending documents notice */}
                    {filteredDocuments.some(d => d.processingStatus !== 'COMPLETED') && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 text-xs">
                        <div className="flex items-start gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div className="text-amber-750 dark:text-amber-400">
                            Vissa dokument väntar på bearbetning. Gå till{' '}
                            <Link href={documentsHref} className="underline font-medium">
                              Dokument
                            </Link>{' '}
                            och klicka &quot;Generera&quot; för att aktivera dem.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Document tips */}
                    {selectedDocuments.length > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2 text-xs">
                        <div className="flex items-start gap-1.5">
                          <Info className="h-3.5 w-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-blue-750 dark:text-blue-400">
                            <strong>{selectedDocuments.length}</strong> dokument valda.
                            AI kan referera till dessa vid programskapande.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Upload link */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs bg-slate-100 dark:bg-slate-900/40"
                      asChild
                    >
                      <Link href={documentsHref}>
                        <Upload className="h-3 w-3 mr-1" />
                        Hantera dokument
                      </Link>
                    </Button>
                  </>
                )}
              </GlassCardContent>
            </CollapsibleContent>
          </GlassCard>
        </Collapsible>

        {/* AI Skills Selection */}
        <Collapsible open={skillsOpen} onOpenChange={setSkillsOpen}>
          <GlassCard glow="none">
            <CollapsibleTrigger asChild>
              <GlassCardHeader className="cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/5 transition py-3">
                <GlassCardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI skills
                    {selectedSkillIds.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {selectedSkillIds.length}
                      </Badge>
                    )}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      skillsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </GlassCardTitle>
              </GlassCardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <GlassCardContent className="pt-0">
                <AISkillPicker
                  selectedSkillIds={selectedSkillIds}
                  onSelectedSkillIdsChange={onSelectedSkillIdsChange}
                  disabled={skillSelectionDisabled}
                  side="right"
                  align="start"
                  triggerClassName="h-8 text-xs w-full bg-slate-100 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200 border-slate-250 dark:border-white/5"
                  chipsClassName="max-w-full"
                />
              </GlassCardContent>
            </CollapsibleContent>
          </GlassCard>
        </Collapsible>

        {/* Web Search Toggle */}
        <Collapsible open={searchOpen} onOpenChange={setSearchOpen}>
          <GlassCard glow="none">
            <CollapsibleTrigger asChild>
              <GlassCardHeader className="cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/5 transition py-3">
                <GlassCardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Webbsökning
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      searchOpen ? 'rotate-180' : ''
                    }`}
                  />
                </GlassCardTitle>
              </GlassCardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <GlassCardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="web-search" className="text-sm text-slate-800 dark:text-slate-200">
                      Aktivera webbsökning
                    </Label>
                    <p className="text-xs text-slate-550 dark:text-slate-400">
                      AI kan söka på internet efter information
                    </p>
                  </div>
                  <Switch
                    id="web-search"
                    checked={webSearchEnabled}
                    onCheckedChange={onWebSearchChange}
                  />
                </div>
              </GlassCardContent>
            </CollapsibleContent>
          </GlassCard>
        </Collapsible>

        {/* Quick Stats */}
        <GlassCard glow="none">
          <GlassCardContent className="py-3">
            <div className="text-xs text-slate-550 dark:text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Vald atlet:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedAthlete
                    ? clients.find((c) => c.id === selectedAthlete)?.name
                    : 'Ingen'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Valda dokument:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedDocuments.length}</span>
              </div>
              <div className="flex justify-between">
                <span>AI skills:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedSkillIds.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Webbsökning:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {webSearchEnabled ? 'På' : 'Av'}
                </span>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    </ScrollArea>
  )
}
