import { describe, expect, it } from 'vitest'
import {
  attachCardioDebriefToNotes,
  buildCardioDebriefQuestions,
  buildCardioPostWorkoutDebrief,
  normalizeCardioDebriefAnswersForQuestions,
  parseCardioDebriefFromNotes,
  stripCardioDebriefFromNotes,
} from './post-workout-debrief'

describe('cardio post-workout debrief', () => {
  it('asks targeted follow-up questions after missed watt targets', () => {
    const questions = buildCardioDebriefQuestions({
      locale: 'en',
      totalSegments: 12,
      completedSegments: 12,
      skippedSegments: 0,
      plannedPowerLowWindows: 4,
    })

    expect(questions.map((question) => question.id)).toContain('target_fit')
    expect(questions.map((question) => question.id)).toContain('main_limiter')
    expect(questions).toHaveLength(3)
  })

  it('stores structured debrief answers without replacing visible notes', () => {
    const questions = buildCardioDebriefQuestions({
      locale: 'en',
      totalSegments: 8,
      completedSegments: 7,
      skippedSegments: 1,
      plannedPowerLowWindows: 2,
    })
    const debrief = buildCardioPostWorkoutDebrief({
      questions,
      answersByQuestionId: {
        missed_work_reason: 'Had to back off after rep seven',
        target_fit: 'too_hard',
        main_limiter: 'legs',
      },
      capturedAt: '2026-06-24T12:00:00.000Z',
      source: 'manual',
    })

    const notes = attachCardioDebriefToNotes('Legs felt heavy.', debrief)

    expect(stripCardioDebriefFromNotes(notes)).toBe('Legs felt heavy.')
    expect(parseCardioDebriefFromNotes(notes)).toEqual({
      version: 1,
      capturedAt: '2026-06-24T12:00:00.000Z',
      source: 'manual',
      answers: [
        {
          questionId: 'missed_work_reason',
          question: 'What made you skip or shorten the work?',
          answer: 'Had to back off after rep seven',
          value: null,
        },
        {
          questionId: 'target_fit',
          question: 'How did the watt target feel?',
          answer: 'Too hard',
          value: 'too_hard',
        },
        {
          questionId: 'main_limiter',
          question: 'Main limiter today?',
          answer: 'Legs',
          value: 'legs',
        },
      ],
    })
  })

  it('normalizes spoken smart debrief answers into stored form values', () => {
    const questions = buildCardioDebriefQuestions({
      locale: 'en',
      totalSegments: 8,
      completedSegments: 7,
      skippedSegments: 1,
      plannedPowerLowWindows: 2,
    })

    expect(normalizeCardioDebriefAnswersForQuestions(questions, [
      { questionId: 'missed_work_reason', answer: 'I backed off after rep seven' },
      { questionId: 'target_fit', answer: 'too hard' },
      { questionId: 'main_limiter', value: 'Legs' },
      { questionId: 'unknown', answer: 'ignored' },
    ])).toEqual({
      missed_work_reason: 'I backed off after rep seven',
      target_fit: 'too_hard',
      main_limiter: 'legs',
    })

    const swedishQuestions = buildCardioDebriefQuestions({
      locale: 'sv',
      totalSegments: 8,
      completedSegments: 8,
      skippedSegments: 0,
      plannedPowerLowWindows: 2,
    })

    expect(normalizeCardioDebriefAnswersForQuestions(swedishQuestions, [
      { questionId: 'target_fit', answer: 'Lagom' },
      { questionId: 'main_limiter', answer: 'Ben' },
    ])).toEqual({
      target_fit: 'about_right',
      main_limiter: 'legs',
    })
  })

  it('ignores malformed debrief blocks and keeps the readable note text', () => {
    const notes = 'Good finish.\n\n[CARDIO_DEBRIEF_V1]{broken[/CARDIO_DEBRIEF_V1]'

    expect(parseCardioDebriefFromNotes(notes)).toBeNull()
    expect(stripCardioDebriefFromNotes(notes)).toBe('Good finish.')
  })
})
