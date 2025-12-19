'use client';

/**
 * Theme Selector Component
 *
 * Allows athletes to choose themes for app display and PDF exports.
 * Shows visual previews of each theme option.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Palette, FileText, Monitor } from 'lucide-react';
import { useWorkoutTheme } from '@/lib/themes/ThemeProvider';
import { THEMES } from '@/lib/themes/definitions';
import type { ThemeId, WorkoutTheme } from '@/lib/themes/types';
import { AVAILABLE_THEMES } from '@/lib/themes/types';
import { cn } from '@/lib/utils';

interface ThemeSelectorProps {
  className?: string;
}

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const { preferences, setAppTheme, setPdfTheme, isLoading } = useWorkoutTheme();

  const themeOptions = AVAILABLE_THEMES.map((id) => THEMES[id]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Tema-inställningar
        </CardTitle>
        <CardDescription>
          Välj utseende för din träningsvy och PDF-exporter
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* App Theme Selection */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            App-tema
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            Hur dina träningspass visas i appen
          </p>
          <div className="grid grid-cols-2 gap-3">
            {themeOptions.map((theme) => (
              <ThemePreviewCard
                key={`app-${theme.id}`}
                theme={theme}
                isSelected={preferences.appTheme === theme.id}
                onSelect={() => setAppTheme(theme.id)}
                disabled={isLoading}
              />
            ))}
          </div>
        </div>

        {/* PDF Theme Selection */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            PDF-tema
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            Utseende vid export till PDF
          </p>
          <div className="grid grid-cols-2 gap-3">
            {themeOptions.map((theme) => (
              <ThemePreviewCard
                key={`pdf-${theme.id}`}
                theme={theme}
                isSelected={preferences.pdfTheme === theme.id}
                onSelect={() => setPdfTheme(theme.id)}
                disabled={isLoading}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ThemePreviewCardProps {
  theme: WorkoutTheme;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
}

function ThemePreviewCard({ theme, isSelected, onSelect, disabled }: ThemePreviewCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'relative p-3 rounded-lg border-2 transition-all text-left',
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Mini theme preview - simulates a workout card */}
      <div
        className="rounded-md p-2 mb-2 overflow-hidden"
        style={{ backgroundColor: theme.colors.background }}
      >
        {/* Header bar */}
        <div
          className="h-2 rounded mb-1.5"
          style={{ backgroundColor: theme.colors.accent, width: '50%' }}
        />
        {/* Exercise row simulation */}
        <div className="flex items-center gap-1.5 mb-1">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: theme.colors.exerciseNumber }}
          />
          <div
            className="h-2 rounded flex-1"
            style={{ backgroundColor: theme.colors.textSecondary, opacity: 0.5 }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: theme.colors.exerciseNumber }}
          />
          <div
            className="h-2 rounded"
            style={{ backgroundColor: theme.colors.textSecondary, width: '70%', opacity: 0.5 }}
          />
        </div>
      </div>

      {/* Theme name */}
      <span className="text-sm font-medium block">{theme.nameSv}</span>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center">
            <Check className="h-3 w-3" />
          </Badge>
        </div>
      )}
    </button>
  );
}

export default ThemeSelector;
