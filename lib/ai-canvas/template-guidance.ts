import { z } from 'zod'

export const canvasTemplateIdSchema = z.enum([
  'blank',
  'athlete-review',
  'weekly-briefing',
  'team-risk',
  'program-notes',
  'athlete-progress-report',
  'team-monthly-report',
  'program-audit',
  'test-interpretation-report',
  'return-to-training-plan',
])

export type CanvasTemplateIdInput = z.infer<typeof canvasTemplateIdSchema>

export const TEMPLATE_GUIDANCE: Record<CanvasTemplateIdInput, string> = {
  blank: 'Create the most useful canvas structure for the coach request.',
  'athlete-review': 'Create an athlete review with current state, interpretation, risks or data gaps, and next steps.',
  'weekly-briefing': 'Create a weekly coach briefing with priorities, follow-ups, and decisions.',
  'team-risk': 'Create a team risk scan with signals, likely causes, and safe follow-up actions.',
  'program-notes': 'Create program planning notes with goals, block structure, key sessions, and checkpoints.',
  'athlete-progress-report': [
    'Create a polished athlete progress report.',
    'Use a report structure: executive summary, evidence snapshot, development signals, risks/data gaps, recommendations, next steps.',
    'Write as a coach-facing deliverable that can later be exported or shared after coach review.',
  ].join(' '),
  'team-monthly-report': [
    'Create a polished team monthly report.',
    'Use a report structure: executive summary, team status, testing/data coverage, training completion/readiness signals, risks, next-month priorities.',
    'Keep it concise and decision-oriented for coaches or staff.',
  ].join(' '),
  'program-audit': [
    'Create a program audit.',
    'Use a report structure: program purpose, fit against current data, load/risk review, missing context, recommended changes, coach decisions.',
    'Do not rewrite the full program unless asked; focus on audit findings and actionable adjustments.',
  ].join(' '),
  'test-interpretation-report': [
    'Create a test interpretation report.',
    'Use a report structure: test overview, physiological interpretation, training implications, limitations/missing data, next testing/training decisions.',
    'Do not invent thresholds or values that are not in the context.',
  ].join(' '),
  'return-to-training-plan': [
    'Create a cautious return-to-training plan.',
    'Use a report structure: current status, constraints, phased progression, monitoring checkpoints, warning signs, coach actions.',
    'Stay non-medical and advise professional medical input when pain/illness/red flags are unclear.',
  ].join(' '),
}
