/**
 * Locale API
 *
 * POST /api/locale - Set the user's preferred locale
 * GET /api/locale - Get the current locale
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { locales, defaultLocale, type Locale } from '@/i18n/config';
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const COOKIE_NAME = 'NEXT_LOCALE';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: NextRequest) {
  const responseLocale = resolveRequestLocale(request)

  try {
    const body = await request.json();
    const { locale } = body;

    // Validate locale
    if (!locale || !locales.includes(locale as Locale)) {
      return NextResponse.json(
        { error: t(responseLocale, 'Invalid locale', 'Ogiltigt språk'), validLocales: locales },
        { status: 400 }
      );
    }

    // Set the locale cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, locale, {
      maxAge: COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return NextResponse.json({
      success: true,
      locale,
    });
  } catch (error) {
    logError('Failed to set locale:', error);
    return NextResponse.json(
      { error: t(responseLocale, 'Failed to set locale', 'Kunde inte ställa in språk') },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const locale = cookieStore.get(COOKIE_NAME)?.value || defaultLocale;

    return NextResponse.json({
      locale,
      availableLocales: locales,
    });
  } catch (error) {
    logError('Failed to get locale:', error);
    return NextResponse.json(
      { locale: defaultLocale, availableLocales: locales },
      { status: 200 }
    );
  }
}
