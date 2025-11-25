/**
 * Internationalized Error Messages
 *
 * Provides consistent error messages in Swedish and English.
 * Default language is Swedish (sv) as this is a Swedish application.
 */

export type Language = 'sv' | 'en'

// Default language
export const DEFAULT_LANGUAGE: Language = 'sv'

/**
 * Error message keys
 */
export const ERROR_KEYS = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',

  // Business logic
  SUBSCRIPTION_LIMIT_REACHED: 'SUBSCRIPTION_LIMIT_REACHED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',

  // File/Upload errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',

  // Email errors
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
} as const

export type ErrorKey = (typeof ERROR_KEYS)[keyof typeof ERROR_KEYS]

/**
 * Error messages in Swedish and English
 */
const MESSAGES: Record<ErrorKey, Record<Language, string>> = {
  // Authentication
  UNAUTHORIZED: {
    sv: 'Du måste vara inloggad för att utföra denna åtgärd',
    en: 'You must be logged in to perform this action',
  },
  FORBIDDEN: {
    sv: 'Du har inte behörighet att utföra denna åtgärd',
    en: 'You do not have permission to perform this action',
  },
  SESSION_EXPIRED: {
    sv: 'Din session har gått ut. Vänligen logga in igen',
    en: 'Your session has expired. Please log in again',
  },
  INVALID_CREDENTIALS: {
    sv: 'Felaktigt användarnamn eller lösenord',
    en: 'Invalid username or password',
  },

  // Validation
  VALIDATION_FAILED: {
    sv: 'Valideringen misslyckades. Kontrollera dina uppgifter',
    en: 'Validation failed. Please check your input',
  },
  REQUIRED_FIELD: {
    sv: 'Detta fält är obligatoriskt',
    en: 'This field is required',
  },
  INVALID_EMAIL: {
    sv: 'Ogiltig e-postadress',
    en: 'Invalid email address',
  },
  INVALID_FORMAT: {
    sv: 'Ogiltigt format',
    en: 'Invalid format',
  },

  // Resource errors
  NOT_FOUND: {
    sv: 'Resursen kunde inte hittas',
    en: 'Resource not found',
  },
  ALREADY_EXISTS: {
    sv: 'Resursen finns redan',
    en: 'Resource already exists',
  },
  CONFLICT: {
    sv: 'Konflikt med befintlig data',
    en: 'Conflict with existing data',
  },

  // Rate limiting
  RATE_LIMIT_EXCEEDED: {
    sv: 'För många förfrågningar. Vänligen försök igen senare',
    en: 'Too many requests. Please try again later',
  },

  // Server errors
  INTERNAL_ERROR: {
    sv: 'Ett oväntat fel uppstod. Vänligen försök igen',
    en: 'An unexpected error occurred. Please try again',
  },
  SERVICE_UNAVAILABLE: {
    sv: 'Tjänsten är tillfälligt otillgänglig. Vänligen försök igen senare',
    en: 'Service temporarily unavailable. Please try again later',
  },
  DATABASE_ERROR: {
    sv: 'Databasfel. Vänligen försök igen',
    en: 'Database error. Please try again',
  },

  // Business logic
  SUBSCRIPTION_LIMIT_REACHED: {
    sv: 'Du har nått gränsen för ditt abonnemang. Uppgradera för att fortsätta',
    en: 'You have reached your subscription limit. Upgrade to continue',
  },
  INSUFFICIENT_PERMISSIONS: {
    sv: 'Du har inte tillräckliga behörigheter för denna åtgärd',
    en: 'You do not have sufficient permissions for this action',
  },
  OPERATION_NOT_ALLOWED: {
    sv: 'Denna åtgärd är inte tillåten',
    en: 'This operation is not allowed',
  },

  // File/Upload errors
  FILE_TOO_LARGE: {
    sv: 'Filen är för stor',
    en: 'File is too large',
  },
  INVALID_FILE_TYPE: {
    sv: 'Ogiltig filtyp',
    en: 'Invalid file type',
  },

  // Email errors
  EMAIL_SEND_FAILED: {
    sv: 'Kunde inte skicka e-post. Vänligen försök igen',
    en: 'Failed to send email. Please try again',
  },
}

/**
 * Get an error message by key
 *
 * @param key - Error message key
 * @param lang - Language code (defaults to Swedish)
 * @param params - Optional parameters to interpolate into the message
 */
export function getMessage(
  key: ErrorKey,
  lang: Language = DEFAULT_LANGUAGE,
  params?: Record<string, string | number>
): string {
  let message = MESSAGES[key]?.[lang] || MESSAGES[key]?.sv || key

  // Interpolate parameters
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      message = message.replace(new RegExp(`{${paramKey}}`, 'g'), String(value))
    })
  }

  return message
}

/**
 * Create a message getter for a specific language
 */
export function createMessageGetter(lang: Language) {
  return (key: ErrorKey, params?: Record<string, string | number>) =>
    getMessage(key, lang, params)
}

/**
 * Success messages
 */
export const SUCCESS_KEYS = {
  SAVED: 'SAVED',
  DELETED: 'DELETED',
  UPDATED: 'UPDATED',
  EMAIL_SENT: 'EMAIL_SENT',
  LOGGED_IN: 'LOGGED_IN',
  LOGGED_OUT: 'LOGGED_OUT',
} as const

export type SuccessKey = (typeof SUCCESS_KEYS)[keyof typeof SUCCESS_KEYS]

const SUCCESS_MESSAGES: Record<SuccessKey, Record<Language, string>> = {
  SAVED: {
    sv: 'Sparad',
    en: 'Saved',
  },
  DELETED: {
    sv: 'Borttagen',
    en: 'Deleted',
  },
  UPDATED: {
    sv: 'Uppdaterad',
    en: 'Updated',
  },
  EMAIL_SENT: {
    sv: 'E-post skickad',
    en: 'Email sent',
  },
  LOGGED_IN: {
    sv: 'Inloggad',
    en: 'Logged in',
  },
  LOGGED_OUT: {
    sv: 'Utloggad',
    en: 'Logged out',
  },
}

/**
 * Get a success message by key
 */
export function getSuccessMessage(
  key: SuccessKey,
  lang: Language = DEFAULT_LANGUAGE
): string {
  return SUCCESS_MESSAGES[key]?.[lang] || SUCCESS_MESSAGES[key]?.sv || key
}

const messages = { getMessage, getSuccessMessage, ERROR_KEYS, SUCCESS_KEYS }
export default messages
