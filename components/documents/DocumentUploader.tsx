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

interface DocumentUploaderProps {
  onClose: () => void
  onUploadComplete: () => void
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

export function DocumentUploader({ onClose, onUploadComplete }: DocumentUploaderProps) {
  const { toast } = useToast()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileTypeInfo, setFileTypeInfo] = useState<FileTypeInfo | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [textContent, setTextContent] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    const typeInfo = getFileTypeInfo(file)
    if (!typeInfo) {
      toast({
        title: 'Filtyp stöds inte',
        description: 'Ladda upp PDF, Excel, Markdown eller textfiler.',
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
  }, [toast])

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
        title: 'Fyll i alla fält',
        description: 'Välj en fil och ange ett namn.',
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)

    try {
      // For TEXT and MARKDOWN, we can store content directly
      // For PDF/EXCEL/VIDEO, we need to upload to storage first
      let fileUrl = ''

      if (fileTypeInfo.type === 'TEXT' || fileTypeInfo.type === 'MARKDOWN') {
        // Store text content directly - use a data URL or just reference
        fileUrl = `data:text/plain;base64,${btoa(unescape(encodeURIComponent(textContent || '')))}`
      } else {
        // For now, show message that file upload to storage is needed
        // In production, you would upload to Supabase Storage here
        toast({
          title: 'Filuppladdning till lagring',
          description: 'PDF- och Excel-filer kräver lagring (Supabase Storage). Kontakta administratör.',
          variant: 'destructive',
        })
        setIsUploading(false)
        return
      }

      // Create document record
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          fileType: fileTypeInfo.type,
          fileUrl,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type,
          content: textContent, // For text/markdown
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create document')
      }

      toast({
        title: 'Dokument uppladdat',
        description: 'Dokumentet har sparats. Generera embeddings för att aktivera sökning.',
      })

      onUploadComplete()
    } catch (error) {
      toast({
        title: 'Uppladdning misslyckades',
        description: error instanceof Error ? error.message : 'Okänt fel',
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
            Ladda upp dokument
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
                <p className="text-blue-600 font-medium">Släpp filen här...</p>
              ) : (
                <>
                  <p className="font-medium mb-1">
                    Dra och släpp en fil här, eller klicka för att välja
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PDF, Excel, Markdown, Text (max 50MB)
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
                <Label htmlFor="name">Namn *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dokumentnamn"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beskrivning</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Valfri beskrivning av dokumentet..."
                  rows={3}
                />
              </div>

              {/* Video warning */}
              {fileTypeInfo?.type === 'VIDEO' && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-amber-800 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Videoanalys</p>
                    <p>Videofiler kräver transkribering innan de kan användas för sökning. Detta stöds ännu inte.</p>
                  </div>
                </div>
              )}

              {/* PDF/Excel info */}
              {(fileTypeInfo?.type === 'PDF' || fileTypeInfo?.type === 'EXCEL') && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-blue-800 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Fillagring</p>
                    <p>PDF- och Excel-filer kräver Supabase Storage för att lagras. Text och Markdown kan laddas upp direkt.</p>
                  </div>
                </div>
              )}

              {/* Text preview */}
              {textContent && (
                <div className="space-y-2">
                  <Label>Förhandsgranskning</Label>
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
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Avbryt
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || !name.trim() || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Laddar upp...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Ladda upp
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
