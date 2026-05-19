'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Bug, Image as ImageIcon, Loader2, MessageSquarePlus, Send, X } from 'lucide-react'
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

const categoryLabels: Record<'en' | 'sv', Record<FeedbackCategory, string>> = {
  en: {
    bug: 'Bug',
    feature_request: 'Suggestion',
    question: 'Question',
    other: 'Other',
  },
  sv: {
    bug: 'Bug',
    feature_request: 'Förslag',
    question: 'Fråga',
    other: 'Annat',
  },
}

const priorityLabels: Record<'en' | 'sv', Record<FeedbackPriority, string>> = {
  en: {
    LOW: 'Low',
    NORMAL: 'Normal',
    HIGH: 'High',
    URGENT: 'Blocking me',
  },
  sv: {
    LOW: 'Låg',
    NORMAL: 'Normal',
    HIGH: 'Hög',
    URGENT: 'Blockerar mig',
  },
}

const fieldClassName =
  'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-400 focus-visible:ring-orange-500'

const labelClassName = 'text-slate-200'
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024

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
  const locale = useLocale()
  const labelLocale = locale === 'sv' ? 'sv' : 'en'
  const t = (sv: string, en: string) => (locale === 'sv' ? sv : en)
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<FeedbackCategory>('bug')
  const [priority, setPriority] = useState<FeedbackPriority>('NORMAL')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [reporterEmail, setReporterEmail] = useState('')
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<string | null>(null)
  const [screenshotInputKey, setScreenshotInputKey] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!screenshotFile) {
      setScreenshotPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(screenshotFile)
    setScreenshotPreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [screenshotFile])

  const resolvedBusinessSlug = useMemo(
    () => businessSlug || getBusinessSlugFromPathname(pathname),
    [businessSlug, pathname]
  )

  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !isSubmitting

  function handleScreenshotChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null
    if (!file) {
      setScreenshotFile(null)
      return
    }

    if (file.size > MAX_SCREENSHOT_BYTES) {
      toast({
        title: t('Bilden är för stor', 'The image is too large'),
        description: t('Maxstorlek är 5 MB.', 'The maximum size is 5 MB.'),
        variant: 'destructive',
      })
      setScreenshotFile(null)
      setScreenshotInputKey((key) => key + 1)
      return
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: t('Ogiltigt filformat', 'Invalid file format'),
        description: t('Välj en bildfil.', 'Choose an image file.'),
        variant: 'destructive',
      })
      setScreenshotFile(null)
      setScreenshotInputKey((key) => key + 1)
      return
    }

    setScreenshotFile(file)
  }

  function clearScreenshot() {
    setScreenshotFile(null)
    setScreenshotInputKey((key) => key + 1)
  }

  async function uploadScreenshotIfNeeded() {
    if (!screenshotFile) return null

    const formData = new FormData()
    formData.append('screenshot', screenshotFile)

    const response = await fetch('/api/support/screenshots', {
      method: 'POST',
      body: formData,
    })
    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.path) {
      throw new Error(result?.error || 'Could not upload screenshot')
    }

    return result.path as string
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)

    try {
      const currentUrl = typeof window !== 'undefined' ? window.location.href : undefined
      const pathSegments = (pathname || '').split('/').filter(Boolean)
      const screenshotPath = await uploadScreenshotIfNeeded()

      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          reporterEmail: reporterEmail.trim() || undefined,
          screenshot: screenshotPath || undefined,
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
            screenshot: screenshotFile
              ? {
                  fileName: screenshotFile.name,
                  fileSize: screenshotFile.size,
                  mimeType: screenshotFile.type,
                }
              : undefined,
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
        title: t('Tack, feedbacken är skickad', 'Thanks, your feedback was sent'),
        description: t('Vi tar den vidare i beta-triagen.', 'We will take it into beta triage.'),
      })
      setTitle('')
      setDescription('')
      setReporterEmail('')
      clearScreenshot()
      setCategory('bug')
      setPriority('NORMAL')
      setOpen(false)
    } catch (error) {
      toast({
        title: t('Kunde inte skicka feedback', 'Could not send feedback'),
        description: error instanceof Error
          ? error.message
          : t('Försök igen om en stund.', 'Try again in a moment.'),
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
          'fixed bottom-5 left-5 z-40 h-11 rounded-full border border-slate-700/80 bg-slate-950/95 px-4 text-slate-100 shadow-lg backdrop-blur hover:bg-slate-900 hover:text-white',
          className
        )}
        onClick={() => setOpen(true)}
        aria-label={t('Öppna feedback', 'Open feedback')}
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="hidden sm:inline">Feedback</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-slate-700 bg-slate-950 text-slate-100 shadow-2xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-50">{t('Skicka feedback', 'Send feedback')}</DialogTitle>
            <DialogDescription className="text-slate-300">
              {t(
                'Buggar, förbättringar och saker som känns fel i beta.',
                'Bugs, improvements, and anything that feels off in beta.'
              )}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="feedback-category" className={labelClassName}>
                  {t('Typ', 'Type')}
                </Label>
                <Select
                  value={category}
                  onValueChange={(value) => setCategory(value as FeedbackCategory)}
                >
                  <SelectTrigger id="feedback-category" className={fieldClassName}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                    {Object.entries(categoryLabels[labelLocale]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-priority" className={labelClassName}>
                  {t('Prioritet', 'Priority')}
                </Label>
                <Select
                  value={priority}
                  onValueChange={(value) => setPriority(value as FeedbackPriority)}
                >
                  <SelectTrigger id="feedback-priority" className={fieldClassName}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                    {Object.entries(priorityLabels[labelLocale]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-title" className={labelClassName}>
                {t('Rubrik', 'Title')}
              </Label>
              <Input
                id="feedback-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={160}
                placeholder={t('Kort sammanfattning', 'Short summary')}
                className={fieldClassName}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-description" className={labelClassName}>
                {t('Detaljer', 'Details')}
              </Label>
              <Textarea
                id="feedback-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={5000}
                placeholder={t(
                  'Vad hände, vad förväntade du dig, och hur kan vi återskapa det?',
                  'What happened, what did you expect, and how can we reproduce it?'
                )}
                className={cn('min-h-32', fieldClassName)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-email" className={labelClassName}>
                {t('E-post (valfritt)', 'Email (optional)')}
              </Label>
              <Input
                id="feedback-email"
                type="email"
                value={reporterEmail}
                onChange={(event) => setReporterEmail(event.target.value)}
                maxLength={254}
                placeholder="namn@example.com"
                className={fieldClassName}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-screenshot" className={labelClassName}>
                {t('Skärmbild (valfritt)', 'Screenshot (optional)')}
              </Label>
              <div className="rounded-md border border-slate-700 bg-slate-950 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 text-sm text-slate-300">
                    {screenshotFile ? (
                      <>
                        <p className="truncate font-medium text-slate-100">{screenshotFile.name}</p>
                        <p className="text-xs text-slate-400">
                          {(screenshotFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </>
                    ) : (
                      <p>{t('Lägg till en bild som visar problemet.', 'Add an image that shows the issue.')}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {screenshotFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-slate-300 hover:bg-slate-900 hover:text-white"
                        onClick={clearScreenshot}
                      >
                        <X className="h-4 w-4" />
                        {t('Ta bort', 'Remove')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-900 hover:text-white"
                      asChild
                    >
                      <label htmlFor="feedback-screenshot" className="cursor-pointer">
                        <ImageIcon className="h-4 w-4" />
                        {t('Välj bild', 'Choose image')}
                      </label>
                    </Button>
                  </div>
                </div>
                <Input
                  key={screenshotInputKey}
                  id="feedback-screenshot"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
                  className="sr-only"
                  onChange={handleScreenshotChange}
                />
                {screenshotPreviewUrl && (
                  <img
                    src={screenshotPreviewUrl}
                    alt={t('Förhandsvisning av skärmbild', 'Screenshot preview')}
                    className="mt-3 max-h-48 w-full rounded-md border border-slate-800 object-contain"
                  />
                )}
              </div>
            </div>

            <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">
              <Bug className="mr-2 inline h-3.5 w-3.5 align-[-2px]" />
              {t(
                'Aktuell sida och teknisk kontext bifogas automatiskt.',
                'Current page and technical context are attached automatically.'
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-900 hover:text-white"
                onClick={() => setOpen(false)}
              >
                {t('Avbryt', 'Cancel')}
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {t('Skicka', 'Send')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
