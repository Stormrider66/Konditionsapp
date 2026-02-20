'use client';

/**
 * Cost Estimate Component
 *
 * Displays real-time cost estimation for AI interactions.
 * Shows input/output tokens and estimated cost in USD.
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Coins, TrendingUp, Info } from 'lucide-react';
import {
  GEMINI_PRICING,
  formatCost,
  estimateTokensFromText,
} from '@/lib/ai/gemini-config';

// Default pricing fallback for unknown models
const DEFAULT_PRICING = { input: 0.003, output: 0.015 };

interface CostEstimateProps {
  /** Current input text for estimation */
  inputText?: string;
  /** Actual input tokens from API response */
  inputTokens?: number;
  /** Actual output tokens from API response */
  outputTokens?: number;
  /** Model being used */
  model?: string;
  /** Whether to show detailed breakdown */
  detailed?: boolean;
  /** Session total tokens */
  sessionTotalTokens?: number;
  /** Additional className */
  className?: string;
}

export function CostEstimate({
  inputText,
  inputTokens,
  outputTokens,
  model = 'gemini-3.1-pro-preview',
  detailed = false,
  sessionTotalTokens,
  className,
}: CostEstimateProps) {
  const pricing = GEMINI_PRICING[model] || DEFAULT_PRICING;

  const estimate = useMemo(() => {
    // Use actual tokens if available, otherwise estimate from input text
    const actualInputTokens = inputTokens ?? (inputText ? estimateTokensFromText(inputText) : 0);
    const actualOutputTokens = outputTokens ?? 0;

    const inputCost = (actualInputTokens / 1000) * pricing.input;
    const outputCost = (actualOutputTokens / 1000) * pricing.output;
    const totalCost = inputCost + outputCost;

    // Session cost (estimated)
    const sessionCost = sessionTotalTokens
      ? (sessionTotalTokens / 1000) * ((pricing.input + pricing.output) / 2)
      : null;

    return {
      inputTokens: actualInputTokens,
      outputTokens: actualOutputTokens,
      totalTokens: actualInputTokens + actualOutputTokens,
      inputCost,
      outputCost,
      totalCost,
      sessionCost,
      isEstimate: !inputTokens,
    };
  }, [inputText, inputTokens, outputTokens, pricing, sessionTotalTokens]);

  // Don't show if no data
  if (estimate.totalTokens === 0 && !sessionTotalTokens) {
    return null;
  }

  if (!detailed) {
    // Compact view - just show cost badge
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`text-xs font-normal cursor-help ${className}`}
            >
              <Coins className="h-3 w-3 mr-1" />
              {estimate.isEstimate ? '~' : ''}
              {formatCost(estimate.totalCost)}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1 text-xs">
              <p className="font-medium">Kostnadsuppskattning</p>
              <p>Input: {estimate.inputTokens.toLocaleString()} tokens ({formatCost(estimate.inputCost)})</p>
              <p>Output: {estimate.outputTokens.toLocaleString()} tokens ({formatCost(estimate.outputCost)})</p>
              <p className="pt-1 border-t">
                Totalt: {formatCost(estimate.totalCost)}
                {estimate.isEstimate && ' (uppskattning)'}
              </p>
              {estimate.sessionCost !== null && (
                <p className="text-muted-foreground">
                  Session: ~{formatCost(estimate.sessionCost)}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Detailed view
  return (
    <div className={`bg-muted/50 rounded-lg p-3 text-xs space-y-2 ${className}`}>
      <div className="flex items-center gap-2 font-medium">
        <Coins className="h-4 w-4" />
        <span>Kostnadsuppskattning</span>
        {estimate.isEstimate && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Baserat på uppskattade tokens (~4 tecken/token)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className="text-muted-foreground">Input tokens</p>
          <p className="font-mono">{estimate.inputTokens.toLocaleString()}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground">Output tokens</p>
          <p className="font-mono">{estimate.outputTokens.toLocaleString()}</p>
        </div>
      </div>

      <div className="pt-2 border-t space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Input</span>
          <span className="font-mono">{formatCost(estimate.inputCost)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Output</span>
          <span className="font-mono">{formatCost(estimate.outputCost)}</span>
        </div>
        <div className="flex justify-between font-medium pt-1 border-t">
          <span>Totalt</span>
          <span className="font-mono">{formatCost(estimate.totalCost)}</span>
        </div>
      </div>

      {estimate.sessionCost !== null && (
        <div className="flex items-center gap-1 text-muted-foreground pt-1">
          <TrendingUp className="h-3 w-3" />
          <span>Session totalt: ~{formatCost(estimate.sessionCost)}</span>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Priser baserade på {model.replace('gemini-', 'Gemini ').replace('-preview', '')}
      </p>
    </div>
  );
}

/**
 * Inline cost badge for message display
 */
export function MessageCostBadge({
  inputTokens,
  outputTokens,
  model,
}: {
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
}) {
  if (!inputTokens && !outputTokens) return null;

  const pricing = GEMINI_PRICING[model || ''] || DEFAULT_PRICING;
  const cost = ((inputTokens || 0) / 1000) * pricing.input +
    ((outputTokens || 0) / 1000) * pricing.output;

  return (
    <span className="text-[10px] text-muted-foreground font-mono">
      {formatCost(cost)} ({((inputTokens || 0) + (outputTokens || 0)).toLocaleString()} tokens)
    </span>
  );
}

/**
 * Session cost summary
 */
export function SessionCostSummary({
  totalTokens,
  messageCount,
  model,
}: {
  totalTokens: number;
  messageCount: number;
  model?: string;
}) {
  const pricing = GEMINI_PRICING[model || ''] || DEFAULT_PRICING;
  // Estimate 50/50 split between input and output
  const estimatedCost = (totalTokens / 1000) * ((pricing.input + pricing.output) / 2);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Coins className="h-3 w-3" />
      <span>
        {messageCount} meddelanden | {totalTokens.toLocaleString()} tokens | ~{formatCost(estimatedCost)}
      </span>
    </div>
  );
}
