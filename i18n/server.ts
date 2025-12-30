/**
 * Server-side i18n utilities
 *
 * Exports utilities for using translations in server components.
 */

// Re-export from next-intl/server for convenience
export { getTranslations, getLocale, getMessages } from 'next-intl/server';

// Re-export our config
export { locales, localeNames, localeFlags, defaultLocale } from './config';
export type { Locale } from './config';
