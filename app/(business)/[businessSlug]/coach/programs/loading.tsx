import { RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { RolePageFrame, roleSkeletonClass } from '@/components/layouts/role-shell/RolePage'

export default function CoachProgramsLoading() {
  return (
    <RolePageFrame>
      <div className="mb-6">
        <Skeleton className={roleSkeletonClass('h-8 w-36')} />
        <Skeleton className={roleSkeletonClass('mt-2 h-4 w-64')} />
      </div>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className={roleSkeletonClass('h-48')} />
        ))}
      </div>

      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </RolePageFrame>
  )
}
