export function extractApiErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null

  const record = body as { details?: Array<{ message?: unknown }>; error?: unknown }
  const detailMessage = record.details?.find((detail) => typeof detail.message === 'string')?.message

  if (typeof detailMessage === 'string') return detailMessage
  return typeof record.error === 'string' ? record.error : null
}
