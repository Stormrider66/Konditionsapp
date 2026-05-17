'use client'

import { useState, useRef, useCallback } from 'react'
import { useLocale, useTranslations } from '@/i18n/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Share2, Copy, Link2, Loader2, Check, Trash2 } from 'lucide-react'
import { MilestoneShareableCard } from './MilestoneShareableCard'
import { StreakShareableCard } from './StreakShareableCard'
import type { CelebrationLevel } from '@/lib/milestone-constants'

interface MilestoneData {
  milestoneType?: string
  celebrationLevel?: CelebrationLevel
  value?: number
  unit?: string
  improvement?: number
  previousBest?: number
}

interface StreakData {
  currentStreak: number
  personalBest: number
  checkInHistory?: Array<{ date: string; checkedIn: boolean }>
}

interface ShareAchievementButtonProps {
  type: 'MILESTONE' | 'STREAK'
  title: string
  description?: string
  contextData?: MilestoneData
  streakData?: StreakData
  athleteName?: string
}

export function ShareAchievementButton({
  type,
  title,
  description = '',
  contextData,
  streakData,
  athleteName,
}: ShareAchievementButtonProps) {
  const t = useTranslations('components.shareAchievementButton')
  const locale = useLocale()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [shareId, setShareId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const generateShareLink = useCallback(async () => {
    if (!cardRef.current) return
    setIsGenerating(true)

    try {
      // Lazy-load html2canvas-pro only when the user actually clicks share —
      // keeps it out of the initial client bundle.
      const { default: html2canvas } = await import('html2canvas-pro')

      // Render the card to canvas
      const canvas = await html2canvas(cardRef.current, {
        width: 1200,
        height: 630,
        scale: 1,
        useCORS: true,
        backgroundColor: null,
      })

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b)
          else reject(new Error('Failed to create image blob'))
        }, 'image/png')
      })

      // Upload via API
      const formData = new FormData()
      formData.append('image', blob, 'achievement.png')
      formData.append(
        'metadata',
        JSON.stringify({
          type,
          title,
          description,
          contextData: type === 'MILESTONE' ? contextData : streakData,
        })
      )

      const response = await fetch('/api/athlete/share-achievement', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setShareLink(data.publicUrl)
        setShareId(data.id)
        setExpiresAt(data.expiresAt)
        toast({
          title: t('toasts.linkCreated.title'),
          description: t('toasts.linkCreated.description'),
        })
      } else {
        toast({
          title: t('toasts.errorTitle'),
          description: data.error || t('toasts.createFailed'),
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error generating share link:', error)
      toast({
        title: t('toasts.errorTitle'),
        description: t('toasts.createFailed'),
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }, [type, title, description, contextData, streakData, toast, t])

  const revokeLink = async () => {
    if (!shareId) return
    setIsGenerating(true)

    try {
      const response = await fetch(`/api/athlete/share-achievement/${shareId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setShareLink(null)
        setShareId(null)
        setExpiresAt(null)
        toast({
          title: t('toasts.linkRevoked.title'),
          description: t('toasts.linkRevoked.description'),
        })
      } else {
        const data = await response.json()
        toast({
          title: t('toasts.errorTitle'),
          description: data.error || t('toasts.revokeFailed'),
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: t('toasts.errorTitle'),
        description: t('toasts.revokeFailed'),
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const copyLink = async () => {
    if (!shareLink) return
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      toast({ title: t('toasts.copied.title'), description: t('toasts.copied.description') })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: t('toasts.errorTitle'), description: t('toasts.copyFailed'), variant: 'destructive' })
    }
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('dialog.title')}</DialogTitle>
          <DialogDescription>
            {t('dialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Hidden full-size card for html2canvas capture */}
          <div
            style={{
              position: 'absolute',
              left: '-9999px',
              top: 0,
            }}
          >
            {type === 'MILESTONE' ? (
              <MilestoneShareableCard
                ref={cardRef}
                title={title}
                description={description}
                milestoneType={contextData?.milestoneType}
                celebrationLevel={contextData?.celebrationLevel || 'BRONZE'}
                value={contextData?.value}
                unit={contextData?.unit}
                improvement={contextData?.improvement}
                previousBest={contextData?.previousBest}
                athleteName={athleteName}
              />
            ) : (
              <StreakShareableCard
                ref={cardRef}
                currentStreak={streakData?.currentStreak || 0}
                personalBest={streakData?.personalBest || 0}
                checkInHistory={streakData?.checkInHistory}
                athleteName={athleteName}
              />
            )}
          </div>

          {/* Scaled-down preview */}
          <div className="border rounded-lg overflow-hidden bg-muted/30">
            <div style={{ transform: 'scale(0.35)', transformOrigin: 'top left', width: 1200, height: 630 }}>
              {type === 'MILESTONE' ? (
                <MilestoneShareableCard
                  title={title}
                  description={description}
                  milestoneType={contextData?.milestoneType}
                  celebrationLevel={contextData?.celebrationLevel || 'BRONZE'}
                  value={contextData?.value}
                  unit={contextData?.unit}
                  improvement={contextData?.improvement}
                  previousBest={contextData?.previousBest}
                  athleteName={athleteName}
                />
              ) : (
                <StreakShareableCard
                  currentStreak={streakData?.currentStreak || 0}
                  personalBest={streakData?.personalBest || 0}
                  checkInHistory={streakData?.checkInHistory}
                  athleteName={athleteName}
                />
              )}
            </div>
          </div>

          {shareLink ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-md border">
                  <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate">{shareLink}</span>
                </div>
                <Button size="icon" variant="outline" onClick={copyLink} disabled={copied}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              {expiresAt && (
                <p className="text-sm text-muted-foreground">
                  {t('expiresAt', { date: formatDate(expiresAt) })}
                </p>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={revokeLink}
                disabled={isGenerating}
                className="text-red-600 hover:text-red-700"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {t('actions.revoke')}
              </Button>
            </>
          ) : (
            <Button
              onClick={generateShareLink}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              {t('actions.create')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
