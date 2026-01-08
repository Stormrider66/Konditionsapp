/**
 * Program Excel Export
 *
 * Generates Excel files from AI-generated training programs.
 * Creates two sheets: Weekly Overview and All Workouts.
 */

import ExcelJS from 'exceljs';
import type { ParsedProgram, ParsedPhase, ParsedWorkout } from '@/lib/ai/program-parser';

// Day names in Swedish
const DAY_NAMES = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export interface ProgramExportData {
  program: ParsedProgram;
  athleteName?: string;
  coachName?: string;
  startDate?: Date;
}

/**
 * Get workout summary for a cell (name + duration)
 */
function getWorkoutSummary(workout: ParsedWorkout | { type: 'REST'; description?: string }): string {
  if (workout.type === 'REST') {
    return 'Vila';
  }
  const name = workout.name || workout.type;
  const duration = workout.duration ? `${workout.duration}min` : '';
  return duration ? `${name}\n${duration}` : name;
}

/**
 * Parse weeks range string (e.g., "1-4" or "5-8")
 */
function parseWeeksRange(weeksStr: string): { start: number; end: number } {
  const match = weeksStr.match(/(\d+)-(\d+)/);
  if (match) {
    return { start: parseInt(match[1]), end: parseInt(match[2]) };
  }
  // Single week
  const singleMatch = weeksStr.match(/(\d+)/);
  if (singleMatch) {
    const week = parseInt(singleMatch[1]);
    return { start: week, end: week };
  }
  return { start: 1, end: 1 };
}

/**
 * Get intensity display name in Swedish
 */
function getIntensityName(intensity?: string): string {
  const names: Record<string, string> = {
    recovery: 'Återhämtning',
    easy: 'Lugn',
    moderate: 'Måttlig',
    threshold: 'Tröskel',
    interval: 'Intervall',
    max: 'Max',
    hard: 'Hård',
    race_pace: 'Tävlingstempo',
  };
  return intensity ? names[intensity] || intensity : '';
}

/**
 * Format segments into a readable string
 */
function formatSegments(workout: ParsedWorkout): string {
  if (!workout.segments || workout.segments.length === 0) return '';

  return workout.segments
    .map((seg) => {
      const parts: string[] = [];
      if (seg.type === 'warmup') parts.push('Uppvärmning');
      else if (seg.type === 'cooldown') parts.push('Nedvarvning');
      else if (seg.type === 'work') parts.push('Arbete');
      else if (seg.type === 'interval') parts.push('Intervall');
      else if (seg.type === 'rest') parts.push('Vila');

      if (seg.duration) parts.push(`${seg.duration}min`);
      if (seg.pace) parts.push(seg.pace);
      if (seg.zone) parts.push(`Z${seg.zone}`);
      if (seg.reps) parts.push(`${seg.reps}x`);

      return parts.join(' ');
    })
    .join(', ');
}

/**
 * Generate Sheet 1: Weekly Overview (Veckoöversikt)
 */
function generateWeeklyOverviewSheet(
  program: ParsedProgram,
  startDate?: Date
): { rows: (string | number)[][]; colWidths: number[] } {
  const data: (string | number)[][] = [];

  // Header row
  data.push(['Vecka', 'Fas', ...DAY_NAMES]);

  // Calculate start date for each week
  const programStartDate = startDate || new Date();

  // Generate rows for each week
  let currentWeek = 1;
  for (const phase of program.phases) {
    const { start, end } = parseWeeksRange(phase.weeks);

    for (let week = start; week <= end; week++) {
      const row: (string | number)[] = [
        `Vecka ${week}`,
        phase.name,
      ];

      // Add workouts for each day
      for (const dayKey of DAY_KEYS) {
        const workout = phase.weeklyTemplate?.[dayKey];
        if (workout) {
          row.push(getWorkoutSummary(workout));
        } else {
          row.push('');
        }
      }

      data.push(row);
      currentWeek++;
    }
  }

  return {
    rows: data,
    colWidths: [10, 15, 18, 18, 18, 18, 18, 18, 18],
  };
}

/**
 * Generate Sheet 2: All Workouts (Alla pass)
 */
function generateWorkoutsListSheet(
  program: ParsedProgram,
  startDate?: Date
): { rows: (string | number)[][]; colWidths: number[] } {
  const data: (string | number)[][] = [];

  // Header row
  data.push([
    'Vecka',
    'Dag',
    'Datum',
    'Pass',
    'Typ',
    'Längd (min)',
    'Intensitet',
    'Beskrivning',
    'Tempo/Zoner',
    'Segment',
  ]);

  const programStartDate = startDate || new Date();

  // Generate rows for each workout
  for (const phase of program.phases) {
    const { start, end } = parseWeeksRange(phase.weeks);

    for (let week = start; week <= end; week++) {
      DAY_KEYS.forEach((dayKey, dayIndex) => {
        const workout = phase.weeklyTemplate?.[dayKey];

        if (workout && workout.type !== 'REST') {
          // Calculate date for this workout
          const workoutDate = new Date(programStartDate);
          workoutDate.setDate(
            workoutDate.getDate() + (week - 1) * 7 + dayIndex
          );
          const dateStr = workoutDate.toLocaleDateString('sv-SE');

          // Build zones/tempo info
          const zonesInfo: string[] = [];
          if ('targetPace' in workout && workout.targetPace) zonesInfo.push(workout.targetPace);
          if ('targetHR' in workout && workout.targetHR) zonesInfo.push(workout.targetHR);
          if ('zone' in workout && workout.zone) zonesInfo.push(`Z${workout.zone}`);
          if ('targetPower' in workout && workout.targetPower) zonesInfo.push(`${workout.targetPower}W`);

          data.push([
            week,
            DAY_NAMES[dayIndex],
            dateStr,
            ('name' in workout && workout.name) || workout.type,
            workout.type,
            ('duration' in workout && workout.duration) || '',
            ('intensity' in workout && getIntensityName(workout.intensity)) || '',
            ('description' in workout && workout.description) || '',
            zonesInfo.join(', '),
            ('segments' in workout && formatSegments(workout as ParsedWorkout)) || '',
          ]);
        }
      });
    }
  }

  return {
    rows: data,
    colWidths: [8, 10, 12, 20, 12, 12, 12, 35, 20, 40],
  };
}

/**
 * Generate program info sheet
 */
function generateInfoSheet(
  program: ParsedProgram,
  athleteName?: string,
  coachName?: string
): { rows: (string | number)[][]; colWidths: number[] } {
  const data: (string | number)[][] = [
    ['TRÄNINGSPROGRAM'],
    [''],
    ['Program', program.name],
    ['Beskrivning', program.description || ''],
    ['Antal veckor', program.totalWeeks],
    ['Metodik', program.methodology || ''],
    ['Pass/vecka', program.weeklySchedule?.sessionsPerWeek || ''],
    [''],
    ['Atlet', athleteName || ''],
    ['Coach', coachName || ''],
    ['Genererad', new Date().toLocaleDateString('sv-SE')],
    [''],
    ['FASER'],
  ];

  // Add phase info
  for (const phase of program.phases) {
    data.push([phase.name, `Vecka ${phase.weeks}`]);
    data.push(['Fokus', phase.focus]);
    if (phase.volumeGuidance) {
      data.push(['Volym', phase.volumeGuidance]);
    }
    if (phase.keyWorkouts && phase.keyWorkouts.length > 0) {
      data.push(['Nyckelpass', phase.keyWorkouts.join(', ')]);
    }
    data.push(['']);
  }

  return {
    rows: data,
    colWidths: [20, 50],
  };
}

/**
 * Generate complete Excel workbook for a program
 */
export async function generateProgramExcel(exportData: ProgramExportData): Promise<Blob> {
  const { program, athleteName, coachName, startDate } = exportData;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Star by Thomson';
  workbook.created = new Date();

  // Add sheets
  const info = generateInfoSheet(program, athleteName, coachName);
  const infoSheet = workbook.addWorksheet('Info');
  infoSheet.addRows(info.rows);
  infoSheet.columns = info.colWidths.map((width) => ({ width }));
  infoSheet.getRow(1).font = { bold: true };
  infoSheet.getColumn(2).alignment = { wrapText: true, vertical: 'top' };

  const weekly = generateWeeklyOverviewSheet(program, startDate);
  const weeklySheet = workbook.addWorksheet('Veckoöversikt');
  weeklySheet.addRows(weekly.rows);
  weeklySheet.columns = weekly.colWidths.map((width) => ({ width }));
  weeklySheet.views = [{ state: 'frozen', ySplit: 1 }];
  weeklySheet.getRow(1).font = { bold: true };
  weeklySheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
  });

  const workouts = generateWorkoutsListSheet(program, startDate);
  const workoutsSheet = workbook.addWorksheet('Alla pass');
  workoutsSheet.addRows(workouts.rows);
  workoutsSheet.columns = workouts.colWidths.map((width) => ({ width }));
  workoutsSheet.views = [{ state: 'frozen', ySplit: 1 }];
  workoutsSheet.getRow(1).font = { bold: true };
  // Description + segments columns tend to be long
  workoutsSheet.getColumn(8).alignment = { wrapText: true, vertical: 'top' };
  workoutsSheet.getColumn(10).alignment = { wrapText: true, vertical: 'top' };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Generate filename for program export
 */
function generateFilename(programName: string, extension: string): string {
  const safeName = programName
    .replace(/[åä]/gi, 'a')
    .replace(/[ö]/gi, 'o')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);

  const date = new Date().toISOString().split('T')[0];
  return `Traningsprogram_${safeName}_${date}.${extension}`;
}

/**
 * Download program as Excel file
 */
export function downloadProgramExcel(
  exportData: ProgramExportData,
  filename?: string
): Promise<void> {
  return (async () => {
    const blob = await generateProgramExcel(exportData);
  const finalFilename = filename || generateFilename(exportData.program.name, 'xlsx');

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  })()
}
