'use client'

// Early-return panels for the athlete floating chat: config loading,
// no AI access, subscription limit reached, and GDPR consent.

import type { CSSProperties } from 'react'
import Link from 'next/link'
import { Bot, Loader2, Lock, ShieldCheck, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { AIChatUsageMeter } from '@/components/athlete/AIChatUsageMeter'
import { cn } from '@/lib/utils'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { useTranslations } from '@/i18n/client'

interface GatePanelProps {
  style?: CSSProperties
  onClose: () => void
}

export function AthleteChatLoadingPanel({ style, onClose }: GatePanelProps) {
  const t = useTranslations('components.athleteFloatingChat')

  return (
    <div
      className={cn(
        'fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col',
        'bottom-6 left-3 right-3 h-[200px] sm:left-auto sm:right-6 sm:w-[380px]'
      )}
      style={style}
      data-floating-chat-root
    >
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-white" />
          <span className="font-semibold text-white">{t('header.title')}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-white hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </div>
  )
}

export function AthleteChatNoAccessPanel({ style, onClose }: GatePanelProps) {
  const t = useTranslations('components.athleteFloatingChat')

  return (
    <div
      className={cn(
        'fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col',
        'bottom-6 left-3 right-3 h-[300px] sm:left-auto sm:right-6 sm:w-[380px]'
      )}
      style={style}
      data-floating-chat-root
    >
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-white" />
          <span className="font-semibold text-white">{t('header.title')}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-white hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">{t('accessUnavailable.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('accessUnavailable.description')}
          </p>
        </div>
      </div>
    </div>
  )
}

export interface AthleteChatSubscriptionErrorInfo {
  code: string
  message: string
  upgradeUrl?: string
  actionLabel?: string
}

export function AthleteChatSubscriptionPanel({
  style,
  onClose,
  error,
  usage,
}: GatePanelProps & {
  error: AthleteChatSubscriptionErrorInfo
  usage: { used: number; limit: number } | null
}) {
  const t = useTranslations('components.athleteFloatingChat')
  const basePath = useBasePath()

  return (
    <div
      className={cn(
        'fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col',
        'bottom-6 left-3 right-3 h-[350px] sm:left-auto sm:right-6 sm:w-[380px]'
      )}
      style={style}
      data-floating-chat-root
    >
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-white" />
          <span className="font-semibold text-white">{t('subscription.title')}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-white hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <Lock className="h-12 w-12 mx-auto mb-4 text-amber-500" />
          <h3 className="font-semibold mb-2">{error.message}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('subscription.description')}
          </p>
          {usage && usage.limit > 0 && (
            <div className="mb-4">
              <AIChatUsageMeter
                used={usage.used}
                limit={usage.limit}
              />
            </div>
          )}
          <Link href={`${basePath}${error.upgradeUrl || '/athlete/subscription'}`}>
            <Button className="bg-amber-600 hover:bg-amber-700">
              {error.actionLabel || t('subscription.action')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export function AthleteChatConsentPanel({
  style,
  onClose,
  dataProcessing,
  onDataProcessingChange,
  healthData,
  onHealthDataChange,
  isGranting,
  onGrant,
}: GatePanelProps & {
  dataProcessing: boolean
  onDataProcessingChange: (checked: boolean) => void
  healthData: boolean
  onHealthDataChange: (checked: boolean) => void
  isGranting: boolean
  onGrant: () => void
}) {
  const t = useTranslations('components.athleteFloatingChat')

  return (
    <div
      className={cn(
        'fixed z-50 bg-background border rounded-lg shadow-2xl flex flex-col',
        'bottom-6 left-3 right-3 max-h-[420px] sm:left-auto sm:right-6 sm:w-[380px]'
      )}
      style={style}
      data-floating-chat-root
    >
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-lg">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-white" />
          <span className="font-semibold text-white">{t('consent.title')}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-white hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 p-5 overflow-y-auto">
        <div className="text-center mb-4">
          <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-emerald-600" />
          <h3 className="font-semibold mb-1">{t('consent.heading')}</h3>
          <p className="text-xs text-muted-foreground">
            {t('consent.description')}
          </p>
        </div>
        <div className="space-y-3 mb-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={dataProcessing}
              onCheckedChange={(checked) => onDataProcessingChange(checked === true)}
              className="mt-0.5"
            />
            <div>
              <span className="text-sm font-medium">{t('consent.trainingDataLabel')}</span>
              <p className="text-xs text-muted-foreground">
                {t('consent.trainingDataDescription')}
              </p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={healthData}
              onCheckedChange={(checked) => onHealthDataChange(checked === true)}
              className="mt-0.5"
            />
            <div>
              <span className="text-sm font-medium">{t('consent.healthDataLabel')}</span>
              <p className="text-xs text-muted-foreground">
                {t('consent.healthDataDescription')}
              </p>
            </div>
          </label>
        </div>
        <Button
          onClick={onGrant}
          disabled={!dataProcessing || !healthData || isGranting}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {isGranting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <ShieldCheck className="h-4 w-4 mr-2" />
          )}
          {t('consent.approve')}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          {t('consent.revokeHint')}
        </p>
      </div>
    </div>
  )
}
