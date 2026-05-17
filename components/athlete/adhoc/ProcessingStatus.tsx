'use client'

/**
 * Processing Status Component
 *
 * Shows loading/processing state while AI parses the workout.
 * Includes retry option on failure.
 */

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'

type ProcessingState = 'processing' | 'success' | 'error'

interface ProcessingStatusProps {
  state: ProcessingState
  message?: string
  errorMessage?: string
  onRetry?: () => void
  onContinue?: () => void
  className?: string
}

export function ProcessingStatus({
  state,
  message,
  errorMessage,
  onRetry,
  onContinue,
  className,
}: ProcessingStatusProps) {
  const t = useTranslations('components.adHocProcessingStatus')

  return (
    <Card className={cn('w-full max-w-md mx-auto', className)}>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {state === 'processing' && (
            <>
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                {/* Pulsing ring */}
                <div className="absolute inset-0 h-16 w-16 rounded-full bg-primary/20 animate-ping" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold">{t('processing.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {message || t('processing.message')}
                </p>
              </div>
              {/* Progress dots */}
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-green-600">{t('success.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {message || t('success.message')}
                </p>
              </div>
              {onContinue && (
                <Button onClick={onContinue}>
                  {t('actions.continue')}
                </Button>
              )}
            </>
          )}

          {state === 'error' && (
            <>
              <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-red-600">{t('error.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {errorMessage || t('error.message')}
                </p>
              </div>
              {onRetry && (
                <Button variant="outline" onClick={onRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('actions.retry')}
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
