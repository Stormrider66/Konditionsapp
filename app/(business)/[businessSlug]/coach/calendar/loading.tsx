import { Skeleton } from '@/components/ui/skeleton'
import { RolePageFrame, roleSkeletonClass } from '@/components/layouts/role-shell/RolePage'

export default function CalendarLoading() {
  return (
    <RolePageFrame>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className={roleSkeletonClass('h-8 w-48')} />
            <Skeleton className={roleSkeletonClass('mt-2 h-4 w-64')} />
          </div>
          <Skeleton className={roleSkeletonClass('h-10 w-[200px]')} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className={roleSkeletonClass('h-24')} />
          ))}
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className={roleSkeletonClass('h-64')} />
          <Skeleton className={roleSkeletonClass('h-64 lg:col-span-2')} />
        </div>

        {/* Athletes */}
        <Skeleton className={roleSkeletonClass('h-48')} />
      </div>
    </RolePageFrame>
  )
}
