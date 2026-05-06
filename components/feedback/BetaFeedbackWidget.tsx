'use client'

import { FormEvent, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bug, Loader2, MessageSquarePlus, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'
import { cn } from '@/lib/utils'

type FeedbackCategory = 'bug' | 'feature_request' | 'question' | 'other'
type FeedbackPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
type FeedbackRole = 'ATHLETE' | 'COACH' | 'PHYSIO' | 'ADMIN' | 'UNKNOWN'

interface BetaFeedbackWidgetProps {
  userRole?: FeedbackRole
  clientId?: string | null
  businessSlug?: string | null
  className?: string
}

const categoryLabels: Record<FeedbackCategory, string> = {
  bug: 'Bug',
  feature_request: 'Förslag',
  question: 'Fråga',
  other: 'Annat',
}

const priorityLabels: Record<FeedbackPriority, string> = {
  LOW: 'Låg',
  NORMAL: 'Normal',
  HIGH: 'Hög',
  URGENT: 'Blockerar mig',
}

function getViewportMetadata() {
  if (typeof window === 'undefined') return {}

  const connection = (window.navigator as Navigator & {
    connection?: {
      effectiveType?: string
      downlink?: number
      saveData?: boolean
    }
  }).connection

  return {
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    },
    screen: {
      width: window.screen?.width,
      height: window.screen?.height,
    },
    locale: window.navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: window.navigator.platform,
    online: window.navigator.onLine,
    connection: connection
      ? {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          saveData: connection.saveData,
        }
      : undefined,
  }
}

export function BetaFeedbackWidget({
  userRole = 'UNKNOWN',
  clientId,
  businessSlug,
  className,
}: BetaFeedbackWidgetProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<FeedbackCategory>('bug')
  const [priority, setPriority] = useState<FeedbackPriority>('NORMAL')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [reporterEmail, setReporterEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resolvedBusinessSlug = useMemo(
    () => businessSlug || getBusinessSlugFromPathname(pathname),
    [businessSlug, pathname]
  )

  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !isSubmitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)

    try {
      const currentUrl = typeof window !== 'undefined' ? window.location.href : undefined
      const pathSegments = (pathname || '').split('/').filter(Boolean)

      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          reporterEmail: reporterEmail.trim() || undefined,
          url: currentUrl,
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
          metadata: {
            source: 'beta_feedback_widget',
            submittedAt: new Date().toISOString(),
            userRole,
            clientId: clientId || undefined,
            businessSlug: resolvedBusinessSlug || undefined,
            pathname,
            appArea: pathSegments.slice(0, 3).join('/') || undefined,
            referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
            ...getViewportMetadata(),
          },
        }),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error || 'Could not submit feedback')
      }

      toast({
        title: 'Tack, feedbacken är skickad',
        description: 'Vi tar den vidare i beta-triagen.',
      })
      setTitle('')
      setDescription('')
      setReporterEmail('')
      setCategory('bug')
      setPriority('NORMAL')
      setOpen(false)
    } catch (error) {
      toast({
        title: 'Kunde inte skicka feedback',
        description: error instanceof Error ? error.message : 'Försök igen om en stund.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className={cn(
          'fixed bottom-5 left-5 z-40 h-11 rounded-full border border-slate-200/70 bg-white/95 px-4 text-slate-900 shadow-lg backdrop-blur hover:bg-white dark:border-slate-700/70 dark:bg-slate-900/95 dark:text-slate-100 dark:hover:bg-slate-900',
          className
        )}
        onClick={() => setOpen(true)}
        aria-label="Öppna feedback"
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="hidden sm:inline">Feedback</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Skicka feedback</DialogTitle>
            <DialogDescription>
              Buggar, förbättringar och saker som känns fel i beta.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="feedback-category">Typ</Label>
                <Select
                  value={category}
                  onValueChange={(value) => setCategory(value as FeedbackCategory)}
                >
                  <SelectTrigger id="feedback-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-priority">Prioritet</Label>
                <Select
                  value={priority}
                  onValueChange={(value) => setPriority(value as FeedbackPriority)}
                >
                  <SelectTrigger id="feedback-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-title">Rubrik</Label>
              <Input
                id="feedback-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={160}
                placeholder="Kort sammanfattning"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-description">Detaljer</Label>
              <Textarea
                id="feedback-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={5000}
                placeholder="Vad hände, vad förväntade du dig, och hur kan vi återskapa det?"
                className="min-h-32"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-email">E-post (valfritt)</Label>
              <Input
                id="feedback-email"
                type="email"
                value={reporterEmail}
                onChange={(event) => setReporterEmail(event.target.value)}
                maxLength={254}
                placeholder="namn@example.com"
              />
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
              <Bug className="mr-2 inline h-3.5 w-3.5 align-[-2px]" />
              Aktuell sida och teknisk kontext bifogas automatiskt.
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Skicka
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
