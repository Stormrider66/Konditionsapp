import { describe, it, expect } from 'vitest'
import {
  getVoiceFileExtension,
  formatVoiceDuration,
  getMessageTextContent,
  getSpeakableAssistantText,
} from './voice-helpers'

describe('getVoiceFileExtension', () => {
  it('maps mp4 to m4a', () => {
    expect(getVoiceFileExtension('audio/mp4')).toBe('m4a')
  })
  it('maps m4a to m4a', () => {
    expect(getVoiceFileExtension('audio/x-m4a')).toBe('m4a')
  })
  it('maps ogg to ogg', () => {
    expect(getVoiceFileExtension('audio/ogg')).toBe('ogg')
  })
  it('maps wav to wav', () => {
    expect(getVoiceFileExtension('audio/wav')).toBe('wav')
  })
  it('maps mpeg/mp3 to mp3', () => {
    expect(getVoiceFileExtension('audio/mpeg')).toBe('mp3')
    expect(getVoiceFileExtension('audio/mp3')).toBe('mp3')
  })
  it('maps webm to webm', () => {
    expect(getVoiceFileExtension('audio/webm')).toBe('webm')
  })
  it('falls back to webm for unknown types', () => {
    expect(getVoiceFileExtension('audio/flac')).toBe('webm')
    expect(getVoiceFileExtension('')).toBe('webm')
  })
})

describe('formatVoiceDuration', () => {
  it('formats zero seconds', () => {
    expect(formatVoiceDuration(0)).toBe('0:00')
  })
  it('formats sub-minute durations with padding', () => {
    expect(formatVoiceDuration(5)).toBe('0:05')
    expect(formatVoiceDuration(65)).toBe('1:05')
  })
  it('formats exact minutes', () => {
    expect(formatVoiceDuration(600)).toBe('10:00')
  })
  it('formats arbitrary durations', () => {
    expect(formatVoiceDuration(125)).toBe('2:05')
  })
})

describe('getMessageTextContent', () => {
  it('returns empty string for undefined', () => {
    expect(getMessageTextContent(undefined)).toBe('')
  })
  it('returns empty string for empty array', () => {
    expect(getMessageTextContent([])).toBe('')
  })
  it('joins text parts and filters non-text parts', () => {
    const parts = [
      { type: 'text', text: 'Hello' },
      { type: 'tool-call', name: 'foo' },
      { type: 'text', text: ' world' },
      null,
      'raw string',
      { type: 'image', url: 'x' },
    ]
    expect(getMessageTextContent(parts)).toBe('Hello world')
  })
  it('returns empty string when no text parts exist', () => {
    expect(getMessageTextContent([{ type: 'tool-call' }, null])).toBe('')
  })
})

describe('getSpeakableAssistantText', () => {
  it('strips fenced code blocks', () => {
    expect(getSpeakableAssistantText('before ```const x = 1``` after')).toBe('before after')
  })
  it('strips inline code backticks but keeps content', () => {
    expect(getSpeakableAssistantText('use `npm run dev` now')).toBe('use npm run dev now')
  })
  it('strips markdown links keeping the label', () => {
    expect(getSpeakableAssistantText('see [the docs](https://example.com)')).toBe('see the docs')
  })
  it('strips markdown symbols', () => {
    expect(getSpeakableAssistantText('# Heading **bold** _italic_ ~strike~ > quote | pipe')).toBe(
      'Heading bold italic strike quote pipe'
    )
  })
  it('collapses whitespace and trims', () => {
    expect(getSpeakableAssistantText('  lots   of\n\nspace  ')).toBe('lots of space')
  })
})
