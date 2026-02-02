/**
 * Coach Agent Metrics Page
 *
 * Dashboard showing AI agent performance statistics.
 */

import { Metadata } from 'next'
import { AgentPerformanceMetrics } from '@/components/coach/agent'

export const metadata: Metadata = {
  title: 'Agent Performance | Coach Dashboard',
  description: 'AI agent performance metrics and accuracy statistics',
}

export default function AgentMetricsPage() {
  return (
    <div className="container max-w-6xl py-8">
      <AgentPerformanceMetrics />
    </div>
  )
}
