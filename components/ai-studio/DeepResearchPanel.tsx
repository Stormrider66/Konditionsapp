'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import {
  FlaskConical,
  Loader2,
  Play,
  StopCircle,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  FileText,
  User,
  Sparkles,
  Brain,
  Zap,
  Crown,
  Search,
} from 'lucide-react'

// ============================================
// Types
// ============================================

type DeepResearchProvider =
  | 'GEMINI'
  | 'OPENAI_QUICK'
  | 'OPENAI_STANDARD'
  | 'OPENAI_DEEP'
  | 'OPENAI_EXPERT'

interface ProviderOption {
  value: DeepResearchProvider
  label: string
  description: string
  icon: React.ReactNode
  estimatedTime: string
  estimatedCost: string
  recommended?: boolean
}

interface Client {
  id: string
  name: string
}

interface Document {
  id: string
  name: string
}

interface DeepResearchPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: Client[]
  documents: Document[]
  selectedAthleteId?: string | null
  selectedDocumentIds?: string[]
  apiKeyStatus: {
    google: boolean
    openai: boolean
  }
  onComplete: (report: string, sessionId: string) => void
}

interface ProgressEvent {
  type: 'progress' | 'complete' | 'error' | 'ping'
  sessionId: string
  status?: string
  progressPercent?: number
  progressMessage?: string
  currentStep?: string
  report?: string
  sources?: Array<{ url: string; title: string }>
  error?: string
}

// ============================================
// Provider Options
// ============================================

const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    value: 'GEMINI',
    label: 'Gemini Deep Research',
    description: 'Comprehensive research with web search. Best for in-depth analysis.',
    icon: <Sparkles className="h-4 w-4 text-blue-500" />,
    estimatedTime: '5-20 min',
    estimatedCost: '$0.00-0.50',
    recommended: true,
  },
  {
    value: 'OPENAI_QUICK',
    label: 'Quick Research',
    description: 'Fast results using GPT-5 Mini with web search.',
    icon: <Zap className="h-4 w-4 text-yellow-500" />,
    estimatedTime: '<1 min',
    estimatedCost: '$0.05-0.30',
  },
  {
    value: 'OPENAI_STANDARD',
    label: 'Standard Research',
    description: 'GPT-5.2 Thinking with enhanced reasoning and web search.',
    icon: <Brain className="h-4 w-4 text-purple-500" />,
    estimatedTime: '1-3 min',
    estimatedCost: '$0.50-2.00',
  },
  {
    value: 'OPENAI_DEEP',
    label: 'Deep Research',
    description: 'o4-mini deep research model for thorough analysis.',
    icon: <Search className="h-4 w-4 text-green-500" />,
    estimatedTime: '5-10 min',
    estimatedCost: '$0.50-3.00',
  },
  {
    value: 'OPENAI_EXPERT',
    label: 'Expert Research',
    description: 'o3 deep research for the most comprehensive results.',
    icon: <Crown className="h-4 w-4 text-amber-500" />,
    estimatedTime: '10-30 min',
    estimatedCost: '$3.00-15.00',
  },
]

// ============================================
// Component
// ============================================

export function DeepResearchPanel({
  open,
  onOpenChange,
  clients,
  documents,
  selectedAthleteId,
  selectedDocumentIds = [],
  apiKeyStatus,
  onComplete,
}: DeepResearchPanelProps) {
  const { toast } = useToast()

  // Form state
  const [query, setQuery] = useState('')
  const [provider, setProvider] = useState<DeepResearchProvider>('GEMINI')
  const [athleteId, setAthleteId] = useState<string | null>(selectedAthleteId || null)
  const [documentIds, setDocumentIds] = useState<string[]>(selectedDocumentIds)
  const [includeAthleteContext, setIncludeAthleteContext] = useState(true)

  // Research state
  const [isResearching, setIsResearching] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [currentStep, setCurrentStep] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Budget state
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null)

  // Update athlete when prop changes
  useEffect(() => {
    if (selectedAthleteId) {
      setAthleteId(selectedAthleteId)
    }
  }, [selectedAthleteId])

  // Update documents when prop changes
  useEffect(() => {
    setDocumentIds(selectedDocumentIds)
  }, [selectedDocumentIds])

  // Get selected provider info
  const selectedProvider = PROVIDER_OPTIONS.find((p) => p.value === provider)

  // Check if provider is available
  const isProviderAvailable = (providerValue: DeepResearchProvider) => {
    if (providerValue === 'GEMINI') return apiKeyStatus.google
    return apiKeyStatus.openai
  }

  // Start research
  const startResearch = async () => {
    if (!query.trim()) {
      toast({
        title: 'Query required',
        description: 'Please enter a research query.',
        variant: 'destructive',
      })
      return
    }

    if (!isProviderAvailable(provider)) {
      toast({
        title: 'API key required',
        description: `Please configure your ${provider === 'GEMINI' ? 'Google' : 'OpenAI'} API key.`,
        variant: 'destructive',
      })
      return
    }

    setIsResearching(true)
    setError(null)
    setProgress(0)
    setProgressMessage('Starting research...')
    setBudgetWarning(null)

    try {
      const response = await fetch('/api/ai/deep-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          provider,
          athleteId: includeAthleteContext ? athleteId : undefined,
          documentIds: documentIds.length > 0 ? documentIds : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 402) {
          setError(`Budget exceeded: ${data.message}`)
          setBudgetWarning(data.message)
        } else {
          setError(data.error || 'Failed to start research')
        }
        setIsResearching(false)
        return
      }

      setSessionId(data.sessionId)
      if (data.budgetWarning) {
        setBudgetWarning(data.budgetWarning)
      }

      // Start SSE connection for progress
      connectToProgress(data.sessionId)
    } catch (err) {
      setError('Failed to start research')
      setIsResearching(false)
    }
  }

  // Poll for final status if SSE fails
  const pollFinalStatus = useCallback(async (sid: string) => {
    try {
      const response = await fetch(`/api/ai/deep-research/${sid}`)
      const data = await response.json()

      if (data.status === 'COMPLETED' && data.report) {
        setIsResearching(false)
        setProgress(100)
        onComplete(data.report, sid)
      } else if (['FAILED', 'CANCELLED', 'TIMEOUT'].includes(data.status)) {
        setIsResearching(false)
        setError(data.errorMessage || 'Research failed')
      }
      // If still running, keep polling
      else if (data.status === 'RUNNING') {
        setTimeout(() => pollFinalStatus(sid), 5000)
      }
    } catch {
      setError('Lost connection to research')
      setIsResearching(false)
    }
  }, [onComplete])

  // Connect to SSE progress stream
  const connectToProgress = useCallback((sid: string) => {
    const eventSource = new EventSource(`/api/ai/deep-research/${sid}/progress`)

    eventSource.onmessage = (event) => {
      try {
        const data: ProgressEvent = JSON.parse(event.data)

        if (data.progressPercent !== undefined) {
          setProgress(data.progressPercent)
        }
        if (data.progressMessage) {
          setProgressMessage(data.progressMessage)
        }
        if (data.currentStep) {
          setCurrentStep(data.currentStep)
        }

        if (data.type === 'complete') {
          eventSource.close()
          setIsResearching(false)
          setProgress(100)
          setProgressMessage('Research complete!')

          if (data.report) {
            onComplete(data.report, sid)
            toast({
              title: 'Research complete',
              description: 'Your research report is ready.',
            })
          }
        } else if (data.type === 'error') {
          eventSource.close()
          setIsResearching(false)
          setError(data.error || 'Research failed')
        }
      } catch {
        // Ignore parse errors
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      // Don't set error immediately - might be temporary
      // Poll for final status instead
      pollFinalStatus(sid)
    }

    return () => {
      eventSource.close()
    }
  }, [onComplete, toast, pollFinalStatus])

  // Cancel research
  const cancelResearch = async () => {
    if (!sessionId) return

    try {
      await fetch(`/api/ai/deep-research/${sessionId}`, {
        method: 'DELETE',
      })
      setIsResearching(false)
      setProgress(0)
      setProgressMessage('')
      toast({
        title: 'Research cancelled',
        description: 'The research has been cancelled.',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to cancel research.',
        variant: 'destructive',
      })
    }
  }

  // Reset form
  const resetForm = () => {
    setQuery('')
    setProgress(0)
    setProgressMessage('')
    setCurrentStep('')
    setError(null)
    setSessionId(null)
    setBudgetWarning(null)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Deep Research
          </SheetTitle>
          <SheetDescription>
            Conduct comprehensive research on training methodologies, sports science, and athlete optimization.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Query Input */}
            <div className="space-y-2">
              <Label htmlFor="query">Research Query</Label>
              <Textarea
                id="query"
                placeholder="e.g., What are the latest evidence-based protocols for improving VO2max in masters athletes?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isResearching}
                className="min-h-[120px] resize-none"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Be specific for better results</span>
                <span>{query.length}/5000</span>
              </div>
            </div>

            {/* Provider Selection */}
            <div className="space-y-2">
              <Label>Research Engine</Label>
              <Select
                value={provider}
                onValueChange={(v) => setProvider(v as DeepResearchProvider)}
                disabled={isResearching}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      disabled={!isProviderAvailable(option.value)}
                    >
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <span>{option.label}</span>
                        {option.recommended && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Recommended
                          </Badge>
                        )}
                        {!isProviderAvailable(option.value) && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            No API Key
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Provider Info */}
              {selectedProvider && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="text-sm text-muted-foreground">{selectedProvider.description}</p>
                  <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{selectedProvider.estimatedTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span>{selectedProvider.estimatedCost}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Context Options */}
            <div className="space-y-4">
              <Label>Context</Label>

              {/* Athlete Context */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Include Athlete Data</p>
                    <p className="text-xs text-muted-foreground">
                      Add athlete profile for personalized results
                    </p>
                  </div>
                </div>
                <Switch
                  checked={includeAthleteContext && !!athleteId}
                  onCheckedChange={setIncludeAthleteContext}
                  disabled={!athleteId || isResearching}
                />
              </div>

              {includeAthleteContext && (
                <Select
                  value={athleteId || ''}
                  onValueChange={setAthleteId}
                  disabled={isResearching}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select athlete..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Document Context */}
              {documents.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Include Documents</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {documentIds.length} document(s) selected as context
                  </p>
                </div>
              )}
            </div>

            {/* Budget Warning */}
            {budgetWarning && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-600">Budget Warning</p>
                  <p className="text-xs text-yellow-600/80">{budgetWarning}</p>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Error</p>
                  <p className="text-xs text-destructive/80">{error}</p>
                </div>
              </div>
            )}

            {/* Progress Display */}
            {isResearching && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Researching...</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} />
                {progressMessage && (
                  <p className="text-xs text-muted-foreground">{progressMessage}</p>
                )}
                {currentStep && (
                  <Badge variant="outline" className="text-xs">
                    {currentStep}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          {isResearching ? (
            <Button
              variant="destructive"
              onClick={cancelResearch}
              className="flex-1"
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Cancel Research
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={!query && !error}
              >
                Reset
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={startResearch}
                      disabled={!query.trim() || !isProviderAvailable(provider)}
                      className="flex-1"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Research
                    </Button>
                  </TooltipTrigger>
                  {!isProviderAvailable(provider) && (
                    <TooltipContent>
                      Configure your {provider === 'GEMINI' ? 'Google' : 'OpenAI'} API key first
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
