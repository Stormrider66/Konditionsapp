/**
 * Program Excel Export
 *
 * Generates Excel files from AI-generated training programs.
 * Creates two sheets: Weekly Overview and All Workouts.
 */

import ExcelJS from 'exceljs';
import type { ParsedProgram, ParsedWorkout } from '@/lib/ai/program-parser';

type AppLocale = 'en' | 'sv';

const COPY = {
  en: {
    dayNames: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    rest: 'Rest',
    intensity: {
      recovery: 'Recovery',
      easy: 'Easy',
      moderate: 'Moderate',
      threshold: 'Threshold',
      interval: 'Interval',
      max: 'Max',
      hard: 'Hard',
      race_pace: 'Race pace',
    },
    segments: {
      warmup: 'Warm-up',
      cooldown: 'Cooldown',
      work: 'Work',
      interval: 'Interval',
      rest: 'Rest',
    },
    weeklyOverviewHeaders: ['Week', 'Phase'],
    week: 'Week',
    workoutsHeaders: [
      'Week',
      'Day',
      'Date',
      'Session',
      'Type',
      'Duration (min)',
      'Intensity',
      'Description',
      'Pace/Zones',
      'Segments',
    ],
    infoTitle: 'TRAINING PROGRAM',
    program: 'Program',
    description: 'Description',
    totalWeeks: 'Total weeks',
    methodology: 'Methodology',
    sessionsPerWeek: 'Sessions/week',
    athlete: 'Athlete',
    coach: 'Coach',
    generated: 'Generated',
    phases: 'PHASES',
    focus: 'Focus',
    volume: 'Volume',
    keyWorkouts: 'Key sessions',
    weeklySheet: 'Weekly overview',
    workoutsSheet: 'All sessions',
    filenamePrefix: 'TrainingProgram',
  },
  sv: {
    dayNames: ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'],
    rest: 'Vila',
    intensity: {
      recovery: 'Återhämtning',
      easy: 'Lugn',
      moderate: 'Måttlig',
      threshold: 'Tröskel',
      interval: 'Intervall',
      max: 'Max',
      hard: 'Hård',
      race_pace: 'Tävlingstempo',
    },
    segments: {
      warmup: 'Uppvärmning',
      cooldown: 'Nedvarvning',
      work: 'Arbete',
      interval: 'Intervall',
      rest: 'Vila',
    },
    weeklyOverviewHeaders: ['Vecka', 'Fas'],
    week: 'Vecka',
    workoutsHeaders: [
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
    ],
    infoTitle: 'TRÄNINGSPROGRAM',
    program: 'Program',
    description: 'Beskrivning',
    totalWeeks: 'Antal veckor',
    methodology: 'Metodik',
    sessionsPerWeek: 'Pass/vecka',
    athlete: 'Atlet',
    coach: 'Coach',
    generated: 'Genererad',
    phases: 'FASER',
    focus: 'Fokus',
    volume: 'Volym',
    keyWorkouts: 'Nyckelpass',
    weeklySheet: 'Veckoöversikt',
    workoutsSheet: 'Alla pass',
    filenamePrefix: 'Traningsprogram',
  },
} as const;

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export interface ProgramExportData {
  program: ParsedProgram;
  athleteName?: string;
  coachName?: string;
  startDate?: Date;
  organization?: string;
  locale?: AppLocale;
}

/**
 * Get workout summary for a cell (name + duration)
 */
function getWorkoutSummary(workout: ParsedWorkout | { type: 'REST'; description?: string }, locale: AppLocale): string {
  if (workout.type === 'REST') {
    return COPY[locale].rest;
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
 * Get localized intensity display name
 */
function getIntensityName(intensity: string | undefined, locale: AppLocale): string {
  return intensity ? COPY[locale].intensity[intensity as keyof typeof COPY.en.intensity] || intensity : '';
}

/**
 * Format segments into a readable string
 */
function formatSegments(workout: ParsedWorkout, locale: AppLocale): string {
  if (!workout.segments || workout.segments.length === 0) return '';
  const labels = COPY[locale].segments;

  return workout.segments
    .map((seg) => {
      const parts: string[] = [];
      if (seg.type in labels) parts.push(labels[seg.type as keyof typeof labels]);

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
  locale: AppLocale
): { rows: (string | number)[][]; colWidths: number[] } {
  const data: (string | number)[][] = [];
  const copy = COPY[locale];

  // Header row
  data.push([...copy.weeklyOverviewHeaders, ...copy.dayNames]);

  // Generate rows for each week
  for (const phase of program.phases) {
    const { start, end } = parseWeeksRange(phase.weeks);

    for (let week = start; week <= end; week++) {
      const row: (string | number)[] = [
        `${copy.week} ${week}`,
        phase.name,
      ];

      // Add workouts for each day
      for (const dayKey of DAY_KEYS) {
        const workout = phase.weeklyTemplate?.[dayKey];
        if (workout) {
          row.push(getWorkoutSummary(workout, locale));
        } else {
          row.push('');
        }
      }

      data.push(row);
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
  locale: AppLocale,
  startDate?: Date
): { rows: (string | number)[][]; colWidths: number[] } {
  const data: (string | number)[][] = [];
  const copy = COPY[locale];

  // Header row
  data.push([...copy.workoutsHeaders]);

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
          const dateStr = workoutDate.toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US');

          // Build zones/tempo info
          const zonesInfo: string[] = [];
          if ('targetPace' in workout && workout.targetPace) zonesInfo.push(workout.targetPace);
          if ('targetHR' in workout && workout.targetHR) zonesInfo.push(workout.targetHR);
          if ('zone' in workout && workout.zone) zonesInfo.push(`Z${workout.zone}`);
          if ('targetPower' in workout && workout.targetPower) zonesInfo.push(`${workout.targetPower}W`);

          data.push([
            week,
            copy.dayNames[dayIndex],
            dateStr,
            ('name' in workout && workout.name) || workout.type,
            workout.type,
            ('duration' in workout && workout.duration) || '',
            ('intensity' in workout && getIntensityName(workout.intensity, locale)) || '',
            ('description' in workout && workout.description) || '',
            zonesInfo.join(', '),
            ('segments' in workout && formatSegments(workout as ParsedWorkout, locale)) || '',
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
  locale: AppLocale,
  athleteName?: string,
  coachName?: string
): { rows: (string | number)[][]; colWidths: number[] } {
  const copy = COPY[locale];
  const data: (string | number)[][] = [
    [copy.infoTitle],
    [''],
    [copy.program, program.name],
    [copy.description, program.description || ''],
    [copy.totalWeeks, program.totalWeeks],
    [copy.methodology, program.methodology || ''],
    [copy.sessionsPerWeek, program.weeklySchedule?.sessionsPerWeek || ''],
    [''],
    [copy.athlete, athleteName || ''],
    [copy.coach, coachName || ''],
    [copy.generated, new Date().toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US')],
    [''],
    [copy.phases],
  ];

  // Add phase info
  for (const phase of program.phases) {
    data.push([phase.name, `${copy.week} ${phase.weeks}`]);
    data.push([copy.focus, phase.focus]);
    if (phase.volumeGuidance) {
      data.push([copy.volume, phase.volumeGuidance]);
    }
    if (phase.keyWorkouts && phase.keyWorkouts.length > 0) {
      data.push([copy.keyWorkouts, phase.keyWorkouts.join(', ')]);
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
  const locale = exportData.locale === 'sv' ? 'sv' : 'en';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = exportData.organization || 'Trainomics';
  workbook.created = new Date();

  // Add sheets
  const info = generateInfoSheet(program, locale, athleteName, coachName);
  const infoSheet = workbook.addWorksheet('Info');
  infoSheet.addRows(info.rows);
  infoSheet.columns = info.colWidths.map((width) => ({ width }));
  infoSheet.getRow(1).font = { bold: true };
  infoSheet.getColumn(2).alignment = { wrapText: true, vertical: 'top' };

  const weekly = generateWeeklyOverviewSheet(program, locale);
  const weeklySheet = workbook.addWorksheet(COPY[locale].weeklySheet);
  weeklySheet.addRows(weekly.rows);
  weeklySheet.columns = weekly.colWidths.map((width) => ({ width }));
  weeklySheet.views = [{ state: 'frozen', ySplit: 1 }];
  weeklySheet.getRow(1).font = { bold: true };
  weeklySheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
  });

  const workouts = generateWorkoutsListSheet(program, locale, startDate);
  const workoutsSheet = workbook.addWorksheet(COPY[locale].workoutsSheet);
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
function generateFilename(programName: string, extension: string, locale: AppLocale): string {
  const safeName = programName
    .replace(/[åä]/gi, 'a')
    .replace(/[ö]/gi, 'o')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);

  const date = new Date().toISOString().split('T')[0];
  return `${COPY[locale].filenamePrefix}_${safeName}_${date}.${extension}`;
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
  const locale = exportData.locale === 'sv' ? 'sv' : 'en';
  const finalFilename = filename || generateFilename(exportData.program.name, 'xlsx', locale);

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
