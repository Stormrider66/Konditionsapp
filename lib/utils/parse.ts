/**
 * Safe Parsing Utilities
 *
 * Provides safe parsing functions with proper radix handling,
 * validation, and default values to prevent common security issues.
 */

/**
 * Safely parse an integer from a string with bounds checking
 *
 * @param value - The string value to parse (may be null/undefined)
 * @param defaultValue - Default value if parsing fails
 * @param min - Minimum allowed value (defaults to 1)
 * @param max - Maximum allowed value (defaults to 1000)
 * @returns A valid integer within the specified bounds
 */
export function safeParseInt(
  value: string | null | undefined,
  defaultValue: number,
  min = 1,
  max = 1000
): number {
  if (value === null || value === undefined || value === '') {
    return defaultValue
  }

  // Always use radix 10 to prevent octal interpretation
  const parsed = parseInt(value, 10)

  if (isNaN(parsed)) {
    return defaultValue
  }

  // Clamp to bounds
  return Math.min(max, Math.max(min, parsed))
}

/**
 * Safely parse pagination parameters
 *
 * @param pageParam - The page parameter from query string
 * @param limitParam - The limit parameter from query string
 * @param options - Configuration options
 * @returns Validated page and limit values
 */
export function parsePagination(
  pageParam: string | null | undefined,
  limitParam: string | null | undefined,
  options?: {
    defaultPage?: number
    defaultLimit?: number
    maxLimit?: number
    minLimit?: number
  }
): { page: number; limit: number; skip: number } {
  const defaultPage = options?.defaultPage ?? 1
  const defaultLimit = options?.defaultLimit ?? 20
  const maxLimit = options?.maxLimit ?? 100
  const minLimit = options?.minLimit ?? 1

  const page = safeParseInt(pageParam, defaultPage, 1, 10000)
  const limit = safeParseInt(limitParam, defaultLimit, minLimit, maxLimit)
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

/**
 * Safely parse a float from a string with bounds checking
 *
 * @param value - The string value to parse (may be null/undefined)
 * @param defaultValue - Default value if parsing fails
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns A valid float within the specified bounds
 */
export function safeParseFloat(
  value: string | null | undefined,
  defaultValue: number,
  min = 0,
  max = Number.MAX_SAFE_INTEGER
): number {
  if (value === null || value === undefined || value === '') {
    return defaultValue
  }

  const parsed = parseFloat(value)

  if (isNaN(parsed) || !isFinite(parsed)) {
    return defaultValue
  }

  // Clamp to bounds
  return Math.min(max, Math.max(min, parsed))
}

/**
 * Safely parse a boolean from a string
 * Accepts: 'true', '1', 'yes', 'on' as true
 * Everything else (including null/undefined) returns default
 *
 * @param value - The string value to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Boolean value
 */
export function safeParseBoolean(
  value: string | null | undefined,
  defaultValue = false
): boolean {
  if (value === null || value === undefined) {
    return defaultValue
  }

  const lower = value.toLowerCase().trim()
  return ['true', '1', 'yes', 'on'].includes(lower)
}

/**
 * Safely parse a date from a string
 *
 * @param value - The string value to parse (ISO 8601 format expected)
 * @param defaultValue - Default value if parsing fails
 * @returns Valid Date object or default
 */
export function safeParseDate(
  value: string | null | undefined,
  defaultValue: Date | null = null
): Date | null {
  if (value === null || value === undefined || value === '') {
    return defaultValue
  }

  const parsed = new Date(value)

  if (isNaN(parsed.getTime())) {
    return defaultValue
  }

  return parsed
}

/**
 * Safely parse an enum value from a string
 *
 * @param value - The string value to parse
 * @param allowedValues - Array of allowed enum values
 * @param defaultValue - Default value if parsing fails
 * @returns Valid enum value or default
 */
export function safeParseEnum<T extends string>(
  value: string | null | undefined,
  allowedValues: readonly T[],
  defaultValue: T
): T {
  if (value === null || value === undefined || value === '') {
    return defaultValue
  }

  if (allowedValues.includes(value as T)) {
    return value as T
  }

  return defaultValue
}

/**
 * Safely parse a UUID from a string
 *
 * @param value - The string value to parse
 * @returns Valid UUID string or null
 */
export function safeParseUUID(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  // UUID v4 regex pattern
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (uuidRegex.test(value)) {
    return value.toLowerCase()
  }

  return null
}
