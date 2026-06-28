'use client'

import type { ReactNode } from 'react'
import { CreateBlockPlanDialog } from '@/components/block-plans/CreateBlockPlanDialog'
import type { AthletePlanSummary } from '@/components/athlete-plans/AthletePlanSummaryCard'

interface CreateAthletePlanDialogProps {
  clientId: string
  clientName: string
  onCreated?: (plan: AthletePlanSummary) => void
  onSaved?: (plan: AthletePlanSummary) => void
  trigger?: ReactNode
  initialPlan?: AthletePlanSummary
  defaultTemplateKey?: string
  defaultPlanType?: 'SPECIAL_PROGRAM' | 'INJURY_RECOVERY' | 'RETURN_TO_PLAY' | 'PERFORMANCE'
}

export function CreateAthletePlanDialog({
  clientId,
  clientName,
  onCreated,
  onSaved,
  trigger,
  initialPlan,
  defaultTemplateKey = 'hockey-9',
  defaultPlanType,
}: CreateAthletePlanDialogProps) {
  return (
    <CreateBlockPlanDialog
      endpoint={`/api/clients/${clientId}/athlete-plans${initialPlan ? `/${initialPlan.id}` : ''}`}
      subjectName={clientName}
      subjectLabel="atlet"
      onCreated={onCreated}
      onSaved={onSaved}
      trigger={trigger}
      defaultTemplateKey={defaultTemplateKey}
      initialPlan={initialPlan}
      includePlanType
      defaultPlanType={defaultPlanType}
    />
  )
}
