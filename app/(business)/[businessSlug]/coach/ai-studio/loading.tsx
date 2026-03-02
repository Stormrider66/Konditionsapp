import { RefreshCw } from 'lucide-react'

export default function CoachAiStudioLoading() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-4 w-72 bg-muted animate-pulse rounded mt-2" />
      </div>

      {/* Chat area skeleton */}
      <div className="h-[60vh] bg-muted animate-pulse rounded-lg" />

      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </div>
  )
}
