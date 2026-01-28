'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import {
  FlaskConical,
  Clock,
  User,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ArrowLeft,
  Sparkles,
  FileText,
  Copy,
} from 'lucide-react'
import Link from 'next/link'

// ============================================
// Types
// ============================================

interface Source {
  url: string
  title: string
  excerpt?: string
}

interface SharedResearch {
  sessionId: string
  provider: string
  query: string
  report: string | null
  sources: Source[]
  completedAt: string | null
  sharedAt: string
  coach: {
    id: string
    name: string
  }
  tokensUsed: number | null
  searchQueries: number | null
  sourcesAnalyzed: number | null
}

interface SharedResearchViewProps {
  sessionId: string
  onDiscussWithCoach?: () => void
  basePath?: string
}

// ============================================
// Component
// ============================================

export function SharedResearchView({
  sessionId,
  onDiscussWithCoach,
  basePath = '',
}: SharedResearchViewProps) {
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [research, setResearch] = useState<SharedResearch | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sourcesOpen, setSourcesOpen] = useState(false)

  // Fetch research details
  useEffect(() => {
    const fetchResearch = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/athlete/research/${sessionId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load research')
        }

        setResearch(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load research')
      } finally {
        setIsLoading(false)
      }
    }

    fetchResearch()
  }, [sessionId])

  // Copy report to clipboard
  const copyToClipboard = async () => {
    if (!research?.report) return

    try {
      await navigator.clipboard.writeText(research.report)
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

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (error || !research) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Research Not Found</h2>
            <p className="text-muted-foreground mb-4">
              {error || 'This research report is not available.'}
            </p>
            <Link href={`${basePath}/athlete/dashboard`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Research Report</h1>
          </div>
          <p className="text-muted-foreground">
            Shared by {research.coach.name}
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          {formatProvider(research.provider)}
        </Badge>
      </div>

      {/* Query Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Research Question
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">{research.query}</p>
        </CardContent>
      </Card>

      {/* Metadata */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {research.completedAt && (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Completed {new Date(research.completedAt).toLocaleDateString()}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <User className="h-4 w-4" />
          <span>Shared {new Date(research.sharedAt).toLocaleDateString()}</span>
        </div>
        {research.sourcesAnalyzed && (
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>{research.sourcesAnalyzed} sources analyzed</span>
          </div>
        )}
      </div>

      {/* Report Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Report</CardTitle>
          <Button variant="ghost" size="sm" onClick={copyToClipboard}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[600px]">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {research.report ? (
                <ReactMarkdown
                  components={{
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {children}
                      </a>
                    ),
                    h1: ({ children }) => (
                      <h1 className="text-xl font-bold mt-6 mb-3">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-lg font-semibold mt-5 mb-2">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-medium mt-4 mb-2">{children}</h3>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-4 my-2">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-4 my-2">{children}</ol>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-primary pl-4 italic my-3">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {research.report}
                </ReactMarkdown>
              ) : (
                <p className="text-muted-foreground">No report content available.</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Sources */}
      {research.sources && research.sources.length > 0 && (
        <Collapsible open={sourcesOpen} onOpenChange={setSourcesOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Sources ({research.sources.length})
                  </CardTitle>
                  {sourcesOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-3">
                {research.sources.map((source, index) => (
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
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/athlete/dashboard">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        {onDiscussWithCoach && (
          <Button onClick={onDiscussWithCoach}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Discuss with Coach
          </Button>
        )}
      </div>
    </div>
  )
}
