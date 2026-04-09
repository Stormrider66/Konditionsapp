/**
 * Managed Agents Monitor Page (Standard Route)
 *
 * Re-exports the managed agents monitoring dashboard.
 */

import { Metadata } from 'next'
import { ManagedAgentsMonitor } from '@/components/coach/agent'

export const metadata: Metadata = {
  title: 'Managed Agents | Coach Dashboard',
  description: 'Monitor AI agent sessions, costs, and event processing',
}

export default function ManagedAgentsPage() {
  return (
    <div className="container max-w-6xl py-8">
      <ManagedAgentsMonitor />
    </div>
  )
}
