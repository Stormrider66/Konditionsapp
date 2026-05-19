'use client';

/**
 * Program PDF Content Component
 *
 * Renders a professional PDF-ready layout for training programs.
 * Used with html2canvas to capture as PDF.
 */

import type { ParsedProgram, ParsedWorkout } from '@/lib/ai/program-parser';
import { useBusinessBrandingOptional } from '@/lib/contexts/BusinessBrandingContext';
import { useLocale } from '@/i18n/client';

const DAY_NAMES = {
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  sv: ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'],
};
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

interface ProgramPDFContentProps {
  program: ParsedProgram;
  athleteName?: string;
  coachName?: string;
  organization?: string;
  startDate?: Date;
}

function getIntensityName(intensity: string | undefined, locale: 'en' | 'sv'): string {
  const names: Record<'en' | 'sv', Record<string, string>> = {
    en: {
      recovery: 'Recovery',
      easy: 'Easy',
      moderate: 'Moderate',
      threshold: 'Threshold',
      interval: 'Interval',
      max: 'Max',
      hard: 'Hard',
      race_pace: 'Race pace',
    },
    sv: {
      recovery: 'Återhämtning',
      easy: 'Lugn',
      moderate: 'Måttlig',
      threshold: 'Tröskel',
      interval: 'Intervall',
      max: 'Max',
      hard: 'Hård',
      race_pace: 'Tävlingstempo',
    },
  };
  return intensity ? names[locale][intensity] || intensity : '';
}

/**
 * Parse weeks range string
 */
function parseWeeksRange(weeksStr: string): { start: number; end: number } {
  const match = weeksStr.match(/(\d+)-(\d+)/);
  if (match) {
    return { start: parseInt(match[1]), end: parseInt(match[2]) };
  }
  const singleMatch = weeksStr.match(/(\d+)/);
  if (singleMatch) {
    const week = parseInt(singleMatch[1]);
    return { start: week, end: week };
  }
  return { start: 1, end: 1 };
}

/**
 * Get workout display info
 */
function getWorkoutDisplay(
  workout: ParsedWorkout | { type: 'REST'; description?: string },
  locale: 'en' | 'sv'
): { name: string; duration: string; intensity: string } {
  if (workout.type === 'REST') {
    return { name: locale === 'sv' ? 'Vila' : 'Rest', duration: '', intensity: '' };
  }
  return {
    name: workout.name || workout.type,
    duration: workout.duration ? `${workout.duration} min` : '',
    intensity: getIntensityName(workout.intensity, locale),
  };
}

export function ProgramPDFContent({
  program,
  athleteName,
  coachName,
  organization = '',
  startDate,
}: ProgramPDFContentProps) {
  const locale = useLocale();
  const appLocale = locale === 'sv' ? 'sv' : 'en';
  const dateLocale = appLocale === 'sv' ? 'sv-SE' : 'en-US';
  const t = (sv: string, en: string) => appLocale === 'sv' ? sv : en;
  const branding = useBusinessBrandingOptional();
  const generatedDate = new Date().toLocaleDateString(dateLocale);
  const programStartDate = startDate
    ? startDate.toLocaleDateString(dateLocale)
    : new Date().toLocaleDateString(dateLocale);
  const displayOrg = organization || branding?.businessName || '';

  return (
    <div
      data-program-pdf-content
      data-pdf-content
      className="bg-white p-8 font-sans"
      style={{ width: '1200px', minHeight: '800px' }}
    >
      {/* Header */}
      <div
        className="border-b-2 pb-4 mb-6"
        style={branding?.primaryColor
          ? { borderColor: branding.primaryColor }
          : { borderColor: '#1f2937' }}
      >
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {t('TRÄNINGSPROGRAM', 'TRAINING PROGRAM')}
            </h1>
            <p className="text-lg text-gray-600">{program.name}</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            {branding?.logoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={branding.logoUrl} alt={displayOrg} className="h-8 w-auto ml-auto mb-1" />
            )}
            <p className="font-semibold">{displayOrg}</p>
            <p>{t('Genererad', 'Generated')}: {generatedDate}</p>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
            {t('Programinfo', 'Program info')}
          </h3>
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium">{t('Längd', 'Length')}:</span> {program.totalWeeks} {program.totalWeeks === 1 ? t('vecka', 'week') : t('veckor', 'weeks')}
            </p>
            {program.methodology && (
              <p>
                <span className="font-medium">{t('Metodik', 'Methodology')}:</span> {program.methodology}
              </p>
            )}
            {program.weeklySchedule && (
              <p>
                <span className="font-medium">{t('Pass/vecka', 'Sessions/week')}:</span>{' '}
                {program.weeklySchedule.sessionsPerWeek}
              </p>
            )}
            <p>
              <span className="font-medium">{t('Startdatum', 'Start date')}:</span> {programStartDate}
            </p>
          </div>
        </div>

        {athleteName && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
              {t('Atlet', 'Athlete')}
            </h3>
            <p className="text-sm">{athleteName}</p>
          </div>
        )}

        {coachName && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
              Coach
            </h3>
            <p className="text-sm">{coachName}</p>
          </div>
        )}
      </div>

      {/* Description */}
      {program.description && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">{t('Beskrivning', 'Description')}</h2>
          <p className="text-sm text-gray-700">{program.description}</p>
        </div>
      )}

      {/* Phases */}
      <div className="space-y-8">
        {program.phases.map((phase, phaseIndex) => {
          const { start, end } = parseWeeksRange(phase.weeks);
          const weekCount = end - start + 1;

          return (
            <div key={phaseIndex} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Phase Header */}
              <div className="bg-gray-800 text-white px-4 py-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">
                    {phase.name}
                  </h3>
                  <span className="text-sm bg-gray-700 px-3 py-1 rounded">
                    {t('Vecka', 'Week')} {phase.weeks} ({weekCount} {weekCount === 1 ? t('vecka', 'week') : t('veckor', 'weeks')})
                  </span>
                </div>
              </div>

              {/* Phase Content */}
              <div className="p-4">
                {/* Focus */}
                <div className="mb-4">
                  <span className="text-sm font-medium text-gray-600">{t('Fokus', 'Focus')}: </span>
                  <span className="text-sm text-gray-800">{phase.focus}</span>
                </div>

                {/* Weekly Template Grid */}
                {phase.weeklyTemplate && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      {t('Veckoschema', 'Weekly schedule')}
                    </h4>
                    <div className="grid grid-cols-7 gap-1">
                      {/* Day Headers */}
                      {DAY_NAMES[appLocale].map((day) => (
                        <div
                          key={day}
                          className="bg-gray-100 text-center text-xs font-semibold py-1 rounded-t"
                        >
                          {day}
                        </div>
                      ))}

                      {/* Day Cells */}
                      {DAY_KEYS.map((dayKey) => {
                        const workout = phase.weeklyTemplate?.[dayKey];
                        if (!workout) {
                          return (
                            <div
                              key={dayKey}
                              className="border border-gray-200 p-2 min-h-[80px] bg-gray-50"
                            >
                              <span className="text-xs text-gray-400">-</span>
                            </div>
                          );
                        }

                        const display = getWorkoutDisplay(workout, appLocale);
                        const isRest = workout.type === 'REST';

                        return (
                          <div
                            key={dayKey}
                            className={`border p-2 min-h-[80px] ${
                              isRest
                                ? 'bg-gray-100 border-gray-200'
                                : 'bg-blue-50 border-blue-200'
                            }`}
                          >
                            <p
                              className={`text-xs font-medium ${
                                isRest ? 'text-gray-500' : 'text-blue-800'
                              }`}
                            >
                              {display.name}
                            </p>
                            {display.duration && (
                              <p className="text-xs text-gray-600 mt-1">
                                {display.duration}
                              </p>
                            )}
                            {display.intensity && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {display.intensity}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Key Workouts */}
                {phase.keyWorkouts && phase.keyWorkouts.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">
                      {t('Nyckelpass', 'Key workouts')}
                    </h4>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {phase.keyWorkouts.map((workout, i) => (
                        <li key={i}>{workout}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Volume Guidance */}
                {phase.volumeGuidance && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-600">{t('Volym', 'Volume')}: </span>
                    <span className="text-sm text-gray-800">{phase.volumeGuidance}</span>
                  </div>
                )}

                {/* Notes */}
                {phase.notes && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-gray-700">
                    <span className="font-medium">{t('Obs', 'Note')}: </span>
                    {phase.notes}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Program Notes */}
      {program.notes && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            {t('Programkommentarer', 'Program notes')}
          </h3>
          <p className="text-sm text-gray-600">{program.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
        <p>{t('Genererat med AI Studio', 'Generated with AI Studio')} • {organization}</p>
      </div>
    </div>
  );
}
