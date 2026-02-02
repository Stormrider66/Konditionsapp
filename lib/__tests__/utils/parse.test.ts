import { describe, it, expect } from 'vitest'
import {
  safeParseInt,
  parsePagination,
  safeParseFloat,
  safeParseBoolean,
  safeParseDate,
  safeParseEnum,
  safeParseUUID,
} from '@/lib/utils/parse'

describe('Safe Parsing Utilities', () => {
  describe('safeParseInt', () => {
    it('returns default value for null', () => {
      expect(safeParseInt(null, 10)).toBe(10)
    })

    it('returns default value for undefined', () => {
      expect(safeParseInt(undefined, 10)).toBe(10)
    })

    it('returns default value for empty string', () => {
      expect(safeParseInt('', 10)).toBe(10)
    })

    it('returns default value for non-numeric string', () => {
      expect(safeParseInt('abc', 10)).toBe(10)
    })

    it('parses valid integer', () => {
      expect(safeParseInt('42', 10)).toBe(42)
    })

    it('clamps to minimum value', () => {
      expect(safeParseInt('0', 10, 1, 100)).toBe(1)
      expect(safeParseInt('-5', 10, 1, 100)).toBe(1)
    })

    it('clamps to maximum value', () => {
      expect(safeParseInt('500', 10, 1, 100)).toBe(100)
    })

    it('prevents octal interpretation', () => {
      // Without radix, '010' might be interpreted as octal 8
      // With radix 10, it should be 10
      expect(safeParseInt('010', 5)).toBe(10)
    })

    it('handles negative numbers', () => {
      expect(safeParseInt('-10', 5, -50, 50)).toBe(-10)
    })
  })

  describe('parsePagination', () => {
    it('returns defaults for null/undefined params', () => {
      const result = parsePagination(null, null)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
      expect(result.skip).toBe(0)
    })

    it('parses valid pagination params', () => {
      const result = parsePagination('3', '50')
      expect(result.page).toBe(3)
      expect(result.limit).toBe(50)
      expect(result.skip).toBe(100) // (3-1) * 50
    })

    it('respects maxLimit option', () => {
      const result = parsePagination('1', '500', { maxLimit: 100 })
      expect(result.limit).toBe(100)
    })

    it('respects custom defaults', () => {
      const result = parsePagination(null, null, {
        defaultPage: 5,
        defaultLimit: 10,
      })
      expect(result.page).toBe(5)
      expect(result.limit).toBe(10)
      expect(result.skip).toBe(40) // (5-1) * 10
    })

    it('prevents page less than 1', () => {
      const result = parsePagination('0', '20')
      expect(result.page).toBe(1)
    })
  })

  describe('safeParseFloat', () => {
    it('returns default for invalid input', () => {
      expect(safeParseFloat(null, 1.5)).toBe(1.5)
      expect(safeParseFloat('abc', 1.5)).toBe(1.5)
      expect(safeParseFloat('', 1.5)).toBe(1.5)
    })

    it('parses valid floats', () => {
      expect(safeParseFloat('3.14', 0)).toBe(3.14)
      expect(safeParseFloat('42', 0)).toBe(42)
    })

    it('clamps to bounds', () => {
      expect(safeParseFloat('150', 0, 0, 100)).toBe(100)
      expect(safeParseFloat('-10', 0, 0, 100)).toBe(0)
    })

    it('handles Infinity', () => {
      expect(safeParseFloat('Infinity', 1.0)).toBe(1.0)
    })
  })

  describe('safeParseBoolean', () => {
    it('returns default for null/undefined', () => {
      expect(safeParseBoolean(null)).toBe(false)
      expect(safeParseBoolean(undefined)).toBe(false)
      expect(safeParseBoolean(null, true)).toBe(true)
    })

    it('parses truthy values', () => {
      expect(safeParseBoolean('true')).toBe(true)
      expect(safeParseBoolean('TRUE')).toBe(true)
      expect(safeParseBoolean('1')).toBe(true)
      expect(safeParseBoolean('yes')).toBe(true)
      expect(safeParseBoolean('on')).toBe(true)
    })

    it('returns false for other values', () => {
      expect(safeParseBoolean('false')).toBe(false)
      expect(safeParseBoolean('0')).toBe(false)
      expect(safeParseBoolean('no')).toBe(false)
      expect(safeParseBoolean('random')).toBe(false)
    })
  })

  describe('safeParseDate', () => {
    it('returns default for invalid input', () => {
      expect(safeParseDate(null)).toBeNull()
      expect(safeParseDate('')).toBeNull()
      expect(safeParseDate('invalid-date')).toBeNull()
    })

    it('parses valid ISO date', () => {
      const result = safeParseDate('2024-01-15T10:30:00Z')
      expect(result).toBeInstanceOf(Date)
      expect(result?.getFullYear()).toBe(2024)
      expect(result?.getMonth()).toBe(0) // January
    })

    it('returns custom default on failure', () => {
      const defaultDate = new Date('2020-01-01')
      const result = safeParseDate('invalid', defaultDate)
      expect(result).toBe(defaultDate)
    })
  })

  describe('safeParseEnum', () => {
    const allowedValues = ['RUNNING', 'CYCLING', 'SKIING'] as const

    it('returns default for invalid input', () => {
      expect(safeParseEnum(null, allowedValues, 'RUNNING')).toBe('RUNNING')
      expect(safeParseEnum('', allowedValues, 'RUNNING')).toBe('RUNNING')
      expect(safeParseEnum('SWIMMING', allowedValues, 'RUNNING')).toBe('RUNNING')
    })

    it('parses valid enum value', () => {
      expect(safeParseEnum('CYCLING', allowedValues, 'RUNNING')).toBe('CYCLING')
    })

    it('is case-sensitive', () => {
      expect(safeParseEnum('cycling', allowedValues, 'RUNNING')).toBe('RUNNING')
    })
  })

  describe('safeParseUUID', () => {
    it('returns null for invalid input', () => {
      expect(safeParseUUID(null)).toBeNull()
      expect(safeParseUUID('')).toBeNull()
      expect(safeParseUUID('not-a-uuid')).toBeNull()
      expect(safeParseUUID('12345')).toBeNull()
    })

    it('parses valid UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      expect(safeParseUUID(uuid)).toBe(uuid)
    })

    it('normalizes UUID to lowercase', () => {
      const uuid = '550E8400-E29B-41D4-A716-446655440000'
      expect(safeParseUUID(uuid)).toBe(uuid.toLowerCase())
    })

    it('validates UUID format strictly', () => {
      // Too short
      expect(safeParseUUID('550e8400-e29b-41d4-a716')).toBeNull()
      // Wrong format
      expect(safeParseUUID('550e8400e29b41d4a716446655440000')).toBeNull()
    })
  })
})
