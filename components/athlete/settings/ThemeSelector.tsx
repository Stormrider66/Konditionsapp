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

import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'

interface ThemeSelectorProps {
  className?: string;
  variant?: 'default' | 'glass';
}

export function ThemeSelector({ className, variant = 'default' }: ThemeSelectorProps) {
  const { preferences, setAppTheme, setPdfTheme, isLoading } = useWorkoutTheme();
  const isGlass = variant === 'glass';
  const themeOptions = AVAILABLE_THEMES.map((id) => THEMES[id]);

  const CardWrapper = isGlass ? GlassCard : Card;

  return (
    <CardWrapper className={className}>
      <CardHeader>
        <CardTitle className={cn("flex items-center gap-2", isGlass ? "text-white font-black uppercase italic tracking-tight" : "")}>
          <Palette className={cn("h-5 w-5", isGlass ? "text-orange-500" : "")} />
          Tema-inställningar
        </CardTitle>
        <CardDescription className={cn(isGlass ? "text-slate-500 font-medium" : "")}>
          Välj utseende för din träningsvy och PDF-exporter
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* App Theme Selection */}
        <div>
          <h4 className={cn("text-sm font-black uppercase tracking-widest mb-3 flex items-center gap-2", isGlass ? "text-slate-400" : "")}>
            <Monitor className="h-4 w-4" />
            App-tema
          </h4>
          <p className={cn("text-xs mb-4", isGlass ? "text-slate-500" : "text-muted-foreground")}>
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
                isGlass={isGlass}
              />
            ))}
          </div>
        </div>

        {/* PDF Theme Selection */}
        <div className={cn("pt-6 border-t", isGlass ? "border-white/5" : "")}>
          <h4 className={cn("text-sm font-black uppercase tracking-widest mb-3 flex items-center gap-2", isGlass ? "text-slate-400" : "")}>
            <FileText className="h-4 w-4" />
            PDF-tema
          </h4>
          <p className={cn("text-xs mb-4", isGlass ? "text-slate-500" : "text-muted-foreground")}>
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
                isGlass={isGlass}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </CardWrapper>
  );
}

interface ThemePreviewCardProps {
  theme: WorkoutTheme;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
  isGlass?: boolean;
}

function ThemePreviewCard({ theme, isSelected, onSelect, disabled, isGlass }: ThemePreviewCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'relative p-3 rounded-xl border transition-all text-left group',
        isSelected
          ? (isGlass ? 'border-orange-500/50 bg-orange-500/10' : 'border-primary ring-2 ring-primary/20')
          : (isGlass ? 'border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10' : 'border-border hover:border-primary/50'),
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Mini theme preview - simulates a workout card */}
      <div
        className={cn(
          "rounded-lg p-2 mb-2 overflow-hidden border",
          isGlass ? "border-black/50" : "border-gray-200"
        )}
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
      <span className={cn(
        "text-xs font-black uppercase tracking-tight block",
        isSelected ? (isGlass ? "text-orange-400" : "text-primary") : (isGlass ? "text-slate-400" : "text-slate-900")
      )}>
        {theme.nameSv}
      </span>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className={cn(
            "h-5 w-5 rounded-full flex items-center justify-center",
            isGlass ? "bg-orange-500 text-white" : "bg-primary text-white"
          )}>
            <Check className="h-3 w-3 stroke-[3]" />
          </div>
        </div>
      )}
    </button>
  );
}

export default ThemeSelector;
