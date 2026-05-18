'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from '@/i18n/client'
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileVideo,
  File,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react'

type UploadFileType = 'PDF' | 'EXCEL' | 'TEXT' | 'MARKDOWN' | 'VIDEO'

interface UploadArgs {
  file: File
  fileType: UploadFileType
  name: string
  description?: string
  textContent?: string
}

async function uploadDocument(
  args: UploadArgs
): Promise<{ success?: boolean; document?: { id: string } }> {
  const { file, fileType, name, description, textContent } = args

  if (fileType === 'TEXT' || fileType === 'MARKDOWN') {
    const content = textContent ?? (await file.text())
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'upload-text',
        name,
        description,
        fileType,
        mimeType: file.type || 'text/plain',
        content,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Upload failed')
    return data
  }

  if (fileType !== 'PDF' && fileType !== 'EXCEL') {
    throw new Error('Unsupported file type for upload')
  }

  const mimeType = file.type || (fileType === 'PDF' ? 'application/pdf' : 'application/octet-stream')

  // Step 1: ask the server for a presigned upload URL.
  const urlRes = await fetch('/api/documents/upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'get-upload-url',
      fileName: file.name,
      fileType,
      fileSize: file.size,
      mimeType,
    }),
  })
  const urlData = await urlRes.json()
  if (!urlRes.ok) throw new Error(urlData?.error || 'Failed to get upload URL')

  // Step 2: upload the file directly to Supabase Storage.
  const putRes = await fetch(urlData.signedUrl, {
    method: 'PUT',
    headers: { 'content-type': urlData.contentType || mimeType },
    body: file,
  })
  if (!putRes.ok) {
    throw new Error('Upload to storage failed')
  }

  // Step 3: tell the server the upload landed; it writes the DB row.
  const confirmRes = await fetch('/api/documents/upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'confirm-upload',
      uploadPath: urlData.path,
      name,
      description,
      fileType,
      mimeType,
      fileSize: file.size,
    }),
  })
  const confirmData = await confirmRes.json()
  if (!confirmRes.ok) throw new Error(confirmData?.error || 'Upload confirmation failed')
  return confirmData
}

interface DocumentUploaderProps {
  onClose: () => void
  onUploadComplete: () => void
  hasOpenAIKey?: boolean
  autoProcess?: boolean
}

type FileTypeInfo = {
  type: 'PDF' | 'EXCEL' | 'TEXT' | 'MARKDOWN' | 'VIDEO'
  icon: React.ReactNode
  label: string
}

const getFileTypeInfo = (file: File): FileTypeInfo | null => {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const mime = file.type

  if (mime === 'application/pdf' || ext === 'pdf') {
    return { type: 'PDF', icon: <FileText className="h-8 w-8 text-red-500" />, label: 'PDF' }
  }
  if (
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.ms-excel' ||
    mime === 'text/csv' ||
    ext === 'xlsx' ||
    ext === 'xls' ||
    ext === 'csv'
  ) {
    return { type: 'EXCEL', icon: <FileSpreadsheet className="h-8 w-8 text-green-500" />, label: 'Excel/CSV' }
  }
  if (mime === 'text/markdown' || ext === 'md' || ext === 'markdown') {
    return { type: 'MARKDOWN', icon: <FileText className="h-8 w-8 text-blue-500" />, label: 'Markdown' }
  }
  if (mime === 'text/plain' || ext === 'txt') {
    return { type: 'TEXT', icon: <FileText className="h-8 w-8 text-gray-500" />, label: 'Text' }
  }
  if (mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) {
    return { type: 'VIDEO', icon: <FileVideo className="h-8 w-8 text-purple-500" />, label: 'Video' }
  }

  return null
}

export function DocumentUploader({
  onClose,
  onUploadComplete,
  hasOpenAIKey = false,
  autoProcess = true
}: DocumentUploaderProps) {
  const { toast } = useToast()
  const t = useTranslations('components.documentsClient')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileTypeInfo, setFileTypeInfo] = useState<FileTypeInfo | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle')
  const [textContent, setTextContent] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    const typeInfo = getFileTypeInfo(file)
    if (!typeInfo) {
      toast({
        title: t('uploader.toasts.unsupportedType.title'),
        description: t('uploader.toasts.unsupportedType.description'),
        variant: 'destructive',
      })
      return
    }

    setSelectedFile(file)
    setFileTypeInfo(typeInfo)
    setName(file.name.replace(/\.[^/.]+$/, '')) // Remove extension

    // Read text content for TEXT and MARKDOWN files
    if (typeInfo.type === 'TEXT' || typeInfo.type === 'MARKDOWN') {
      const reader = new FileReader()
      reader.onload = (e) => {
        setTextContent(e.target?.result as string)
      }
      reader.readAsText(file)
    } else {
      setTextContent(null)
    }
  }, [t, toast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md', '.markdown'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  })

  const handleUpload = async () => {
    if (!selectedFile || !fileTypeInfo || !name.trim()) {
      toast({
        title: t('uploader.toasts.missingFields.title'),
        description: t('uploader.toasts.missingFields.description'),
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)
    setUploadStatus('uploading')

    try {
      // Two flows, picked by file type:
      //
      // - TEXT / MARKDOWN: tiny, stored inline. One JSON round-trip.
      // - PDF / EXCEL: large, uploaded directly to Supabase Storage via
      //   a presigned URL so the file never passes through the Vercel
      //   Function body. Three steps: get URL → PUT to storage → confirm.
      const data = await uploadDocument({
        file: selectedFile,
        fileType: fileTypeInfo.type,
        name: name.trim(),
        description: description.trim() || undefined,
        textContent: textContent ?? undefined,
      })

      // Auto-process if OpenAI key is available and autoProcess is enabled
      if (hasOpenAIKey && autoProcess && data.document?.id) {
        setUploadStatus('processing')
        setIsProcessing(true)

        try {
          const embedResponse = await fetch(`/api/documents/${data.document.id}/embed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ force: false }),
          })

          const embedData = await embedResponse.json()

          if (embedResponse.ok) {
            setUploadStatus('done')
            toast({
              title: t('uploader.toasts.uploadProcessed.title'),
              description: t('uploader.toasts.uploadProcessed.description', {
                chunksCreated: embedData.chunksCreated,
              }),
            })
          } else {
            // Upload succeeded but processing failed - still complete but warn
            toast({
              title: t('uploader.toasts.uploadedWithWarnings.title'),
              description: t('uploader.toasts.uploadedWithWarnings.description', {
                error: embedData.error,
              }),
              variant: 'destructive',
            })
          }
        } catch (_embedError) {
          // Upload succeeded but processing failed
          toast({
            title: t('uploader.toasts.uploadedWithWarnings.title'),
            description: t('uploader.toasts.uploadFailedProcessing.description'),
            variant: 'destructive',
          })
        } finally {
          setIsProcessing(false)
        }
      } else {
        toast({
          title: t('uploader.toasts.uploaded.title'),
          description: hasOpenAIKey
            ? t('uploader.toasts.uploaded.descriptionWithOpenAI')
            : t('uploader.toasts.uploaded.descriptionWithoutOpenAI'),
        })
      }

      onUploadComplete()
    } catch (error) {
      console.error('[DocumentUploader] Upload failed:', error)
      setUploadStatus('idle')
      toast({
        title: t('uploader.toasts.uploadFailed.title'),
        description: error instanceof Error ? error.message : t('uploader.toasts.uploadFailed.description'),
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setFileTypeInfo(null)
    setName('')
    setDescription('')
    setTextContent(null)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t('uploader.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dropzone */}
          {!selectedFile ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              {isDragActive ? (
                <p className="text-blue-600 font-medium">{t('uploader.dropzone.dropText')}</p>
              ) : (
                <>
                  <p className="font-medium mb-1">
                    {t('uploader.dropzone.dragText')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('uploader.dropzone.formats')}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3">
                {fileTypeInfo?.icon || <File className="h-8 w-8" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {fileTypeInfo?.label} • {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* File details form */}
          {selectedFile && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">{t('uploader.form.nameLabel')}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('uploader.form.namePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('uploader.form.descriptionLabel')}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('uploader.form.descriptionPlaceholder')}
                  rows={3}
                />
              </div>

              {/* Video warning */}
              {fileTypeInfo?.type === 'VIDEO' && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-amber-800 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{t('uploader.warnings.video.title')}</p>
                    <p>{t('uploader.warnings.video.description')}</p>
                  </div>
                </div>
              )}

              {/* PDF/Excel info */}
              {(fileTypeInfo?.type === 'PDF' || fileTypeInfo?.type === 'EXCEL') && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-blue-800 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{t('uploader.warnings.pdf.title')}</p>
                    <p>{t('uploader.warnings.pdf.description')}</p>
                  </div>
                </div>
              )}

              {/* Text preview */}
              {textContent && (
                <div className="space-y-2">
                  <Label>{t('uploader.previewLabel')}</Label>
                  <div className="max-h-40 overflow-auto p-3 bg-muted rounded-lg text-sm font-mono">
                    {textContent.slice(0, 1000)}
                    {textContent.length > 1000 && '...'}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading || isProcessing}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || !name.trim() || isUploading || isProcessing}>
            {uploadStatus === 'uploading' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('uploader.actions.uploading')}
              </>
            ) : uploadStatus === 'processing' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('uploader.actions.processingForAI')}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {hasOpenAIKey ? t('uploader.actions.uploadAndProcess') : t('uploader.actions.upload')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
