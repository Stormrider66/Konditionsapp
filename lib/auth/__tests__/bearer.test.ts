import { describe, expect, it } from 'vitest'

import { parseBearerJwt } from '../bearer'

// Shape-valid JWT segments (content is irrelevant to the parser).
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSJ9.c2lnbmF0dXJl'

describe('parseBearerJwt', () => {
  it('accepts a JWT-shaped bearer token', () => {
    expect(parseBearerJwt(`Bearer ${JWT}`)).toBe(JWT)
  })

  it('is case-insensitive on the scheme and tolerant of extra whitespace', () => {
    expect(parseBearerJwt(`bearer  ${JWT} `)).toBe(JWT)
  })

  it('rejects business API keys (bak_*) so lib/api-key-auth keeps handling them', () => {
    expect(parseBearerJwt('Bearer bak_1234567890abcdef')).toBeNull()
  })

  it('rejects missing or non-Bearer headers', () => {
    expect(parseBearerJwt(null)).toBeNull()
    expect(parseBearerJwt(undefined)).toBeNull()
    expect(parseBearerJwt('')).toBeNull()
    expect(parseBearerJwt(`Basic ${JWT}`)).toBeNull()
    expect(parseBearerJwt(JWT)).toBeNull()
  })

  it('rejects non-JWT-shaped tokens', () => {
    expect(parseBearerJwt('Bearer abc')).toBeNull() // 1 segment
    expect(parseBearerJwt('Bearer a.b')).toBeNull() // 2 segments
    expect(parseBearerJwt('Bearer a.b.c.d')).toBeNull() // 4 segments
    expect(parseBearerJwt('Bearer a..c')).toBeNull() // empty segment
    expect(parseBearerJwt('Bearer a.b!.c')).toBeNull() // non-base64url chars
  })
})
