// app/(business)/[businessSlug]/athlete/calendar/page.tsx
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Settings, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { UnifiedCalendar } from '@/components/calendar'
import { Button } from '@/components/ui/button'

interface BusinessCalendarPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessAthleteCalendarPage({ params }: BusinessCalendarPageProps) {
  const { businessSlug } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  // Get client info
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
    },
  })

  if (!client) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] text-slate-900 dark:text-white relative overflow-hidden transition-colors">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-400/20 dark:bg-orange-600/10 rounded-full blur-[120px] -z-10" />

      <div className="container mx-auto py-12 px-4 max-w-7xl relative z-10">
        <Link href={`${basePath}/athlete/dashboard`}>
          <Button variant="ghost" className="mb-8 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 group transition-all">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            TILLBAKA TILL DASHBOARD
          </Button>
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl shadow-xl shadow-orange-500/5 transition-colors">
              <CalendarIcon className="h-8 w-8 text-orange-600 dark:text-orange-400 transition-colors" />
            </div>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-1 transition-colors">
                Min <span className="text-orange-600 dark:text-orange-400 transition-colors">Kalender</span>
              </h1>
              <p className="text-slate-600 dark:text-slate-400 font-medium transition-colors">
                Se alla dina träningspass, tävlingar och händelser på ett ställe
              </p>
            </div>
          </div>
          <Link href={`${basePath}/athlete/settings/calendars`}>
            <Button variant="ghost" className="h-11 px-6 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:hover:border-white/20 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 transition-all shadow-sm dark:shadow-none">
              <Settings className="h-4 w-4 mr-2" />
              Anslut kalendrar
            </Button>
          </Link>
        </div>

        <UnifiedCalendar
          clientId={client.id}
          clientName={client.name}
          isCoachView={false}
          variant="glass"
        />
      </div>
    </div>
  )
}
