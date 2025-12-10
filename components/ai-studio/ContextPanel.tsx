'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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
} from 'lucide-react'
import Link from 'next/link'

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

  const toggleDocument = (docId: string) => {
    if (selectedDocuments.includes(docId)) {
      onDocumentsChange(selectedDocuments.filter((id) => id !== docId))
    } else {
      onDocumentsChange([...selectedDocuments, docId])
    }
  }

  const selectAllDocuments = () => {
    onDocumentsChange(documents.map((d) => d.id))
  }

  const clearDocuments = () => {
    onDocumentsChange([])
  }

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case 'PDF':
        return '📄'
      case 'EXCEL':
        return '📊'
      case 'MARKDOWN':
        return '📝'
      case 'VIDEO':
        return '🎥'
      default:
        return '📁'
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
                    <p className="text-muted-foreground text-xs">
                      Atletens data kommer inkluderas i AI-kontexten
                    </p>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Documents Selection */}
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      asChild
                    >
                      <Link href="/coach/documents">
                        <Upload className="h-3 w-3 mr-1" />
                        Ladda upp
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAllDocuments}
                        className="text-xs h-7"
                      >
                        Välj alla
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearDocuments}
                        className="text-xs h-7"
                      >
                        Rensa
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition"
                        >
                          <Checkbox
                            id={`doc-${doc.id}`}
                            checked={selectedDocuments.includes(doc.id)}
                            onCheckedChange={() => toggleDocument(doc.id)}
                          />
                          <label
                            htmlFor={`doc-${doc.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-1">
                              <span>{getFileTypeIcon(doc.fileType)}</span>
                              <span className="text-sm font-medium truncate">
                                {doc.name}
                              </span>
                            </div>
                            {doc.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {doc.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {doc.chunkCount} chunks
                            </p>
                          </label>
                        </div>
                      ))}
                    </div>
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
