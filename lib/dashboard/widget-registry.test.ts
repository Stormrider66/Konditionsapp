import { describe, expect, it } from 'vitest'

import {
  WIDGET_REGISTRY,
  widgetDescription,
  widgetDisplayName,
} from './widget-registry'

const SWEDISH_COPY_PATTERN =
  /[\u00c5\u00c4\u00d6\u00e5\u00e4\u00f6]|\b(Daglig|daglig|Dagens|dagens|klienter|programf\u00f6rslag|tr\u00e4ning|uppm\u00e4rksamhet|Snabb\u00e5tg\u00e4rder|T\u00e4vlingar)\b/

describe('dashboard widget registry localization', () => {
  it('keeps English display copy covered for every registered widget', () => {
    for (const definition of Object.values(WIDGET_REGISTRY)) {
      const name = widgetDisplayName(definition, 'en')
      const description = widgetDescription(definition, 'en')

      expect(name, definition.key).toBeTruthy()
      expect(description, definition.key).toBeTruthy()
      expect(`${name}\n${description}`, definition.key).not.toMatch(SWEDISH_COPY_PATTERN)
    }
  })

  it('preserves Swedish display copy when requested', () => {
    const definition = WIDGET_REGISTRY['coach-ai-assistant']

    expect(widgetDisplayName(definition, 'sv')).toBe('AI-assistent')
    expect(widgetDescription(definition, 'sv')).toContain('programf\u00f6rslag')
  })
})
