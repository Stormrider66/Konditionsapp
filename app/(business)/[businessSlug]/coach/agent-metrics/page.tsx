/**
 * Business-scoped Coach Agent Metrics Page
 *
 * Re-exports the standard metrics page with business context.
 */

import { Metadata } from 'next'
import { AgentPerformanceMetrics } from '@/components/coach/agent'
import { RolePageFrame } from '@/components/layouts/role-shell/RolePage'

export const metadata: Metadata = {
  title: 'Agent Performance | Coach Dashboard',
  description: 'AI agent performance metrics and accuracy statistics',
}

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function AgentMetricsPage({ params }: Props) {
  const { businessSlug } = await params
  const basePath = `/${businessSlug}`

  return (
    <RolePageFrame contentClassName="max-w-6xl">
      <AgentPerformanceMetrics basePath={basePath} />
    </RolePageFrame>
  )
}
