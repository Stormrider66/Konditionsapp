/**
 * Structured Logger
 *
 * Provides consistent logging across the application with:
 * - Log levels (debug, info, warn, error)
 * - Structured JSON output in production
 * - Pretty console output in development
 * - Context/metadata support
 * - Automatic error serialization
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Minimum log level (can be configured via environment variable)
const MIN_LOG_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

const REDACTED = '[REDACTED]'
const MAX_LOG_STRING = 2000
const MAX_REDACTION_DEPTH = 6

const SENSITIVE_KEY_RE = /^(authorization|cookie|set-cookie|x-api-key|api-?key|password|pass|pwd|secret|token|access_?token|refresh_?token|id_?token|privatekey|service_?role|supabase_?service_?role_?key)$/i
const SENSITIVE_KEY_INCLUDES_RE = /(authorization|cookie|api-?key|password|secret|token|privatekey|service_?role)/i

function truncateString(value: string, maxLen: number = MAX_LOG_STRING): string {
  if (value.length <= maxLen) return value
  return `${value.slice(0, maxLen)}…[truncated ${value.length - maxLen} chars]`
}

function stripUrlQuery(value: string): string {
  try {
    const u = new URL(value)
    // Keep origin + pathname only (queries often contain signatures/tokens)
    return `${u.origin}${u.pathname}`
  } catch {
    return value
  }
}

function redactString(value: string): string {
  let v = value

  // Avoid logging giant blobs / base64 / prompts
  v = truncateString(v)

  // Strip query strings from URLs (e.g., signed URLs)
  if (v.startsWith('http://') || v.startsWith('https://')) {
    v = stripUrlQuery(v)
  }

  // Redact Bearer tokens
  v = v.replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, `Bearer ${REDACTED}`)

  // Redact common secret formats
  v = v.replace(/\b(sk-(?:proj-)?[A-Za-z0-9_-]{10,})\b/g, REDACTED) // OpenAI
  v = v.replace(/\b(sk-ant-[A-Za-z0-9_-]{10,})\b/g, REDACTED) // Anthropic
  v = v.replace(/\b(whsec_[A-Za-z0-9]{10,})\b/g, REDACTED) // Stripe webhook
  v = v.replace(/\b(sk_(?:live|test)_[A-Za-z0-9]{10,})\b/g, REDACTED) // Stripe secret

  // Redact JWT-ish tokens
  v = v.replace(
    /\b([A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g,
    REDACTED
  )

  return v
}

function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase()
  if (SENSITIVE_KEY_RE.test(k)) return true
  // catch "openaiKey", "accessToken", etc.
  if (k.endsWith('token') || k.endsWith('secret') || k.endsWith('key')) return true
  return SENSITIVE_KEY_INCLUDES_RE.test(k)
}

function redactValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value == null) return value
  if (typeof value === 'string') return redactString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (value instanceof Date) return value.toISOString()
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      stack: IS_PRODUCTION ? undefined : redactString(value.stack || ''),
    }
  }

  if (typeof value !== 'object') return String(value)
  if (seen.has(value as object)) return '[Circular]'
  if (depth >= MAX_REDACTION_DEPTH) return '[MaxDepth]'
  seen.add(value as object)

  if (Array.isArray(value)) {
    return value.map((v) => redactValue(v, depth + 1, seen))
  }

  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(k)) {
      out[k] = REDACTED
      continue
    }
    out[k] = redactValue(v, depth + 1, seen)
  }
  return out
}

function redactContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined
  return redactValue(context, 0, new WeakSet()) as LogContext
}

/**
 * Serialize an error object for logging
 */
function serializeError(error: unknown): LogEntry['error'] | undefined {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: redactString(error.message),
      stack: IS_PRODUCTION ? undefined : redactString(error.stack || ''),
    }
  }
  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: redactString(error),
    }
  }
  if (error !== null && error !== undefined) {
    return {
      name: 'UnknownError',
      message: redactString(String(error)),
    }
  }
  return undefined
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
  if (IS_PRODUCTION) {
    // JSON format for production (better for log aggregation)
    return JSON.stringify(entry)
  }

  // Pretty format for development
  const timestamp = new Date(entry.timestamp).toLocaleTimeString()
  const levelColors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m', // green
    warn: '\x1b[33m', // yellow
    error: '\x1b[31m', // red
  }
  const reset = '\x1b[0m'
  const levelStr = `${levelColors[entry.level]}[${entry.level.toUpperCase()}]${reset}`

  let output = `${timestamp} ${levelStr} ${entry.message}`

  if (entry.context && Object.keys(entry.context).length > 0) {
    output += ` ${JSON.stringify(entry.context)}`
  }

  if (entry.error) {
    output += `\n  Error: ${entry.error.name}: ${entry.error.message}`
    if (entry.error.stack) {
      output += `\n  ${entry.error.stack}`
    }
  }

  return output
}

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL]
}

/**
 * Core log function
 */
function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown
): void {
  if (!shouldLog(level)) {
    return
  }

  const entry: LogEntry = {
    level,
    message: redactString(message),
    timestamp: new Date().toISOString(),
    context: redactContext(context),
    error: serializeError(error),
  }

  const formatted = formatLogEntry(entry)

  switch (level) {
    case 'debug':
      console.debug(formatted)
      break
    case 'info':
      console.info(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
      console.error(formatted)
      break
  }
}

/**
 * Logger interface
 */
export const logger = {
  /**
   * Debug level - detailed information for debugging
   * Only shown in development by default
   */
  debug: (message: string, context?: LogContext) => log('debug', message, context),

  /**
   * Info level - general information about application flow
   */
  info: (message: string, context?: LogContext) => log('info', message, context),

  /**
   * Warn level - potential issues that don't prevent operation
   */
  warn: (message: string, context?: LogContext, error?: unknown) =>
    log('warn', message, context, error),

  /**
   * Error level - errors that need attention
   */
  error: (message: string, context?: LogContext, error?: unknown) =>
    log('error', message, context, error),

  /**
   * Create a child logger with preset context
   * Useful for adding request IDs or user context
   */
  child: (baseContext: LogContext) => ({
    debug: (message: string, context?: LogContext) =>
      log('debug', message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) =>
      log('info', message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext, error?: unknown) =>
      log('warn', message, { ...baseContext, ...context }, error),
    error: (message: string, context?: LogContext, error?: unknown) =>
      log('error', message, { ...baseContext, ...context }, error),
  }),
}

export default logger
