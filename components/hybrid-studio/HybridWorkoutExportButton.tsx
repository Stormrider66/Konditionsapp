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

interface HybridWorkoutExportButtonProps {
  workout: HybridWorkoutWithSections;
  athleteName?: string;
  coachName?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function HybridWorkoutExportButton({
  workout,
  athleteName,
  coachName,
  variant = 'outline',
  size = 'sm',
}: HybridWorkoutExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

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
          exerciseName: m.exercise.nameSv || m.exercise.name,
          reps: m.reps,
          calories: m.calories,
          distance: m.distance,
          duration: m.duration,
          weightMale: m.weightMale,
          weightFemale: m.weightFemale,
        })),
        warmupData: workout.warmupData,
        strengthData: workout.strengthData,
        cooldownData: workout.cooldownData,
        athleteName,
        coachName,
        date: new Date(),
      };

      const blob = generateHybridWorkoutExcel(exportData);
      const filename = generateFilename(workout.name, 'xlsx');
      downloadBlob(blob, filename);

      toast.success('Excel exporterad!', {
        description: 'Passet har laddats ner som Excel-fil.',
      });
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Export misslyckades', {
        description: 'Kunde inte exportera till Excel.',
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
          exerciseName: m.exercise.nameSv || m.exercise.name,
          reps: m.reps,
          calories: m.calories,
          distance: m.distance,
          duration: m.duration,
          weightMale: m.weightMale,
          weightFemale: m.weightFemale,
        })),
        warmupData: workout.warmupData,
        strengthData: workout.strengthData,
        cooldownData: workout.cooldownData,
        athleteName,
        coachName,
        date: new Date(),
      };

      const blob = generateHybridWorkoutPDF(exportData);
      const filename = generateFilename(workout.name, 'pdf');
      downloadBlob(blob, filename);

      toast.success('PDF exporterad!', {
        description: 'Passet har laddats ner som PDF.',
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Export misslyckades', {
        description: 'Kunde inte exportera till PDF.',
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
          Exportera
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
          Skriv ut
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
