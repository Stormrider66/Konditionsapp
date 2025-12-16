'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
  webSearchEnabled: boolean
  onAthleteChange: (athleteId: string | null) => void
  onDocumentsChange: (documentIds: string[]) => void
  onWebSearchChange: (enabled: boolean) => void
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
  webSearchEnabled,
  onAthleteChange,
  onDocumentsChange,
  onWebSearchChange,
}: ContextPanelProps) {
  const [athleteOpen, setAthleteOpen] = useState(true)
  const [documentsOpen, setDocumentsOpen] = useState(true)
  const [searchOpen, setSearchOpen] = useState(true)

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

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Kontext</h2>
        </div>

        {/* Athlete Selection */}
        <Collapsible open={athleteOpen} onOpenChange={setAthleteOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition py-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Atlet
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      athleteOpen ? 'rotate-180' : ''
                    }`}
                  />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Select
                  value={selectedAthlete || 'none'}
                  onValueChange={(value) =>
                    onAthleteChange(value === 'none' ? null : value)
                  }
                >
                  <SelectTrigger className="w-full">
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
                  <div className="mt-3 p-2 bg-muted rounded-lg text-sm">
                    <p className="font-medium">
                      {clients.find((c) => c.id === selectedAthlete)?.name}
                    </p>

                    {/* Context summary indicators */}
                    {loadingSummary ? (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
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
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 bg-green-50 text-green-700 border-green-200">
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
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 bg-blue-50 text-blue-700 border-blue-200">
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
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 bg-purple-50 text-purple-700 border-purple-200">
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
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 bg-amber-50 text-amber-700 border-amber-200">
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
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 bg-teal-50 text-teal-700 border-teal-200">
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
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 bg-orange-50 text-orange-700 border-orange-200">
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
                          <p className="text-xs text-muted-foreground">
                            Ingen träningsdata tillgänglig
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs mt-1">
                        Atletens data kommer inkluderas i AI-kontexten
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Documents Selection - Enhanced */}
        <Collapsible open={documentsOpen} onOpenChange={setDocumentsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition py-3">
                <CardTitle className="text-sm flex items-center justify-between">
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
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {documents.length === 0 ? (
                  <div className="text-center py-4">
                    <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Inga dokument uppladdade
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">
                      Ladda upp träningsdokument, metodikguider, <br />kalender eller Excel-filer
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      asChild
                    >
                      <Link href="/coach/documents">
                        <Upload className="h-3 w-3 mr-1" />
                        Ladda upp dokument
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Search input */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Sök dokument..."
                        value={docSearchQuery}
                        onChange={(e) => setDocSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-sm"
                      />
                      {docSearchQuery && (
                        <button
                          onClick={() => setDocSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                        className="text-xs h-7"
                      >
                        Välj {docCategoryFilter !== 'ALL' || docSearchQuery ? 'filtrerade' : 'alla'}
                      </Button>
                      <div className="flex gap-1">
                        {(docCategoryFilter !== 'ALL' || docSearchQuery) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="text-xs h-7"
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
                            className="text-xs h-7 text-destructive hover:text-destructive"
                          >
                            Rensa val
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Document list */}
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {filteredDocuments.length === 0 ? (
                        <div className="text-center py-4 text-sm text-muted-foreground">
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
                                  ? 'hover:bg-muted/50 cursor-pointer'
                                  : 'opacity-60 cursor-not-allowed'
                              } ${
                                selectedDocuments.includes(doc.id) ? 'bg-muted/30 border border-primary/20' : ''
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
                                  <span className="text-sm font-medium truncate">
                                    {doc.name}
                                  </span>
                                </div>
                                {doc.description && (
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                                    {doc.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                                    {doc.fileType}
                                  </Badge>
                                  {doc.processingStatus === 'COMPLETED' ? (
                                    <span className="text-[10px] text-muted-foreground">
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
                          <div className="text-amber-700 dark:text-amber-400">
                            Vissa dokument väntar på bearbetning. Gå till{' '}
                            <Link href="/coach/documents" className="underline font-medium">
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
                          <div className="text-blue-700 dark:text-blue-400">
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
                      className="w-full h-8 text-xs"
                      asChild
                    >
                      <Link href="/coach/documents">
                        <Upload className="h-3 w-3 mr-1" />
                        Hantera dokument
                      </Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Web Search Toggle */}
        <Collapsible open={searchOpen} onOpenChange={setSearchOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition py-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Webbsökning
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      searchOpen ? 'rotate-180' : ''
                    }`}
                  />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="web-search" className="text-sm">
                      Aktivera webbsökning
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      AI kan söka på internet efter information
                    </p>
                  </div>
                  <Switch
                    id="web-search"
                    checked={webSearchEnabled}
                    onCheckedChange={onWebSearchChange}
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Quick Stats */}
        <Card>
          <CardContent className="py-3">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Vald atlet:</span>
                <span className="font-medium">
                  {selectedAthlete
                    ? clients.find((c) => c.id === selectedAthlete)?.name
                    : 'Ingen'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Valda dokument:</span>
                <span className="font-medium">{selectedDocuments.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Webbsökning:</span>
                <span className="font-medium">
                  {webSearchEnabled ? 'På' : 'Av'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
