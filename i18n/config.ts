/**
 * Internationalization Configuration
 *
 * Defines supported locales and default locale for the application.
 */

export const locales = ['en', 'sv'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'sv';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  sv: 'Svenska',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇬🇧',
  sv: '🇸🇪',
};
