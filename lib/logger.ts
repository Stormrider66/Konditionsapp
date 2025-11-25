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

/**
 * Serialize an error object for logging
 */
function serializeError(error: unknown): LogEntry['error'] | undefined {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: IS_PRODUCTION ? undefined : error.stack,
    }
  }
  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
    }
  }
  if (error !== null && error !== undefined) {
    return {
      name: 'UnknownError',
      message: String(error),
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
    message,
    timestamp: new Date().toISOString(),
    context,
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
