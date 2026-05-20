/**
 * Server-side training program PDF
 *
 * Renders a training program as a PDF using @react-pdf/renderer, which
 * runs in Node without needing a headless browser. Mirrors the layout
 * of components/exports/ProgramPDFContent.tsx (header, info grid,
 * phases with weekly template, notes, footer) but uses react-pdf
 * primitives so it works server-side.
 *
 * Consumed by app/api/exports/program-pdf/route.ts as a fallback for
 * coaches whose browsers time out generating large programs via
 * html2canvas.
 */

import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer'
import type { ParsedProgram, ParsedWorkout } from '@/lib/ai/program-parser'

type AppLocale = 'en' | 'sv'

const DAY_NAMES: Record<AppLocale, string[]> = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  sv: ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'],
}
const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

const INTENSITY_LABELS: Record<AppLocale, Record<string, string>> = {
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
}

const COPY: Record<AppLocale, {
  title: string;
  titlePrefix: string;
  subject: string;
  generated: string;
  programInfo: string;
  length: string;
  weekSingular: string;
  weekPlural: string;
  methodology: string;
  sessionsPerWeek: string;
  startDate: string;
  athlete: string;
  coach: string;
  description: string;
  week: string;
  focus: string;
  weeklySchedule: string;
  keyWorkouts: string;
  volume: string;
  note: string;
  programNotes: string;
  footerPrefix: string;
  rest: string;
}> = {
  en: {
    title: 'TRAINING PROGRAM',
    titlePrefix: 'Training program',
    subject: 'AI-generated training program',
    generated: 'Generated',
    programInfo: 'Program info',
    length: 'Length',
    weekSingular: 'week',
    weekPlural: 'weeks',
    methodology: 'Methodology',
    sessionsPerWeek: 'Sessions/week',
    startDate: 'Start date',
    athlete: 'Athlete',
    coach: 'Coach',
    description: 'Description',
    week: 'Week',
    focus: 'Focus',
    weeklySchedule: 'Weekly schedule',
    keyWorkouts: 'Key sessions',
    volume: 'Volume',
    note: 'Note',
    programNotes: 'Program notes',
    footerPrefix: 'Generated with AI Studio',
    rest: 'Rest',
  },
  sv: {
    title: 'TRÄNINGSPROGRAM',
    titlePrefix: 'Träningsprogram',
    subject: 'AI-genererat träningsprogram',
    generated: 'Genererad',
    programInfo: 'Programinfo',
    length: 'Längd',
    weekSingular: 'vecka',
    weekPlural: 'veckor',
    methodology: 'Metodik',
    sessionsPerWeek: 'Pass/vecka',
    startDate: 'Startdatum',
    athlete: 'Atlet',
    coach: 'Coach',
    description: 'Beskrivning',
    week: 'Vecka',
    focus: 'Fokus',
    weeklySchedule: 'Veckoschema',
    keyWorkouts: 'Nyckelpass',
    volume: 'Volym',
    note: 'Obs',
    programNotes: 'Programkommentarer',
    footerPrefix: 'Genererat med AI Studio',
    rest: 'Vila',
  },
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1f2937',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#1f2937',
    paddingBottom: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  programName: {
    fontSize: 12,
    color: '#4b5563',
  },
  headerMeta: {
    fontSize: 9,
    color: '#4b5563',
    textAlign: 'right',
  },
  headerMetaBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    textAlign: 'right',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 4,
  },
  infoCardTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 9,
    marginBottom: 2,
  },
  infoLabel: {
    fontFamily: 'Helvetica-Bold',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    marginBottom: 6,
  },
  description: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 20,
  },
  phase: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 14,
    overflow: 'hidden',
  },
  phaseHeader: {
    backgroundColor: '#1f2937',
    color: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phaseTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  phaseWeeks: {
    fontSize: 8,
    color: '#e5e7eb',
  },
  phaseBody: {
    padding: 10,
  },
  phaseFocus: {
    fontSize: 9,
    marginBottom: 8,
  },
  weekGrid: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 8,
  },
  weekDayHeader: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 3,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    color: '#4b5563',
  },
  weekDayCell: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    padding: 3,
    minHeight: 52,
  },
  weekDayCellRest: {
    backgroundColor: '#f3f4f6',
  },
  weekDayCellWork: {
    backgroundColor: '#eff6ff',
  },
  weekDayName: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a8a',
    marginBottom: 1,
  },
  weekDayNameRest: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    marginBottom: 1,
  },
  weekDayDetail: {
    fontSize: 6,
    color: '#6b7280',
  },
  keyWorkoutList: {
    marginBottom: 6,
  },
  keyWorkoutItem: {
    fontSize: 9,
    color: '#4b5563',
    marginLeft: 10,
    marginBottom: 2,
  },
  notesBlock: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 3,
    padding: 6,
    marginTop: 4,
  },
  notesText: {
    fontSize: 9,
    color: '#78350f',
  },
  programNotes: {
    marginTop: 16,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
  },
})

function parseWeeksRange(weeksStr: string): { start: number; end: number } {
  const match = weeksStr.match(/(\d+)-(\d+)/)
  if (match) {
    return { start: parseInt(match[1]), end: parseInt(match[2]) }
  }
  const singleMatch = weeksStr.match(/(\d+)/)
  if (singleMatch) {
    const week = parseInt(singleMatch[1])
    return { start: week, end: week }
  }
  return { start: 1, end: 1 }
}

type DayWorkout =
  | ParsedWorkout
  | { type: 'REST'; description?: string }

function getWorkoutDisplay(workout: DayWorkout, locale: AppLocale): {
  name: string
  duration: string
  intensity: string
} {
  if (workout.type === 'REST') {
    return { name: COPY[locale].rest, duration: '', intensity: '' }
  }
  return {
    name: workout.name || workout.type,
    duration: workout.duration ? `${workout.duration} min` : '',
    intensity: workout.intensity
      ? INTENSITY_LABELS[locale][workout.intensity] ?? workout.intensity
      : '',
  }
}

export interface ProgramPDFDocumentProps {
  program: ParsedProgram
  athleteName?: string
  coachName?: string
  organization?: string
  startDate?: Date
  locale?: 'en' | 'sv'
}

export function ProgramPDFDocument({
  program,
  athleteName,
  coachName,
  organization = '',
  startDate,
  locale = 'en',
}: ProgramPDFDocumentProps) {
  const appLocale: AppLocale = locale === 'sv' ? 'sv' : 'en'
  const dateLocale = appLocale === 'sv' ? 'sv-SE' : 'en-US'
  const copy = COPY[appLocale]
  const generatedDate = new Date().toLocaleDateString(dateLocale)
  const programStartDate = (startDate ?? new Date()).toLocaleDateString(dateLocale)

  return (
    <Document
      title={`${copy.titlePrefix} - ${program.name}`}
      author={coachName || organization || 'AI Studio'}
      subject={copy.subject}
      creator={organization || 'AI Studio'}
    >
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.programName}>{program.name}</Text>
          </View>
          <View>
            {organization ? (
              <Text style={styles.headerMetaBold}>{organization}</Text>
            ) : null}
            <Text style={styles.headerMeta}>{copy.generated}: {generatedDate}</Text>
          </View>
        </View>

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>{copy.programInfo}</Text>
            <Text style={styles.infoCardText}>
              <Text style={styles.infoLabel}>{copy.length}: </Text>
              {program.totalWeeks} {program.totalWeeks === 1 ? copy.weekSingular : copy.weekPlural}
            </Text>
            {program.methodology ? (
              <Text style={styles.infoCardText}>
                <Text style={styles.infoLabel}>{copy.methodology}: </Text>
                {program.methodology}
              </Text>
            ) : null}
            {program.weeklySchedule ? (
              <Text style={styles.infoCardText}>
                <Text style={styles.infoLabel}>{copy.sessionsPerWeek}: </Text>
                {program.weeklySchedule.sessionsPerWeek}
              </Text>
            ) : null}
            <Text style={styles.infoCardText}>
              <Text style={styles.infoLabel}>{copy.startDate}: </Text>
              {programStartDate}
            </Text>
          </View>

          {athleteName ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>{copy.athlete}</Text>
              <Text style={styles.infoCardText}>{athleteName}</Text>
            </View>
          ) : null}

          {coachName ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>{copy.coach}</Text>
              <Text style={styles.infoCardText}>{coachName}</Text>
            </View>
          ) : null}
        </View>

        {/* Description */}
        {program.description ? (
          <View>
            <Text style={styles.sectionTitle}>{copy.description}</Text>
            <Text style={styles.description}>{program.description}</Text>
          </View>
        ) : null}

        {/* Phases */}
        {program.phases.map((phase, phaseIndex) => {
          const { start, end } = parseWeeksRange(phase.weeks)
          const weekCount = end - start + 1

          return (
            <View key={phaseIndex} style={styles.phase} wrap={false}>
              <View style={styles.phaseHeader}>
                <Text style={styles.phaseTitle}>{phase.name}</Text>
                <Text style={styles.phaseWeeks}>
                  {copy.week} {phase.weeks} ({weekCount}{' '}
                  {weekCount === 1 ? copy.weekSingular : copy.weekPlural})
                </Text>
              </View>

              <View style={styles.phaseBody}>
                <Text style={styles.phaseFocus}>
                  <Text style={styles.infoLabel}>{copy.focus}: </Text>
                  {phase.focus}
                </Text>

                {/* Weekly template */}
                {phase.weeklyTemplate ? (
                  <>
                    <Text style={styles.sectionTitle}>{copy.weeklySchedule}</Text>
                    <View style={styles.weekGrid}>
                      {DAY_NAMES[appLocale].map((day) => (
                        <Text key={day} style={styles.weekDayHeader}>
                          {day}
                        </Text>
                      ))}
                    </View>
                    <View style={styles.weekGrid}>
                      {DAY_KEYS.map((dayKey) => {
                        const workout = phase.weeklyTemplate?.[dayKey]
                        if (!workout) {
                          return (
                            <View
                              key={dayKey}
                              style={[
                                styles.weekDayCell,
                                styles.weekDayCellRest,
                              ]}
                            >
                              <Text style={styles.weekDayNameRest}>-</Text>
                            </View>
                          )
                        }

                        const display = getWorkoutDisplay(workout, appLocale)
                        const isRest = workout.type === 'REST'

                        return (
                          <View
                            key={dayKey}
                            style={[
                              styles.weekDayCell,
                              isRest
                                ? styles.weekDayCellRest
                                : styles.weekDayCellWork,
                            ]}
                          >
                            <Text
                              style={
                                isRest
                                  ? styles.weekDayNameRest
                                  : styles.weekDayName
                              }
                            >
                              {display.name}
                            </Text>
                            {display.duration ? (
                              <Text style={styles.weekDayDetail}>
                                {display.duration}
                              </Text>
                            ) : null}
                            {display.intensity ? (
                              <Text style={styles.weekDayDetail}>
                                {display.intensity}
                              </Text>
                            ) : null}
                          </View>
                        )
                      })}
                    </View>
                  </>
                ) : null}

                {/* Key workouts */}
                {phase.keyWorkouts && phase.keyWorkouts.length > 0 ? (
                  <View style={styles.keyWorkoutList}>
                    <Text style={styles.sectionTitle}>{copy.keyWorkouts}</Text>
                    {phase.keyWorkouts.map((workout, i) => (
                      <Text key={i} style={styles.keyWorkoutItem}>
                        • {workout}
                      </Text>
                    ))}
                  </View>
                ) : null}

                {/* Volume guidance */}
                {phase.volumeGuidance ? (
                  <Text style={styles.phaseFocus}>
                    <Text style={styles.infoLabel}>{copy.volume}: </Text>
                    {phase.volumeGuidance}
                  </Text>
                ) : null}

                {/* Phase notes */}
                {phase.notes ? (
                  <View style={styles.notesBlock}>
                    <Text style={styles.notesText}>
                      <Text style={styles.infoLabel}>{copy.note}: </Text>
                      {phase.notes}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          )
        })}

        {/* Program notes */}
        {program.notes ? (
          <View style={styles.programNotes}>
            <Text style={styles.sectionTitle}>{copy.programNotes}</Text>
            <Text style={styles.description}>{program.notes}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <Text style={styles.footer} fixed>
          {copy.footerPrefix}{organization ? ` • ${organization}` : ''}
        </Text>
      </Page>
    </Document>
  )
}
