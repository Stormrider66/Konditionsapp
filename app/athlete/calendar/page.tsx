import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Settings, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { UnifiedCalendar } from '@/components/calendar'
import { Button } from '@/components/ui/button'

export default async function AthleteCalendarPage() {
  const user = await requireAthlete()

  // Get athlete account
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!athleteAccount) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[120px] -z-10" />

      <div className="container mx-auto py-12 px-4 max-w-7xl relative z-10">
        <Link href="/athlete/dashboard">
          <Button variant="ghost" className="mb-8 text-slate-400 hover:text-white hover:bg-white/5 group">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            TILLBAKA TILL DASHBOARD
          </Button>
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl shadow-xl shadow-orange-500/5">
              <CalendarIcon className="h-8 w-8 text-orange-400" />
            </div>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-1">
                Min <span className="text-orange-400">Kalender</span>
              </h1>
              <p className="text-slate-400 font-medium">
                Se alla dina träningspass, tävlingar och händelser på ett ställe
              </p>
            </div>
          </div>
          <Link href="/athlete/settings/calendars">
            <Button variant="ghost" className="h-11 px-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-xs font-black uppercase tracking-widest text-slate-300 transition-all">
              <Settings className="h-4 w-4 mr-2" />
              Anslut kalendrar
            </Button>
          </Link>
        </div>

        <UnifiedCalendar
          clientId={athleteAccount.clientId}
          clientName={athleteAccount.client.name}
          isCoachView={false}
          variant="glass"
        />
      </div>
    </div>
  )
}
