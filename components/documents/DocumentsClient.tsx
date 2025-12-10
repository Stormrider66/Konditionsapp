'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import {
  FileText,
  Upload,
  Trash2,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Settings,
  Bot,
  FileSpreadsheet,
  FileVideo,
  File,
  Eye,
  Loader2,
} from 'lucide-react'
import { DocumentUploader } from './DocumentUploader'
import { DocumentPreview } from './DocumentPreview'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

interface Document {
  id: string
  name: string
  description: string | null
  fileType: string
  fileUrl: string
  fileSize: number | null
  mimeType: string | null
  isSystem: boolean
  processingStatus: string
  processingError: string | null
  chunkCount: number
  createdAt: Date
  updatedAt: Date
}

interface DocumentsClientProps {
  documents: Document[]
  hasOpenAIKey: boolean
}

export function DocumentsClient({ documents: initialDocuments, hasOpenAIKey }: DocumentsClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [documents, setDocuments] = useState(initialDocuments)
  const [searchQuery, setSearchQuery] = useState('')
  const [showUploader, setShowUploader] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null)
  const [deleteDocument, setDeleteDocument] = useState<Document | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'PDF':
        return <FileText className="h-5 w-5 text-red-500" />
      case 'EXCEL':
        return <FileSpreadsheet className="h-5 w-5 text-green-500" />
      case 'VIDEO':
        return <FileVideo className="h-5 w-5 text-purple-500" />
      case 'MARKDOWN':
      case 'TEXT':
        return <FileText className="h-5 w-5 text-blue-500" />
      default:
        return <File className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string, error: string | null) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Klar
          </Badge>
        )
      case 'PROCESSING':
        return (
          <Badge variant="secondary">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Bearbetar
          </Badge>
        )
      case 'FAILED':
        return (
          <Badge variant="destructive" title={error || undefined}>
            <XCircle className="h-3 w-3 mr-1" />
            Misslyckades
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Väntar
          </Badge>
        )
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleUploadComplete = useCallback(() => {
    setShowUploader(false)
    router.refresh()
    toast({
      title: 'Dokument uppladdat',
      description: 'Dokumentet har laddats upp. Klicka på "Generera embeddings" för att aktivera sökning.',
    })
  }, [router, toast])

  const handleProcessDocument = async (docId: string) => {
    if (!hasOpenAIKey) {
      toast({
        title: 'OpenAI API-nyckel saknas',
        description: 'Konfigurera din OpenAI API-nyckel i Inställningar för att generera embeddings.',
        variant: 'destructive',
      })
      return
    }

    setProcessingId(docId)

    try {
      const response = await fetch(`/api/documents/${docId}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process document')
      }

      toast({
        title: 'Embeddings genererade',
        description: `Dokumentet har bearbetats till ${data.chunksCreated} chunks.`,
      })

      router.refresh()
    } catch (error) {
      toast({
        title: 'Kunde inte generera embeddings',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeleteDocument = async () => {
    if (!deleteDocument) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/documents/${deleteDocument.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete document')
      }

      setDocuments((prev) => prev.filter((d) => d.id !== deleteDocument.id))

      toast({
        title: 'Dokument borttaget',
        description: 'Dokumentet och alla tillhörande chunks har tagits bort.',
      })
    } catch (error) {
      toast({
        title: 'Kunde inte ta bort dokument',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteDocument(null)
    }
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Dokumentbibliotek
          </h1>
          <p className="text-muted-foreground mt-1">
            Ladda upp dokument för AI-assisterad träningsplanering
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/coach/ai-studio">
              <Bot className="h-4 w-4 mr-2" />
              AI Studio
            </Link>
          </Button>
          <Button onClick={() => setShowUploader(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Ladda upp
          </Button>
        </div>
      </div>

      {/* API Key Warning */}
      {!hasOpenAIKey && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-amber-800">OpenAI API-nyckel saknas</p>
                <p className="text-sm text-amber-700">
                  Du behöver konfigurera en OpenAI API-nyckel för att kunna generera embeddings och använda dokumentsökning.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/coach/settings/ai">
                  <Settings className="h-4 w-4 mr-1" />
                  Inställningar
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Sök dokument..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Document Grid */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? 'Inga dokument hittades' : 'Inga dokument uppladdade'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Försök med en annan sökning'
                : 'Ladda upp PDF:er, Excel-filer eller textdokument för att komma igång'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowUploader(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Ladda upp dokument
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getFileIcon(doc.fileType)}
                    <CardTitle className="text-base truncate">{doc.name}</CardTitle>
                  </div>
                  {getStatusBadge(doc.processingStatus, doc.processingError)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {doc.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {doc.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{doc.fileType}</span>
                  <span>•</span>
                  <span>{formatFileSize(doc.fileSize)}</span>
                  <span>•</span>
                  <span>{doc.chunkCount} chunks</span>
                </div>

                <p className="text-xs text-muted-foreground">
                  Uppladdat {format(new Date(doc.createdAt), 'PPP', { locale: sv })}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewDocument(doc)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Visa
                  </Button>

                  {doc.processingStatus === 'PENDING' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleProcessDocument(doc.id)}
                      disabled={processingId === doc.id || !hasOpenAIKey}
                    >
                      {processingId === doc.id ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3 mr-1" />
                      )}
                      Generera
                    </Button>
                  )}

                  {doc.processingStatus === 'FAILED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleProcessDocument(doc.id)}
                      disabled={processingId === doc.id || !hasOpenAIKey}
                    >
                      {processingId === doc.id ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3 mr-1" />
                      )}
                      Försök igen
                    </Button>
                  )}

                  {!doc.isSystem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive ml-auto"
                      onClick={() => setDeleteDocument(doc)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-8 grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">{documents.length}</p>
            <p className="text-sm text-muted-foreground">Dokument</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">
              {documents.filter((d) => d.processingStatus === 'COMPLETED').length}
            </p>
            <p className="text-sm text-muted-foreground">Bearbetade</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">
              {documents.reduce((acc, d) => acc + d.chunkCount, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Totalt chunks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">
              {formatFileSize(
                documents.reduce((acc, d) => acc + (d.fileSize || 0), 0)
              )}
            </p>
            <p className="text-sm text-muted-foreground">Total storlek</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Modal */}
      {showUploader && (
        <DocumentUploader
          onClose={() => setShowUploader(false)}
          onUploadComplete={handleUploadComplete}
        />
      )}

      {/* Preview Modal */}
      {previewDocument && (
        <DocumentPreview
          document={previewDocument}
          onClose={() => setPreviewDocument(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDocument} onOpenChange={() => setDeleteDocument(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort dokument?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort &quot;{deleteDocument?.name}&quot;?
              Detta kommer också ta bort alla tillhörande chunks och embeddings.
              Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Tar bort...
                </>
              ) : (
                'Ta bort'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
