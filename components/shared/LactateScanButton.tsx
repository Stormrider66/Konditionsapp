'use client';

/**
 * Lactate Scan Button
 *
 * Quick camera capture for lactate meter readings during training.
 * Uses Gemini 3 Pro OCR to extract values from meter photos.
 *
 * Use cases:
 * - Coach at trackside/ski course taking photos of meter
 * - Athlete self-reporting during training session
 */

import { useState, useRef } from 'react';
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
import type { LactateMeterOCRResult } from '@/lib/validations/gemini-schemas';

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
  buttonText = 'Scanna laktat',
  iconOnly = false,
  className,
}: LactateScanButtonProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<LactateMeterOCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
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
    setError(null);

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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunde inte analysera bilden');
      }

      const data = await response.json();
      setResult(data.result);

      // Auto-accept if confidence is high
      if (data.result.reading.confidence >= 0.9) {
        toast({
          title: `Laktat: ${data.result.reading.lactateValue} mmol/L`,
          description: 'Hög konfidens - värdet är klart att använda',
        });
      }
    } catch (err) {
      console.error('Lactate OCR error:', err);
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
      toast({
        title: 'Kunde inte läsa av mätaren',
        description: err instanceof Error ? err.message : 'Försök igen med bättre belysning',
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
        title: 'Laktatvärde registrerat',
        description: `${result.reading.lactateValue} mmol/L har lagts till`,
      });
    }
  }

  function handleRetake() {
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  function handleClose() {
    setIsOpen(false);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
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
        {!iconOnly && buttonText}
      </Button>

      {/* Result dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Laktatavläsning
            </DialogTitle>
            <DialogDescription>
              AI analyserar bilden av din laktatmätare
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image preview */}
            {previewUrl && (
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Laktatmätare"
                  className="w-full h-full object-contain"
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Analyserar...</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error state */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Result display */}
            {result && !error && (
              <div className="space-y-3">
                {/* Main value */}
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Avläst värde</p>
                  <p className="text-4xl font-bold">
                    {result.reading.lactateValue}
                    <span className="text-lg font-normal ml-1">mmol/L</span>
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge
                      variant={result.reading.confidence >= 0.8 ? 'default' : 'secondary'}
                    >
                      {Math.round(result.reading.confidence * 100)}% konfidens
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
                    <p className="font-medium mb-1">Tips för bättre resultat:</p>
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
                      Värdet verkar ovanligt. Kontrollera att det stämmer.
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
                Ta om
              </Button>
              {result && !error && (
                <Button
                  onClick={handleAccept}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Använd värde
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
