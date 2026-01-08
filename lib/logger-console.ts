import 'server-only'

import { logger } from '@/lib/logger'

type AnyArgs = unknown[]

function isError(value: unknown): value is Error {
  return value instanceof Error
}

function buildMessageContextError(args: AnyArgs): {
  message: string
  context?: Record<string, unknown>
  error?: unknown
} {
  const [first, ...rest] = args

  // Default
  let message = 'Log'
  let error: unknown | undefined
  let context: Record<string, unknown> | undefined

  if (typeof first === 'string') {
    message = first
    // If last arg is an Error, treat it as the error object
    if (rest.length > 0 && isError(rest[rest.length - 1])) {
      error = rest.pop()
    }
    if (rest.length > 0) {
      context = { args: rest }
    }
    return { message, context, error }
  }

  if (isError(first)) {
    message = first.message || first.name || 'Error'
    error = first
    if (rest.length > 0) context = { args: rest }
    return { message, context, error }
  }

  // Non-string, non-Error first arg
  if (first !== undefined) {
    context = { first }
  }
  if (rest.length > 0) {
    context = { ...(context || {}), args: rest }
  }
  return { message, context, error }
}

export function logDebug(...args: AnyArgs): void {
  const { message, context, error } = buildMessageContextError(args)
  logger.debug(message, error ? { ...(context || {}), error } : context)
}

export function logInfo(...args: AnyArgs): void {
  const { message, context, error } = buildMessageContextError(args)
  logger.info(message, error ? { ...(context || {}), error } : context)
}

export function logWarn(...args: AnyArgs): void {
  const { message, context, error } = buildMessageContextError(args)
  logger.warn(message, context, error)
}

export function logError(...args: AnyArgs): void {
  const { message, context, error } = buildMessageContextError(args)
  logger.error(message, context, error)
}


