/**
 * next-intl Request Configuration
 *
 * Provides locale and messages for server-side rendering.
 */

import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { defaultLocale, locales, type Locale } from './config';

export default getRequestConfig(async () => {
  // Try to get locale from cookie first
  const cookieStore = await cookies();
  let locale = cookieStore.get('NEXT_LOCALE')?.value as Locale | undefined;

  // If no cookie, try Accept-Language header
  if (!locale) {
    const headerStore = await headers();
    const acceptLanguage = headerStore.get('accept-language');
    if (acceptLanguage) {
      // Parse Accept-Language header and find first matching locale
      const preferredLocales = acceptLanguage
        .split(',')
        .map((lang) => lang.split(';')[0].trim().substring(0, 2));

      locale = preferredLocales.find((lang) =>
        locales.includes(lang as Locale)
      ) as Locale | undefined;
    }
  }

  // Fall back to default locale
  if (!locale || !locales.includes(locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
