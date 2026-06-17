export const painAlertResolutionOutcomes = [
  { value: 'CHECKED_IN', label: 'Checked in with athlete' },
  { value: 'TRAINING_ADJUSTED', label: 'Adjusted training' },
  { value: 'REFERRED_PHYSIO', label: 'Referred to physio' },
  { value: 'FALSE_ALARM', label: 'False alarm' },
  { value: 'MONITOR_NEXT_SESSION', label: 'Monitor next session' },
] as const

export type PainAlertResolutionOutcome = typeof painAlertResolutionOutcomes[number]['value']

export function painAlertOutcomeLabel(value: string | null | undefined): string {
  return painAlertResolutionOutcomes.find(outcome => outcome.value === value)?.label ?? 'Follow-up recorded'
}
