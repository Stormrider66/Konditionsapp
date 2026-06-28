import { RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { RolePageFrame, roleSkeletonClass } from '@/components/layouts/role-shell/RolePage'

export default function CoachAthletesLoading() {
  return (
    <RolePageFrame>
      <div className="mb-6">
        <Skeleton className={roleSkeletonClass('h-8 w-40')} />
        <Skeleton className={roleSkeletonClass('mt-2 h-4 w-64')} />
      </div>

      {/* Search/filter bar skeleton */}
      <div className="mb-6 flex gap-3">
        <Skeleton className={roleSkeletonClass('h-10 w-64 rounded-md')} />
        <Skeleton className={roleSkeletonClass('h-10 w-32 rounded-md')} />
      </div>

      {/* Table skeleton */}
      <div className="space-y-3">
        <Skeleton className={roleSkeletonClass('h-10 w-full')} />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className={roleSkeletonClass('h-14 w-full')} />
        ))}
      </div>

      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </RolePageFrame>
  )
}
