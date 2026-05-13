export const AI_ALLOWANCE_EXHAUSTED_CODE = 'AI_ALLOWANCE_EXHAUSTED'

export interface AiAllowanceErrorBody {
  error?: string
  code?: string
  remainingSek?: number
}

export class AiAllowanceExhaustedError extends Error {
  readonly code = AI_ALLOWANCE_EXHAUSTED_CODE
  readonly remainingSek?: number

  constructor(message = 'Dina AI-krediter är slut för den här månaden.', remainingSek?: number) {
    super(message)
    this.name = 'AiAllowanceExhaustedError'
    this.remainingSek = remainingSek
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
  )
}

export function isAiAllowanceExhaustedError(error: unknown): error is AiAllowanceExhaustedError {
  return error instanceof AiAllowanceExhaustedError
}

export function getAiAllowanceUpgradeMessage(): string {
  return 'Uppgradera din plan eller fyll på AI-krediter för att fortsätta.'
}
