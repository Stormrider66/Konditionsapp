export const AI_ALLOWANCE_EXHAUSTED_CODE = 'AI_ALLOWANCE_EXHAUSTED'
export const AI_ALLOWANCE_EXHAUSTED_MESSAGE = 'Your AI credits are used up for this month.'
export const AI_ALLOWANCE_UPGRADE_MESSAGE = 'Upgrade your plan or top up AI credits to continue.'
export const AI_ALLOWANCE_ACTION_LABEL = 'Manage AI credits'
export const AI_ALLOWANCE_ACTION_URL = '/athlete/subscription'

export interface AiAllowanceErrorBody {
  error?: string
  code?: string
  remainingSek?: number
  upgradeMessage?: string
  actionLabel?: string
  actionUrl?: string
}

export class AiAllowanceExhaustedError extends Error {
  readonly code = AI_ALLOWANCE_EXHAUSTED_CODE
  readonly remainingSek?: number
  readonly upgradeMessage: string
  readonly actionLabel: string
  readonly actionUrl: string

  constructor(
    message = AI_ALLOWANCE_EXHAUSTED_MESSAGE,
    remainingSek?: number,
    options: {
      upgradeMessage?: string
      actionLabel?: string
      actionUrl?: string
    } = {},
  ) {
    super(message)
    this.name = 'AiAllowanceExhaustedError'
    this.remainingSek = remainingSek
    this.upgradeMessage = options.upgradeMessage ?? AI_ALLOWANCE_UPGRADE_MESSAGE
    this.actionLabel = options.actionLabel ?? AI_ALLOWANCE_ACTION_LABEL
    this.actionUrl = options.actionUrl ?? AI_ALLOWANCE_ACTION_URL
  }
}

export function isAiAllowanceErrorBody(body: unknown): body is AiAllowanceErrorBody {
  return (
    !!body &&
    typeof body === 'object' &&
    (body as { code?: unknown }).code === AI_ALLOWANCE_EXHAUSTED_CODE
  )
}

export function parseAiAllowanceError(body: unknown): AiAllowanceExhaustedError | null {
  if (!isAiAllowanceErrorBody(body)) return null

  const record = body as AiAllowanceErrorBody
  return new AiAllowanceExhaustedError(
    typeof record.error === 'string' ? record.error : undefined,
    typeof record.remainingSek === 'number' ? record.remainingSek : undefined,
    {
      upgradeMessage: typeof record.upgradeMessage === 'string' ? record.upgradeMessage : undefined,
      actionLabel: typeof record.actionLabel === 'string' ? record.actionLabel : undefined,
      actionUrl: typeof record.actionUrl === 'string' ? record.actionUrl : undefined,
    },
  )
}

export function isAiAllowanceExhaustedError(error: unknown): error is AiAllowanceExhaustedError {
  return error instanceof AiAllowanceExhaustedError
}

export function getAiAllowanceUpgradeMessage(error?: AiAllowanceExhaustedError): string {
  return error?.upgradeMessage ?? AI_ALLOWANCE_UPGRADE_MESSAGE
}

export function createAiAllowanceExhaustedBody(remainingSek?: number): AiAllowanceErrorBody {
  return {
    error: AI_ALLOWANCE_EXHAUSTED_MESSAGE,
    code: AI_ALLOWANCE_EXHAUSTED_CODE,
    remainingSek,
    upgradeMessage: AI_ALLOWANCE_UPGRADE_MESSAGE,
    actionLabel: AI_ALLOWANCE_ACTION_LABEL,
    actionUrl: AI_ALLOWANCE_ACTION_URL,
  }
}

// ── Coach AI budget (business-owner-set monthly spending limit) ──────────────

export const COACH_AI_BUDGET_EXHAUSTED_CODE = 'COACH_AI_BUDGET_EXHAUSTED'
export const COACH_AI_BUDGET_EXHAUSTED_MESSAGE =
  'Your AI spending limit for this month has been reached.'
export const COACH_AI_BUDGET_CONTACT_MESSAGE =
  'Contact your business admin to raise your monthly AI limit.'

export function isCoachAiBudgetErrorBody(body: unknown): body is AiAllowanceErrorBody {
  return (
    !!body &&
    typeof body === 'object' &&
    (body as { code?: unknown }).code === COACH_AI_BUDGET_EXHAUSTED_CODE
  )
}

/** Same shape as the allowance body so generic 402 handling renders it. */
export function createCoachAiBudgetExhaustedBody(remainingSek?: number): AiAllowanceErrorBody {
  return {
    error: COACH_AI_BUDGET_EXHAUSTED_MESSAGE,
    code: COACH_AI_BUDGET_EXHAUSTED_CODE,
    remainingSek,
    upgradeMessage: COACH_AI_BUDGET_CONTACT_MESSAGE,
  }
}
