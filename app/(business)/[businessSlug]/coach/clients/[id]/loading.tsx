import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-12">
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    </div>
  )
}
