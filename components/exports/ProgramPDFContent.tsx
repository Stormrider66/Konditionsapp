'use client';

/**
 * Program PDF Content Component
 *
 * Renders a professional PDF-ready layout for training programs.
 * Used with html2canvas to capture as PDF.
 */

import type { ParsedProgram, ParsedWorkout } from '@/lib/ai/program-parser';

// Day names in Swedish
const DAY_NAMES = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

interface ProgramPDFContentProps {
  program: ParsedProgram;
  athleteName?: string;
  coachName?: string;
  organization?: string;
  startDate?: Date;
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
  workout: ParsedWorkout | { type: 'REST'; description?: string }
): { name: string; duration: string; intensity: string } {
  if (workout.type === 'REST') {
    return { name: 'Vila', duration: '', intensity: '' };
  }
  return {
    name: workout.name || workout.type,
    duration: workout.duration ? `${workout.duration} min` : '',
    intensity: getIntensityName(workout.intensity),
  };
}

export function ProgramPDFContent({
  program,
  athleteName,
  coachName,
  organization = 'Trainomics',
  startDate,
}: ProgramPDFContentProps) {
  const generatedDate = new Date().toLocaleDateString('sv-SE');
  const programStartDate = startDate
    ? startDate.toLocaleDateString('sv-SE')
    : new Date().toLocaleDateString('sv-SE');

  return (
    <div
      data-program-pdf-content
      data-pdf-content
      className="bg-white p-8 font-sans"
      style={{ width: '1200px', minHeight: '800px' }}
    >
      {/* Header */}
      <div className="border-b-2 border-gray-800 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              TRÄNINGSPROGRAM
            </h1>
            <p className="text-lg text-gray-600">{program.name}</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p className="font-semibold">{organization}</p>
            <p>Genererad: {generatedDate}</p>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
            Programinfo
          </h3>
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium">Längd:</span> {program.totalWeeks} veckor
            </p>
            {program.methodology && (
              <p>
                <span className="font-medium">Metodik:</span> {program.methodology}
              </p>
            )}
            {program.weeklySchedule && (
              <p>
                <span className="font-medium">Pass/vecka:</span>{' '}
                {program.weeklySchedule.sessionsPerWeek}
              </p>
            )}
            <p>
              <span className="font-medium">Startdatum:</span> {programStartDate}
            </p>
          </div>
        </div>

        {athleteName && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
              Atlet
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
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Beskrivning</h2>
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
                    Vecka {phase.weeks} ({weekCount} {weekCount === 1 ? 'vecka' : 'veckor'})
                  </span>
                </div>
              </div>

              {/* Phase Content */}
              <div className="p-4">
                {/* Focus */}
                <div className="mb-4">
                  <span className="text-sm font-medium text-gray-600">Fokus: </span>
                  <span className="text-sm text-gray-800">{phase.focus}</span>
                </div>

                {/* Weekly Template Grid */}
                {phase.weeklyTemplate && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Veckoschema
                    </h4>
                    <div className="grid grid-cols-7 gap-1">
                      {/* Day Headers */}
                      {DAY_NAMES.map((day) => (
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

                        const display = getWorkoutDisplay(workout);
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
                      Nyckelpass
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
                    <span className="text-sm font-medium text-gray-600">Volym: </span>
                    <span className="text-sm text-gray-800">{phase.volumeGuidance}</span>
                  </div>
                )}

                {/* Notes */}
                {phase.notes && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-gray-700">
                    <span className="font-medium">Obs: </span>
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
            Programkommentarer
          </h3>
          <p className="text-sm text-gray-600">{program.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
        <p>Genererat med AI Studio • {organization}</p>
      </div>
    </div>
  );
}
