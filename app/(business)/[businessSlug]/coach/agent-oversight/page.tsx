/**
 * Business-scoped Coach Agent Oversight Page
 *
 * Re-exports the standard page with business context.
 */

import { Metadata } from 'next'
import { AgentOversightQueue } from '@/components/coach/agent'
import { RolePageFrame } from '@/components/layouts/role-shell/RolePage'

export const metadata: Metadata = {
  title: 'Agent Oversight | Coach Dashboard',
  description: 'Review and approve AI agent training recommendations',
}

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function AgentOversightPage({ params }: Props) {
  const { businessSlug } = await params
  const basePath = `/${businessSlug}`

  return (
    <RolePageFrame contentClassName="max-w-6xl">
      <AgentOversightQueue basePath={basePath} />
    </RolePageFrame>
  )
}
