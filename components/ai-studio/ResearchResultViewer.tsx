'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import {
  FileText,
  Copy,
  Download,
  Printer,
  Save,
  Share2,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  Clock,
  DollarSign,
  Sparkles,
} from 'lucide-react'

// ============================================
// Types
// ============================================

interface Source {
  url: string
  title: string
  excerpt?: string
}

interface ResearchSession {
  id: string
  provider: string
  query: string
  status: string
  report: string | null
  sources?: Source[]
  completedAt?: string
  tokensUsed?: number
  estimatedCost?: number
  searchQueries?: number
  sourcesAnalyzed?: number
  savedDocumentId?: string | null
}

interface ResearchResultViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: ResearchSession | null
  onUseInChat?: (report: string) => void
  onShare?: (sessionId: string) => void
}

// ============================================
// Component
// ============================================

export function ResearchResultViewer({
  open,
  onOpenChange,
  session,
  onUseInChat,
  onShare,
}: ResearchResultViewerProps) {
  const { toast } = useToast()
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(!!session?.savedDocumentId)

  if (!session) return null

  // Copy report to clipboard
  const copyToClipboard = async () => {
    if (!session.report) return

    try {
      await navigator.clipboard.writeText(session.report)
      toast({
        title: 'Copied',
        description: 'Report copied to clipboard.',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard.',
        variant: 'destructive',
      })
    }
  }

  // Export as markdown file
  const exportMarkdown = () => {
    if (!session.report) return

    const blob = new Blob([session.report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `research-${session.id.slice(0, 8)}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: 'Exported',
      description: 'Report downloaded as markdown file.',
    })
  }

  // Print report
  const printReport = () => {
    if (!session.report) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast({
        title: 'Error',
        description: 'Could not open print window. Please check popup settings.',
        variant: 'destructive',
      })
      return
    }

    // Convert markdown to basic HTML for printing
    const htmlContent = session.report
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      .replace(/\n/g, '<br/>')
      .replace(/<br\/><li>/g, '<li>')
      .replace(/<\/li><br\/>/g, '</li>')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Research Report - ${session.query.substring(0, 50)}...</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px 20px;
              line-height: 1.6;
              color: #333;
            }
            h1 { font-size: 24px; margin-top: 24px; margin-bottom: 12px; color: #111; }
            h2 { font-size: 20px; margin-top: 20px; margin-bottom: 10px; color: #222; }
            h3 { font-size: 16px; margin-top: 16px; margin-bottom: 8px; color: #333; }
            li { margin-bottom: 4px; }
            .header {
              border-bottom: 2px solid #333;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .query {
              color: #666;
              font-style: italic;
              margin-bottom: 8px;
            }
            .meta {
              font-size: 12px;
              color: #888;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Research Report</h1>
            <p class="query">${session.query}</p>
            <p class="meta">
              ${formatProvider(session.provider)} |
              ${session.completedAt ? new Date(session.completedAt).toLocaleDateString() : 'N/A'}
              ${session.sources?.length ? ` | ${session.sources.length} sources` : ''}
            </p>
          </div>
          <div class="content">
            ${htmlContent}
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  // Save to documents
  const saveToDocuments = async () => {
    setIsSaving(true)

    try {
      const response = await fetch(`/api/ai/deep-research/${session.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embedForRAG: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save')
      }

      setIsSaved(true)
      toast({
        title: 'Saved to Documents',
        description: data.embeddingStatus === 'COMPLETED'
          ? `Document saved with ${data.chunkCount} chunks for RAG.`
          : data.message,
      })
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save document.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Use in chat
  const handleUseInChat = () => {
    if (session.report && onUseInChat) {
      onUseInChat(session.report)
      onOpenChange(false)
      toast({
        title: 'Added to Chat',
        description: 'Research report added as context.',
      })
    }
  }

  // Share
  const handleShare = () => {
    if (onShare) {
      onShare(session.id)
    }
  }

  // Format provider name
  const formatProvider = (provider: string) => {
    switch (provider) {
      case 'GEMINI':
        return 'Gemini Deep Research'
      case 'OPENAI_QUICK':
        return 'Quick Research'
      case 'OPENAI_STANDARD':
        return 'Standard Research'
      case 'OPENAI_DEEP':
        return 'Deep Research'
      case 'OPENAI_EXPERT':
        return 'Expert Research'
      default:
        return provider
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[700px] sm:max-w-[700px] overflow-hidden flex flex-col">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <SheetTitle>Research Report</SheetTitle>
            <Badge variant="secondary" className="ml-2">
              {formatProvider(session.provider)}
            </Badge>
          </div>
          <SheetDescription className="line-clamp-2">
            {session.query}
          </SheetDescription>
        </SheetHeader>

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 py-3 border-b text-xs text-muted-foreground">
          {session.completedAt && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{new Date(session.completedAt).toLocaleDateString()}</span>
            </div>
          )}
          {session.tokensUsed && (
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>{session.tokensUsed.toLocaleString()} tokens</span>
            </div>
          )}
          {session.estimatedCost !== undefined && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span>${session.estimatedCost.toFixed(4)}</span>
            </div>
          )}
          {session.sourcesAnalyzed && (
            <div className="flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              <span>{session.sourcesAnalyzed} sources analyzed</span>
            </div>
          )}
        </div>

        {/* Report Content */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="prose prose-sm dark:prose-invert max-w-none py-4">
            {session.report ? (
              <ReactMarkdown
                components={{
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {children}
                    </a>
                  ),
                  h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-3">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold mt-5 mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-medium mt-4 mb-2">{children}</h3>,
                  ul: ({ children }) => <ul className="list-disc pl-4 my-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 my-2">{children}</ol>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary pl-4 italic my-3">{children}</blockquote>
                  ),
                }}
              >
                {session.report}
              </ReactMarkdown>
            ) : (
              <p className="text-muted-foreground">No report available.</p>
            )}
          </div>

          {/* Sources */}
          {session.sources && session.sources.length > 0 && (
            <Collapsible open={sourcesOpen} onOpenChange={setSourcesOpen} className="mt-4 mb-6">
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Sources ({session.sources.length})
                  </span>
                  {sourcesOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {session.sources.map((source, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      {source.title}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {source.excerpt && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {source.excerpt}
                      </p>
                    )}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy to clipboard</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={exportMarkdown}>
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export as Markdown</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={printReport}>
                  <Printer className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Print Report</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="outline"
            size="sm"
            onClick={saveToDocuments}
            disabled={isSaving || isSaved}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : isSaved ? (
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaved ? 'Saved' : 'Save to Documents'}
          </Button>

          {onShare && (
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          )}

          {onUseInChat && (
            <Button size="sm" onClick={handleUseInChat} className="ml-auto">
              <MessageSquare className="h-4 w-4 mr-2" />
              Use in Chat
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
