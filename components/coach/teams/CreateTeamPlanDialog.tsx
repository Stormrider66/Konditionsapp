'use client'

import type { ReactNode } from 'react'
import { CreateBlockPlanDialog } from '@/components/block-plans/CreateBlockPlanDialog'
import type { AthletePlanSummary } from '@/components/athlete-plans/AthletePlanSummaryCard'

interface CreateTeamPlanDialogProps {
  teamId: string
  teamName: string
  businessSlug?: string
  onCreated?: (plan: AthletePlanSummary) => void
  onSaved?: (plan: AthletePlanSummary) => void
  trigger?: ReactNode
  initialPlan?: AthletePlanSummary
}

export function CreateTeamPlanDialog({
  teamId,
  teamName,
  businessSlug,
  onCreated,
  onSaved,
  trigger,
  initialPlan,
}: CreateTeamPlanDialogProps) {
  const params = new URLSearchParams()
  if (businessSlug) params.set('businessSlug', businessSlug)

  return (
    <CreateBlockPlanDialog
      endpoint={`/api/coach/teams/${teamId}/plans${initialPlan ? `/${initialPlan.id}` : ''}${params.size ? `?${params}` : ''}`}
      subjectName={teamName}
      subjectLabel="lag"
      onCreated={onCreated}
      onSaved={onSaved}
      trigger={trigger}
      defaultTemplateKey="hockey-9"
      initialPlan={initialPlan}
    />
  )
}
