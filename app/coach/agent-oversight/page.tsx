/**
 * Coach Agent Oversight Page
 *
 * Full page view for reviewing and managing AI agent actions.
 */

import { Metadata } from 'next'
import { AgentOversightQueue } from '@/components/coach/agent'

export const metadata: Metadata = {
  title: 'Agent Oversight | Coach Dashboard',
  description: 'Review and approve AI agent training recommendations',
}

export default function AgentOversightPage() {
  return (
    <div className="container max-w-6xl py-8">
      <AgentOversightQueue basePath="" />
    </div>
  )
}
