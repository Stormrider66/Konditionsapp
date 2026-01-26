// lib/utils.ts

import clsx, { type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format pace from various formats to MM:SS min/km
 * Accepts:
 * - "4.5" or "4:30" (already formatted)
 * - Number like 4.5
 * - Speed in km/h (converts to pace)
 */
export function formatPace(input: string | number | null | undefined): string {
  if (!input) return ''

  let paceMinPerKm: number

  if (typeof input === 'string') {
    // If already formatted like "4:30" or "4:30 min/km", extract or return as is
    if (input.includes(':')) {
      // Already formatted, just ensure proper suffix
      const cleaned = input.replace(/\s*(min\/km|\/km)\s*/gi, '').trim()
      return `${cleaned} min/km`
    }

    // Try to parse as number
    const parsed = parseFloat(input)
    if (isNaN(parsed)) return input // Return as-is if can't parse
    paceMinPerKm = parsed
  } else {
    paceMinPerKm = input
  }

  // Convert to MM:SS format
  const minutes = Math.floor(paceMinPerKm)
  const seconds = Math.round((paceMinPerKm - minutes) * 60)

  return `${minutes}:${seconds.toString().padStart(2, '0')} min/km`
}

/**
 * Convert speed (km/h) to pace (min/km)
 */
export function speedToPace(speedKmh: number): number {
  if (speedKmh <= 0) return 0
  return 60 / speedKmh
}

type PlainObject = Record<string, unknown>

function isPlainObject(value: unknown): value is PlainObject {
  if (!value || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * Deep merge for JSON-like data.
 *
 * - Only recurses into plain objects
 * - Arrays are replaced (not merged)
 * - `undefined` in the override is ignored (keeps base)
 */
export function deepMerge<T>(base: T, override: unknown): T {
  if (override === undefined) return base

  // Replace non-objects directly (including null, arrays, dates, etc.)
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override as T
  }

  const result: PlainObject = { ...(base as PlainObject) }

  for (const [key, overrideValue] of Object.entries(override)) {
    if (overrideValue === undefined) continue

    const baseValue = (base as PlainObject)[key]

    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      result[key] = deepMerge(baseValue, overrideValue)
    } else {
      result[key] = overrideValue
    }
  }

  return result as T
}
