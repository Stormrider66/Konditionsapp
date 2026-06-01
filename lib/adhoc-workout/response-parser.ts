/**
 * Utilities for extracting JSON from AI responses.
 *
 * Vision models often wrap JSON in markdown fences, omit a closing fence when
 * truncated, or append a small amount of trailing text. Keep extraction lenient
 * here, then let the caller validate the parsed object.
 */

export function extractJsonFromAiResponse(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced) {
    return fenced[1].trim()
  }

  const withoutOpeningFence = trimmed.replace(/^```(?:json)?\s*/i, '').trim()
  const balancedJson = extractFirstBalancedJsonValue(withoutOpeningFence)

  return balancedJson ?? withoutOpeningFence
}

function extractFirstBalancedJsonValue(text: string): string | null {
  const start = findFirstJsonStart(text)
  if (start === -1) return null

  const stack: string[] = []
  let inString = false
  let escaped = false

  for (let i = start; i < text.length; i++) {
    const char = text[i]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{' || char === '[') {
      stack.push(char)
      continue
    }

    if (char !== '}' && char !== ']') continue

    const expectedOpen = char === '}' ? '{' : '['
    if (stack[stack.length - 1] !== expectedOpen) {
      return null
    }

    stack.pop()

    if (stack.length === 0) {
      return text.slice(start, i + 1).trim()
    }
  }

  return null
}

function findFirstJsonStart(text: string): number {
  const objectStart = text.indexOf('{')
  const arrayStart = text.indexOf('[')

  if (objectStart === -1) return arrayStart
  if (arrayStart === -1) return objectStart
  return Math.min(objectStart, arrayStart)
}
