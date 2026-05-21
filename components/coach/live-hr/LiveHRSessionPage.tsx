/**
 * Live HR Session Detail Page
 *
 * Displays real-time HR monitoring for a specific session.
 */

import { requireCoach } from '@/lib/auth-utils'
import { getSession, getAvailableClients } from '@/lib/live-hr/session-service'
import { getSessionStreamData } from '@/lib/live-hr/reading-service'
import { LiveHRDashboard } from '@/components/coach/live-hr/LiveHRDashboard'
import {
  GlassCard,
  GlassCardContent,
} from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLocale } from '@/i18n/server'

interface PageProps {
  params: Promise<{
    businessSlug?: string
    id: string
  }>
}

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  accessDeniedTitle: string
  accessDeniedDescription: string
  back: string
}> = {
  en: {
    accessDeniedTitle: 'Access denied',
    accessDeniedDescription: 'You do not have permission to view this session.',
    back: 'Back',
  },
  sv: {
    accessDeniedTitle: 'Åtkomst nekad',
    accessDeniedDescription: 'Du har inte behörighet att visa denna session.',
    back: 'Tillbaka',
  },
}

export default async function LiveHRSessionPage({ params }: PageProps) {
  const user = await requireCoach()
  const locale: AppLocale = (await getLocale()) === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const { businessSlug, id } = await params
  const basePath = businessSlug ? `/${businessSlug}` : ''

  // Get session data
  const session = await getSession(id)

  if (!session) {
    notFound()
  }

  // Verify ownership
  if (session.coachId !== user.id) {
    return (
      <div className="container mx-auto py-8">
        <GlassCard glow="red" className="border border-slate-200 dark:border-white/5 bg-white/60 dark:bg-slate-900/60 shadow-md">
          <GlassCardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{copy.accessDeniedTitle}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{copy.accessDeniedDescription}</p>
            <Link href={`${basePath}/coach/live-hr`}>
              <Button variant="outline" className="border-slate-250 dark:border-white/10 text-slate-700 dark:text-slate-300">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {copy.back}
              </Button>
            </Link>
          </GlassCardContent>
        </GlassCard>
      </div>
    )
  }

  // Get stream data for initial render
  const streamData = await getSessionStreamData(id)
  if (!streamData) {
    notFound()
  }

  // Get available clients
  const availableClients = await getAvailableClients(id, user.id)

  return (
    <div className="container mx-auto py-8">
      <LiveHRDashboard
        sessionId={id}
        initialData={streamData}
        initialAvailableClients={availableClients}
      />
    </div>
  )
}
