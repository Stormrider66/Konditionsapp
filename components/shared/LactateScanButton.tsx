'use client';

/**
 * Lactate Scan Button
 *
 * Quick camera capture for lactate meter readings during training.
 * Uses Gemini 3.1 Pro OCR to extract values from meter photos.
 *
 * Use cases:
 * - Coach at trackside/ski course taking photos of meter
 * - Athlete self-reporting during training session
 */

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Camera, Loader2, CheckCircle, AlertTriangle, RotateCcw, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/i18n/client';
import type { LactateMeterOCRResult } from '@/lib/validations/gemini-schemas';
import {
  type AiAllowanceExhaustedError,
  getAiAllowanceUpgradeMessage,
  isAiAllowanceExhaustedError,
  parseAiAllowanceError,
} from '@/lib/ai/billing/client-errors';
import { AiAllowanceBlockedAction, type AiAllowanceAction } from '@/components/athlete/ai/AiAllowanceBlockedAction';

interface LactateScanButtonProps {
  /** Called when a lactate value is successfully extracted */
  onValueDetected: (value: number, confidence: number, rawResult: LactateMeterOCRResult) => void;
  /** Optional client ID for context */
  clientId?: string;
  /** Optional context about the test stage */
  testStageContext?: string;
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Custom button text */
  buttonText?: string;
  /** Show as icon only */
  iconOnly?: boolean;
  /** Additional className */
  className?: string;
}

export function LactateScanButton({
  onValueDetected,
  clientId,
  testStageContext,
  variant = 'outline',
  size = 'default',
  buttonText,
  iconOnly = false,
  className,
}: LactateScanButtonProps) {
  const t = useTranslations('components.lactateScan');
  const buttonTextLabel = buttonText ?? t('buttonText');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<LactateMeterOCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiAllowanceAction, setAiAllowanceAction] = useState<AiAllowanceAction | null>(null);

  const clearError = () => {
    setError(null);
    setAiAllowanceAction(null);
  };

  const showAiAllowanceError = (allowanceError: AiAllowanceExhaustedError) => {
    const description = `${allowanceError.message} ${getAiAllowanceUpgradeMessage(allowanceError)}`;
    setError(description);
    setAiAllowanceAction({
      label: allowanceError.actionLabel,
      url: allowanceError.actionUrl,
    });
    return description;
  };

  function handleClick() {
    // On mobile, directly open camera
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setIsOpen(true);
    clearError();
    setResult(null);

    // Process the image
    await processImage(file);

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function processImage(file: File) {
    setIsProcessing(true);
    clearError();

    try {
      const formData = new FormData();
      formData.append('image', file);
      if (clientId) {
        formData.append('clientId', clientId);
      }
      if (testStageContext) {
        formData.append('testStageContext', testStageContext);
      }

      const response = await fetch('/api/ai/lactate-ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const allowanceError = parseAiAllowanceError(errorData);
        if (allowanceError) throw allowanceError;
        throw new Error(errorData?.error || t('scanError'));
      }

      const data = await response.json();
      setResult(data.result);

      // Auto-accept if confidence is high
      if (data.result.reading.confidence >= 0.9) {
        toast({
          title: `${t('valueLabel')}: ${data.result.reading.lactateValue} mmol/L`,
          description: t('autoAcceptDescription'),
        });
      }
    } catch (err) {
      console.error('Lactate OCR error:', err);
      const message = err instanceof Error ? err.message : t('scanErrorFallback');
      const description = isAiAllowanceExhaustedError(err)
        ? showAiAllowanceError(err)
        : message;
      if (!isAiAllowanceExhaustedError(err)) {
        setError(description);
        setAiAllowanceAction(null);
      }
      toast({
        title: t('scanFailureTitle'),
        description,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }

  function handleAccept() {
    if (result) {
      onValueDetected(
        result.reading.lactateValue,
        result.reading.confidence,
        result
      );
      handleClose();
      toast({
        title: t('successTitle'),
        description: `${result.reading.lactateValue} mmol/L ${t('successSuffix')}`,
      });
    }
  }

  function handleRetake() {
    setPreviewUrl(null);
    setResult(null);
    clearError();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  function handleClose() {
    setIsOpen(false);
    setPreviewUrl(null);
    setResult(null);
    clearError();
  }

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Trigger button */}
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleClick}
        className={className}
      >
        <Camera className={iconOnly ? 'h-4 w-4' : 'h-4 w-4 mr-2'} />
        {!iconOnly && buttonTextLabel}
      </Button>

      {/* Result dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              {t('dialogTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('dialogDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image preview */}
            {previewUrl && (
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <Image
                  src={previewUrl}
                  alt={t('imageAlt')}
                  fill
                  className="object-contain"
                  unoptimized
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">{t('analyzing')}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error state */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="space-y-3">
                  <p>{error}</p>
                  <AiAllowanceBlockedAction action={aiAllowanceAction} tone="red" />
                </AlertDescription>
              </Alert>
            )}

            {/* Result display */}
            {result && !error && (
              <div className="space-y-3">
                {/* Main value */}
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">{t('readValueLabel')}</p>
                  <p className="text-4xl font-bold">
                    {result.reading.lactateValue}
                    <span className="text-lg font-normal ml-1">mmol/L</span>
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge
                      variant={result.reading.confidence >= 0.8 ? 'default' : 'secondary'}
                    >
                      {Math.round(result.reading.confidence * 100)}% {t('confidenceSuffix')}
                    </Badge>
                    {result.deviceInfo.detectedBrand !== 'UNKNOWN' && (
                      <Badge variant="outline">
                        {result.deviceInfo.detectedBrand.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Validation warnings */}
                {result.validationFlags.requiresConfirmation && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {result.validationFlags.notes.join('. ')}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Image quality issues */}
                {result.imageQuality.issues.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">{t('tipsTitle')}</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {result.imageQuality.issues.map((issue, i) => (
                        <li key={i}>{issue.suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Physiological plausibility warning */}
                {!result.validationFlags.physiologicallyPlausible && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {t('unusualValue')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRetake}
                disabled={isProcessing}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('retake')}
              </Button>
              {result && !error && (
                <Button
                  onClick={handleAccept}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('useValue')}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
