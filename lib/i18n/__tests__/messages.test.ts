import { describe, it, expect } from 'vitest'
import {
  getMessage,
  getSuccessMessage,
  ERROR_KEYS,
  SUCCESS_KEYS,
  createMessageGetter,
} from '../messages'

describe('i18n Messages', () => {
  describe('getMessage', () => {
    it('should return Swedish message by default', () => {
      const message = getMessage(ERROR_KEYS.UNAUTHORIZED)
      expect(message).toBe('Du måste vara inloggad för att utföra denna åtgärd')
    })

    it('should return English message when specified', () => {
      const message = getMessage(ERROR_KEYS.UNAUTHORIZED, 'en')
      expect(message).toBe('You must be logged in to perform this action')
    })

    it('should return all error keys', () => {
      // Test that all error keys have valid messages
      Object.values(ERROR_KEYS).forEach((key) => {
        const svMessage = getMessage(key, 'sv')
        const enMessage = getMessage(key, 'en')
        expect(svMessage).toBeTruthy()
        expect(enMessage).toBeTruthy()
        expect(svMessage).not.toBe(key) // Should not return the key itself
        expect(enMessage).not.toBe(key)
      })
    })

    it('should handle unknown keys gracefully', () => {
      // @ts-expect-error - Testing invalid key
      const message = getMessage('UNKNOWN_KEY')
      expect(message).toBe('UNKNOWN_KEY')
    })
  })

  describe('getSuccessMessage', () => {
    it('should return Swedish success message by default', () => {
      const message = getSuccessMessage(SUCCESS_KEYS.SAVED)
      expect(message).toBe('Sparad')
    })

    it('should return English success message when specified', () => {
      const message = getSuccessMessage(SUCCESS_KEYS.SAVED, 'en')
      expect(message).toBe('Saved')
    })

    it('should return all success keys', () => {
      Object.values(SUCCESS_KEYS).forEach((key) => {
        const svMessage = getSuccessMessage(key, 'sv')
        const enMessage = getSuccessMessage(key, 'en')
        expect(svMessage).toBeTruthy()
        expect(enMessage).toBeTruthy()
      })
    })
  })

  describe('createMessageGetter', () => {
    it('should create a getter for Swedish', () => {
      const t = createMessageGetter('sv')
      expect(t(ERROR_KEYS.NOT_FOUND)).toBe('Resursen kunde inte hittas')
    })

    it('should create a getter for English', () => {
      const t = createMessageGetter('en')
      expect(t(ERROR_KEYS.NOT_FOUND)).toBe('Resource not found')
    })
  })

  describe('ERROR_KEYS', () => {
    it('should have authentication keys', () => {
      expect(ERROR_KEYS.UNAUTHORIZED).toBeDefined()
      expect(ERROR_KEYS.FORBIDDEN).toBeDefined()
      expect(ERROR_KEYS.SESSION_EXPIRED).toBeDefined()
    })

    it('should have validation keys', () => {
      expect(ERROR_KEYS.VALIDATION_FAILED).toBeDefined()
      expect(ERROR_KEYS.REQUIRED_FIELD).toBeDefined()
      expect(ERROR_KEYS.INVALID_EMAIL).toBeDefined()
    })

    it('should have server error keys', () => {
      expect(ERROR_KEYS.INTERNAL_ERROR).toBeDefined()
      expect(ERROR_KEYS.RATE_LIMIT_EXCEEDED).toBeDefined()
    })
  })
})
