'use client'

import { useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'
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
import { enUS, sv } from 'date-fns/locale'
import { useLocale, useTranslations } from '@/i18n/client'

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
  const pathname = usePathname()
  const businessSlug = getBusinessSlugFromPathname(pathname)
  const basePath = businessSlug ? `/${businessSlug}` : ''
  const { toast } = useToast()
  const t = useTranslations('components.documentsClient')
  const locale = useLocale()
  const dateLocale = locale === 'en' ? enUS : sv

  const [documents, setDocuments] = useState(initialDocuments)
  const [searchQuery, setSearchQuery] = useState('')
  const [showUploader, setShowUploader] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null)
  const [deleteDocument, setDeleteDocument] = useState<Document | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })

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
          {t('status.completed')}
        </Badge>
      )
    case 'PROCESSING':
      return (
        <Badge variant="secondary">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          {t('status.processing')}
        </Badge>
      )
    case 'FAILED':
      return (
        <Badge variant="destructive" title={error || undefined}>
          <XCircle className="h-3 w-3 mr-1" />
          {t('status.failed')}
        </Badge>
      )
    default:
      return (
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          {t('status.pending')}
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

  // Fetch documents from API
  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch('/api/documents')
      if (response.ok) {
        const data = await response.json()
        if (data.documents) {
          setDocuments(data.documents.map((doc: {
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
            chunkCount?: number
            metadata?: { chunkCount?: number }
            createdAt: string
            updatedAt: string
          }) => ({
            ...doc,
            chunkCount: doc.chunkCount ?? 0,
            createdAt: new Date(doc.createdAt),
            updatedAt: new Date(doc.updatedAt),
          })))
        }
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    }
  }, [])

  const handleUploadComplete = useCallback(async () => {
    setShowUploader(false)
    // Fetch fresh documents from API instead of relying on router.refresh()
    await fetchDocuments()
    router.refresh()
  }, [router, fetchDocuments])

  const handleProcessDocument = async (docId: string) => {
    if (!hasOpenAIKey) {
      toast({
        title: t('toasts.missingOpenAIKey.title'),
        description: t('toasts.missingOpenAIKey.description'),
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
        title: t('toasts.generated.title'),
        description: t('toasts.generated.description', { chunksCreated: data.chunksCreated }),
      })

      // Fetch fresh documents
      await fetchDocuments()
      router.refresh()
    } catch (error) {
      toast({
        title: t('toasts.generateFailed.title'),
        description:
          error instanceof Error
            ? error.message
            : t('toasts.generateFailed.description'),
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }

  // Get pending documents count
  const pendingDocuments = documents.filter(d => d.processingStatus === 'PENDING' || d.processingStatus === 'FAILED')

  const handleProcessAllDocuments = async () => {
    if (!hasOpenAIKey) {
      toast({
        title: t('toasts.missingOpenAIKey.title'),
        description: t('toasts.missingOpenAIKey.description'),
        variant: 'destructive',
      })
      return
    }

    const docsToProcess = documents.filter(d => d.processingStatus === 'PENDING' || d.processingStatus === 'FAILED')
    if (docsToProcess.length === 0) {
      toast({
        title: t('toasts.noDocumentsToProcess'),
        description: t('toasts.allDocumentsProcessed'),
      })
      return
    }

    setIsBatchProcessing(true)
    setBatchProgress({ current: 0, total: docsToProcess.length })

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < docsToProcess.length; i++) {
      const doc = docsToProcess[i]
      setBatchProgress({ current: i + 1, total: docsToProcess.length })

      try {
        const response = await fetch(`/api/documents/${doc.id}/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: false }),
        })

        if (response.ok) {
          successCount++
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }

    setIsBatchProcessing(false)
    setBatchProgress({ current: 0, total: 0 })

    toast({
      title: t('toasts.batchComplete.title'),
      description:
        failCount > 0
          ? t('toasts.batchComplete.withFailures', { successCount, failCount })
          : t('toasts.batchComplete.success', { successCount }),
      variant: failCount > 0 ? 'destructive' : 'default',
    })

    // Fetch fresh documents
    await fetchDocuments()
    router.refresh()
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
        title: t('toasts.deleteSuccess.title'),
        description: t('toasts.deleteSuccess.description'),
      })
    } catch (error) {
      toast({
        title: t('toasts.deleteFailed.title'),
        description:
          error instanceof Error
            ? error.message
            : t('toasts.deleteFailed.description'),
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
            {t('title')} <InfoTooltip conceptKey="ragDocuments" />
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`${basePath}/coach/ai-studio`}>
              <Bot className="h-4 w-4 mr-2" />
              AI Studio
            </Link>
          </Button>
          {pendingDocuments.length > 0 && hasOpenAIKey && (
            <Button
              variant="outline"
              onClick={handleProcessAllDocuments}
              disabled={isBatchProcessing}
            >
              {isBatchProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {batchProgress.current}/{batchProgress.total}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('actions.processAll', { count: pendingDocuments.length })}
                </>
              )}
            </Button>
          )}
          <Button onClick={() => setShowUploader(true)}>
            <Upload className="h-4 w-4 mr-2" />
            {t('actions.upload')}
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
                <p className="font-medium text-amber-800">{t('alerts.missingOpenAIKey.title')}</p>
                <p className="text-sm text-amber-700">
                  {t('alerts.missingOpenAIKey.description')}
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`${basePath}/coach/settings/ai`}>
                  <Settings className="h-4 w-4 mr-1" />
                  {t('actions.settings')}
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
          placeholder={t('search.placeholder')}
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
              {searchQuery ? t('emptyState.noResults') : t('emptyState.noDocuments')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? t('emptyState.noResultsDescription')
                : t('emptyState.noDocumentsDescription')}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowUploader(true)}>
                <Upload className="h-4 w-4 mr-2" />
                {t('actions.uploadDocument')}
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
                  {t('meta.uploadedAt')} {format(new Date(doc.createdAt), 'PPP', { locale: dateLocale })}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewDocument(doc)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    {t('actions.view')}
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
                      {t('actions.generate')}
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
                      {t('actions.retry')}
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
            <p className="text-sm text-muted-foreground">{t('stats.documents')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">
              {documents.filter((d) => d.processingStatus === 'COMPLETED').length}
            </p>
            <p className="text-sm text-muted-foreground">{t('stats.processed')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">
              {documents.reduce((acc, d) => acc + d.chunkCount, 0)}
            </p>
            <p className="text-sm text-muted-foreground">{t('stats.totalChunks')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold">
              {formatFileSize(
                documents.reduce((acc, d) => acc + (d.fileSize || 0), 0)
              )}
            </p>
            <p className="text-sm text-muted-foreground">{t('stats.totalSize')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Modal */}
      {showUploader && (
        <DocumentUploader
          onClose={() => setShowUploader(false)}
          onUploadComplete={handleUploadComplete}
          hasOpenAIKey={hasOpenAIKey}
          autoProcess={true}
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
            <AlertDialogTitle>{t('delete.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDocument
                ? t('delete.confirmDescription', { name: deleteDocument.name })
                : t('delete.confirmDescriptionFallback')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('delete.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('delete.deleting')}
                </>
              ) : (
                t('delete.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
