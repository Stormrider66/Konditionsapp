import { Skeleton } from '@/components/ui/skeleton'

export default function CalendarLoading() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 bg-slate-800" />
            <Skeleton className="h-4 w-64 mt-2 bg-slate-800" />
          </div>
          <Skeleton className="h-10 w-[200px] bg-slate-800" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 bg-slate-800 rounded-xl" />
          ))}
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 bg-slate-800 rounded-xl" />
          <Skeleton className="lg:col-span-2 h-64 bg-slate-800 rounded-xl" />
        </div>

        {/* Athletes */}
        <Skeleton className="h-48 bg-slate-800 rounded-xl" />
      </div>
    </div>
  )
}
