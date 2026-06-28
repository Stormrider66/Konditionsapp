import { RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { RolePageFrame, roleSkeletonClass } from '@/components/layouts/role-shell/RolePage'

export default function CoachAnalyticsLoading() {
  return (
    <RolePageFrame>
      <div className="mb-6">
        <Skeleton className={roleSkeletonClass('h-8 w-32')} />
        <Skeleton className={roleSkeletonClass('mt-2 h-4 w-64')} />
      </div>

      {/* Stats row skeleton */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className={roleSkeletonClass('h-28')} />
        ))}
      </div>

      {/* Chart skeleton */}
      <Skeleton className={roleSkeletonClass('mb-6 h-72')} />

      {/* Table skeleton */}
      <div className="space-y-3">
        <Skeleton className={roleSkeletonClass('h-10 w-full')} />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className={roleSkeletonClass('h-14 w-full')} />
        ))}
      </div>

      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </RolePageFrame>
  )
}
