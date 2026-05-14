export const AI_ALLOWANCE_EXHAUSTED_CODE = 'AI_ALLOWANCE_EXHAUSTED'
export const AI_ALLOWANCE_EXHAUSTED_MESSAGE = 'Dina AI-krediter är slut för den här månaden.'
export const AI_ALLOWANCE_UPGRADE_MESSAGE = 'Uppgradera din plan eller fyll på AI-krediter för att fortsätta.'
export const AI_ALLOWANCE_ACTION_LABEL = 'Hantera AI-krediter'
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
