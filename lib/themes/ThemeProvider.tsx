'use client';

/**
 * Workout Theme Provider
 *
 * React context for managing workout display themes.
 * Supports separate app and PDF theme selections.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { ThemeId, ThemePreferences, WorkoutTheme } from './types';
import { DEFAULT_THEME_PREFERENCES } from './types';
import { THEMES, getTheme } from './definitions';

interface ThemeContextValue {
  /** Current app theme */
  appTheme: WorkoutTheme;
  /** Current PDF theme */
  pdfTheme: WorkoutTheme;
  /** Raw theme preferences */
  preferences: ThemePreferences;
  /** Set the app display theme */
  setAppTheme: (themeId: ThemeId) => Promise<void>;
  /** Set the PDF export theme */
  setPdfTheme: (themeId: ThemeId) => Promise<void>;
  /** Whether a theme update is in progress */
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  /** Client ID for persisting preferences */
  clientId?: string;
  /** Initial preferences (from server) */
  initialPreferences?: ThemePreferences | null;
}

export function WorkoutThemeProvider({
  children,
  clientId,
  initialPreferences,
}: ThemeProviderProps) {
  const [preferences, setPreferences] = useState<ThemePreferences>(
    initialPreferences || DEFAULT_THEME_PREFERENCES
  );
  const [isLoading, setIsLoading] = useState(false);

  // Update preferences when initialPreferences changes (e.g., after hydration)
  useEffect(() => {
    if (initialPreferences) {
      setPreferences(initialPreferences);
    }
  }, [initialPreferences]);

  // Apply visual theme (CSS class) to document
  useEffect(() => {
    const isDark = preferences.appTheme === 'FITAPP_DARK';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [preferences.appTheme]);

  const updateTheme = useCallback(
    async (type: 'appTheme' | 'pdfTheme', themeId: ThemeId) => {
      // Update local state immediately for responsiveness
      const newPreferences = { ...preferences, [type]: themeId };
      setPreferences(newPreferences);

      // Persist to server if we have a clientId
      if (!clientId) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/sport-profile/${clientId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ themePreferences: newPreferences }),
        });

        if (!response.ok) {
          // Revert on failure
          setPreferences(preferences);
          console.error('Failed to save theme preferences');
        }
      } catch (error) {
        // Revert on error
        setPreferences(preferences);
        console.error('Error saving theme preferences:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [clientId, preferences]
  );

  const setAppTheme = useCallback(
    (themeId: ThemeId) => updateTheme('appTheme', themeId),
    [updateTheme]
  );

  const setPdfTheme = useCallback(
    (themeId: ThemeId) => updateTheme('pdfTheme', themeId),
    [updateTheme]
  );

  const value: ThemeContextValue = {
    appTheme: getTheme(preferences.appTheme),
    pdfTheme: getTheme(preferences.pdfTheme),
    preferences,
    setAppTheme,
    setPdfTheme,
    isLoading,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access workout theme context
 * @throws Error if used outside of WorkoutThemeProvider
 */
export function useWorkoutTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useWorkoutTheme must be used within WorkoutThemeProvider');
  }
  return context;
}

/**
 * Hook to access workout theme context (optional)
 * Returns null if used outside of provider (for components that work with/without theming)
 */
export function useWorkoutThemeOptional(): ThemeContextValue | null {
  return useContext(ThemeContext);
}

/**
 * Get theme for non-React contexts (e.g., PDF generation)
 */
export function getThemeById(themeId: ThemeId | undefined | null): WorkoutTheme {
  return getTheme(themeId);
}

// Re-export types for convenience
export type { ThemeId, ThemePreferences, WorkoutTheme };
export { THEMES, DEFAULT_THEME_PREFERENCES };
