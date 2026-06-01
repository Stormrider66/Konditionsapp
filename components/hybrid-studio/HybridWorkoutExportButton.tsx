'use client';

/**
 * Hybrid Workout Export Button
 *
 * Dropdown button with export options: Excel, PDF, Print
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { HybridWorkoutWithSections } from '@/types';
import { useWorkoutThemeOptional } from '@/lib/themes/ThemeProvider';
import type { ThemeId } from '@/lib/themes/types';
import { useLocale } from '@/i18n/client';
import { getExerciseDisplayName } from '@/lib/exercises/display-name';

interface HybridWorkoutExportButtonProps {
  workout: HybridWorkoutWithSections;
  athleteName?: string;
  coachName?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  themeId?: ThemeId; // Optionally override the theme from context
}

export function HybridWorkoutExportButton({
  workout,
  athleteName,
  coachName,
  variant = 'outline',
  size = 'sm',
  themeId: propThemeId,
}: HybridWorkoutExportButtonProps) {
  const locale: 'en' | 'sv' = useLocale() === 'sv' ? 'sv' : 'en';
  const t = (sv: string, en: string) => (locale === 'sv' ? sv : en);
  const [isExporting, setIsExporting] = useState(false);

  // Get theme from context if available, otherwise use prop or default
  const themeContext = useWorkoutThemeOptional();
  const pdfThemeId = propThemeId || themeContext?.pdfTheme?.id;

  async function handleExportExcel() {
    setIsExporting(true);
    try {
      // Lazy load the export library
      const { generateHybridWorkoutExcel, downloadBlob, generateFilename } = await import(
        '@/lib/exports/hybrid-workout-export'
      );

      const exportData = {
        name: workout.name,
        description: workout.description,
        format: workout.format,
        timeCap: workout.timeCap,
        totalMinutes: workout.totalMinutes,
        totalRounds: workout.totalRounds,
        repScheme: workout.repScheme,
        scalingLevel: workout.scalingLevel,
        movements: workout.movements.map((m) => ({
          exerciseName: getExerciseDisplayName(m.exercise, locale, ''),
          reps: m.reps,
          calories: m.calories,
          distance: m.distance,
          duration: m.duration,
          weightMale: m.weightMale,
          weightFemale: m.weightFemale,
        })),
        warmupData: workout.warmupData,
        strengthData: workout.strengthData,
        metconData: workout.metconData,
        cooldownData: workout.cooldownData,
        athleteName,
        coachName,
        date: new Date(),
        themeId: pdfThemeId,
        locale,
      };

      const blob = await generateHybridWorkoutExcel(exportData);
      const filename = generateFilename(workout.name, 'xlsx');
      downloadBlob(blob, filename);

      toast.success(t('Excel exporterad!', 'Excel exported'), {
        description: t('Passet har laddats ner som Excel-fil.', 'The workout has been downloaded as an Excel file.'),
      });
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error(t('Export misslyckades', 'Export failed'), {
        description: t('Kunde inte exportera till Excel.', 'Could not export to Excel.'),
      });
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportPDF() {
    setIsExporting(true);
    try {
      // Lazy load the export library
      const { generateHybridWorkoutPDF, downloadBlob, generateFilename } = await import(
        '@/lib/exports/hybrid-workout-export'
      );

      const exportData = {
        name: workout.name,
        description: workout.description,
        format: workout.format,
        timeCap: workout.timeCap,
        totalMinutes: workout.totalMinutes,
        totalRounds: workout.totalRounds,
        repScheme: workout.repScheme,
        scalingLevel: workout.scalingLevel,
        movements: workout.movements.map((m) => ({
          exerciseName: getExerciseDisplayName(m.exercise, locale, ''),
          reps: m.reps,
          calories: m.calories,
          distance: m.distance,
          duration: m.duration,
          weightMale: m.weightMale,
          weightFemale: m.weightFemale,
        })),
        warmupData: workout.warmupData,
        strengthData: workout.strengthData,
        metconData: workout.metconData,
        cooldownData: workout.cooldownData,
        athleteName,
        coachName,
        date: new Date(),
        themeId: pdfThemeId,
        locale,
      };

      const blob = generateHybridWorkoutPDF(exportData);
      const filename = generateFilename(workout.name, 'pdf');
      downloadBlob(blob, filename);

      toast.success(t('PDF exporterad!', 'PDF exported'), {
        description: t('Passet har laddats ner som PDF.', 'The workout has been downloaded as a PDF.'),
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t('Export misslyckades', 'Export failed'), {
        description: t('Kunde inte exportera till PDF.', 'Could not export to PDF.'),
      });
    } finally {
      setIsExporting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-1" />
          )}
          {t('Exportera', 'Export')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportExcel} disabled={isExporting}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
          <FileText className="h-4 w-4 mr-2" />
          PDF (.pdf)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          {t('Skriv ut', 'Print')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
