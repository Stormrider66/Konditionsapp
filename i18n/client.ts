/**
 * Client-side i18n utilities
 *
 * Exports hooks and utilities for using translations in client components.
 */

// Re-export from next-intl for convenience
export { useTranslations, useLocale, useMessages } from 'next-intl';

// Re-export our config
export { locales, localeNames, localeFlags, defaultLocale } from './config';
export type { Locale } from './config';
