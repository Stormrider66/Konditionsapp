import { Loader2 } from 'lucide-react'
import { RolePageFrame, RolePanel } from '@/components/layouts/role-shell/RolePage'

export default function Loading() {
  return (
    <RolePageFrame>
      <RolePanel className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </RolePanel>
    </RolePageFrame>
  )
}
