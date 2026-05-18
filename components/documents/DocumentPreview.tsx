'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText,
  FileSpreadsheet,
  FileVideo,
  File,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react'
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

interface Chunk {
  id: string
  chunkIndex: number
  content: string
  tokenCount: number | null
  metadata: Record<string, unknown> | null
}

interface DocumentPreviewProps {
  document: Document
  onClose: () => void
}

export function DocumentPreview({ document, onClose }: DocumentPreviewProps) {
  const t = useTranslations('components.documentsClient.documentPreview')
  const locale = useLocale()
  const dateLocale = locale === 'en' ? enUS : sv
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [isLoadingChunks, setIsLoadingChunks] = useState(false)
  const [content, setContent] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const loadChunks = async () => {
      setIsLoadingChunks(true)
      try {
        const response = await fetch(`/api/documents/${document.id}`)
        const data = await response.json()
        if (response.ok && data.document?.chunks) {
          setChunks(data.document.chunks)
        }
      } catch (error) {
        console.error('Failed to load chunks:', error)
      } finally {
        setIsLoadingChunks(false)
      }
    }

    // Load chunks if document is processed
    if (document.processingStatus === 'COMPLETED') {
      loadChunks()
    }

    // Try to load content for text-based documents
    if (document.fileUrl.startsWith('data:')) {
      try {
        const base64 = document.fileUrl.split(',')[1]
        const decoded = decodeURIComponent(escape(atob(base64)))
        setContent(decoded)
      } catch (error) {
        console.error('Failed to decode content:', error)
      }
    }
  }, [document])

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'PDF':
        return <FileText className="h-6 w-6 text-red-500" />
      case 'EXCEL':
        return <FileSpreadsheet className="h-6 w-6 text-green-500" />
      case 'VIDEO':
        return <FileVideo className="h-6 w-6 text-purple-500" />
      case 'MARKDOWN':
      case 'TEXT':
        return <FileText className="h-6 w-6 text-blue-500" />
      default:
        return <File className="h-6 w-6 text-gray-500" />
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const copyContent = async () => {
    if (content) {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getFileIcon(document.fileType)}
            <span className="truncate">{document.name}</span>
          </DialogTitle>
      </DialogHeader>

        <Tabs defaultValue="info" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">{t('tabs.info')}</TabsTrigger>
            <TabsTrigger value="content">{t('tabs.content')}</TabsTrigger>
            <TabsTrigger value="chunks">
              {t('tabs.chunks', { count: document.chunkCount })}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('fields.fileType')}</p>
                <p>{document.fileType}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('fields.size')}</p>
                <p>{formatFileSize(document.fileSize)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('fields.status')}</p>
                <Badge
                  variant={
                    document.processingStatus === 'COMPLETED'
                      ? 'default'
                      : document.processingStatus === 'FAILED'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {document.processingStatus === 'COMPLETED'
                    ? t('status.completed')
                    : document.processingStatus === 'PROCESSING'
                    ? t('status.processing')
                    : document.processingStatus === 'FAILED'
                      ? t('status.failed')
                      : t('status.pending')}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('fields.chunks')}</p>
                <p>{document.chunkCount}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('fields.uploadedAt')}</p>
                <p>{format(new Date(document.createdAt), 'PPP', { locale: dateLocale })}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('fields.updatedAt')}</p>
                <p>{format(new Date(document.updatedAt), 'PPP', { locale: dateLocale })}</p>
              </div>
            </div>

            {document.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {t('fields.description')}
                </p>
                <p className="text-sm">{document.description}</p>
              </div>
            )}

            {document.processingError && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{t('processingErrorTitle')}</p>
                  <p>{document.processingError}</p>
                </div>
              </div>
            )}

            {!document.fileUrl.startsWith('data:') && (
              <Button variant="outline" size="sm" asChild>
                <a href={document.fileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('actions.openOriginal')}
                </a>
              </Button>
            )}
          </TabsContent>

          <TabsContent value="content" className="mt-4">
            {content ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t('content.characterCount', { count: content.length })}
                  </p>
                  <Button variant="ghost" size="sm" onClick={copyContent}>
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-1 text-green-500" />
                        {t('actions.copied')}
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        {t('actions.copy')}
                      </>
                    )}
                  </Button>
                </div>
                <ScrollArea className="h-[400px] border rounded-lg p-4">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {content}
                  </pre>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('empty.contentUnavailable')}</p>
                <p className="text-sm">
                  {document.fileType === 'PDF' || document.fileType === 'EXCEL'
                    ? t('empty.externalViewer')
                    : t('empty.noTextContent')}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="chunks" className="mt-4">
            {isLoadingChunks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : chunks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('empty.noChunks')}</p>
                <p className="text-sm">
                  {t('empty.notProcessedOrFailed')}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {chunks.map((chunk) => (
                    <div
                      key={chunk.id}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">
                          Chunk {chunk.chunkIndex + 1}
                        </Badge>
                        {chunk.tokenCount && (
                          <span className="text-xs text-muted-foreground">
                            ~{chunk.tokenCount} tokens
                          </span>
                        )}
                      </div>
                      <p className="text-sm line-clamp-4">{chunk.content}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
