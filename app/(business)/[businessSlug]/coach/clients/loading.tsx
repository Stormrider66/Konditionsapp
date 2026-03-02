import { RefreshCw } from 'lucide-react'

export default function CoachClientsLoading() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <div className="h-8 w-36 bg-muted animate-pulse rounded" />
        <div className="h-4 w-56 bg-muted animate-pulse rounded mt-2" />
      </div>

      {/* Search/filter bar skeleton */}
      <div className="flex gap-3 mb-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded-md" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-3">
        <div className="h-10 w-full bg-muted animate-pulse rounded" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 w-full bg-muted animate-pulse rounded" />
        ))}
      </div>

      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </div>
  )
}
