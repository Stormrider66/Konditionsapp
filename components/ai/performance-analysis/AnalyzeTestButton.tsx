'use client'

/**
 * Analyze Test Button
 *
 * Button to trigger AI analysis of a test, with loading state and result modal.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Brain,
  Loader2,
  ChevronDown,
  Sparkles,
  GitCompare,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { AnalysisResultCard } from './AnalysisResultCard'
import { ComparisonResultCard } from './ComparisonResultCard'
import type {
  PerformanceAnalysisResult,
  TestComparisonResult,
} from '@/lib/ai/performance-analysis/types'

interface AnalyzeTestButtonProps {
  testId: string
  clientId: string
  previousTestId?: string // For comparison
  className?: string
}

export function AnalyzeTestButton({
  testId,
  clientId,
  previousTestId,
  className,
}: AnalyzeTestButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [analysisType, setAnalysisType] = useState<'single' | 'compare' | 'trends' | null>(null)
  const [result, setResult] = useState<PerformanceAnalysisResult | TestComparisonResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleAnalyze = async (type: 'single' | 'compare' | 'trends') => {
    setIsLoading(true)
    setAnalysisType(type)
    setError(null)
    setIsDialogOpen(true)

    try {
      let response: Response

      if (type === 'single') {
        response = await fetch('/api/ai/performance-analysis/analyze-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testId }),
        })
      } else if (type === 'compare' && previousTestId) {
        response = await fetch('/api/ai/performance-analysis/compare-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentTestId: testId,
            previousTestId,
          }),
        })
      } else if (type === 'trends') {
        response = await fetch('/api/ai/performance-analysis/trends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, months: 12 }),
        })
      } else {
        throw new Error('Invalid analysis type')
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to analyze')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={className}>
            <Brain className="h-4 w-4 mr-2" />
            AI-analys
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleAnalyze('single')}>
            <Sparkles className="h-4 w-4 mr-2" />
            Analysera detta test
          </DropdownMenuItem>
          {previousTestId && (
            <DropdownMenuItem onClick={() => handleAnalyze('compare')}>
              <GitCompare className="h-4 w-4 mr-2" />
              Jämför med föregående test
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleAnalyze('trends')}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Långsiktig trendanalys
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {analysisType === 'single' && 'Testanalys'}
              {analysisType === 'compare' && 'Testjämförelse'}
              {analysisType === 'trends' && 'Trendanalys'}
            </DialogTitle>
            <DialogDescription>
              AI-genererad analys baserad på testdata och träningshistorik
            </DialogDescription>
          </DialogHeader>

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Analyserar data...</p>
                <p className="text-sm text-muted-foreground">
                  Detta kan ta upp till 30 sekunder
                </p>
              </div>
            </div>
          )}

          {error && !isLoading && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Analysfel</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && !isLoading && !error && (
            <>
              {analysisType === 'compare' ? (
                <ComparisonResultCard result={result as TestComparisonResult} />
              ) : (
                <AnalysisResultCard result={result} />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
