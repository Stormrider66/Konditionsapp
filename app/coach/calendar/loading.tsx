import { Loader2 } from 'lucide-react'

export default function CoachCalendarLoading() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
        <p className="text-slate-400 mt-2">Laddar kalender...</p>
      </div>
    </div>
  )
}
