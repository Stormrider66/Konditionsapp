'use client';

/**
 * Language Switcher Component
 *
 * Allows users to switch between supported languages.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe, Check } from 'lucide-react';
import { locales, localeNames, localeFlags, type Locale, useLocale } from '@/i18n/client';

interface LanguageSwitcherProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export function LanguageSwitcher({
  variant = 'ghost',
  size = 'sm',
  showLabel = true,
}: LanguageSwitcherProps) {
  const router = useRouter();
  const currentLocale = useLocale() as Locale;
  const [isLoading, setIsLoading] = useState(false);

  const handleLocaleChange = async (locale: Locale) => {
    if (locale === currentLocale) return;

    setIsLoading(true);
    try {
      // Set the locale cookie via API
      await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      });

      // Refresh the page to apply the new locale
      router.refresh();
    } catch (error) {
      console.error('Failed to change locale:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isLoading}>
          <Globe className="h-4 w-4" />
          {showLabel && (
            <span className="ml-2">
              {localeFlags[currentLocale]} {localeNames[currentLocale]}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleLocaleChange(locale)}
            className="cursor-pointer"
          >
            <span className="mr-2">{localeFlags[locale]}</span>
            <span className="flex-1">{localeNames[locale]}</span>
            {locale === currentLocale && <Check className="h-4 w-4 ml-2 text-green-500" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
