/**
 * Managed Agents Monitor Page
 *
 * Dashboard for monitoring Claude Managed Agent sessions,
 * costs, events, and shadow mode comparison.
 */

import { Metadata } from 'next'
import { ManagedAgentsMonitor } from '@/components/coach/agent'
import { RolePageFrame } from '@/components/layouts/role-shell/RolePage'

export const metadata: Metadata = {
  title: 'Managed Agents | Coach Dashboard',
  description: 'Monitor AI agent sessions, costs, and event processing',
}

export default function ManagedAgentsPage() {
  return (
    <RolePageFrame contentClassName="max-w-6xl">
      <ManagedAgentsMonitor />
    </RolePageFrame>
  )
}
