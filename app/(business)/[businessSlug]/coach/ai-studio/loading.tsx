import { RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { RolePageFrame, roleSkeletonClass } from '@/components/layouts/role-shell/RolePage'

export default function CoachAiStudioLoading() {
  return (
    <RolePageFrame>
      <div className="mb-6">
        <Skeleton className={roleSkeletonClass('h-8 w-32')} />
        <Skeleton className={roleSkeletonClass('mt-2 h-4 w-72')} />
      </div>

      {/* Chat area skeleton */}
      <Skeleton className={roleSkeletonClass('h-[60vh]')} />

      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </RolePageFrame>
  )
}
