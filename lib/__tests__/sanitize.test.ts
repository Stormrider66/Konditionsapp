import { describe, it, expect } from 'vitest'
import {
  escapeHtml,
  sanitizeAttribute,
  sanitizeUrl,
  textToHtml,
  sanitizeForEmail,
  stripHtml,
  sanitizeFilename,
} from '../sanitize'

describe('HTML Sanitization', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      )
    })

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
    })

    it('should escape quotes', () => {
      expect(escapeHtml('"test" and \'test\'')).toBe('&quot;test&quot; and &#x27;test&#x27;')
    })

    it('should handle null and undefined', () => {
      expect(escapeHtml(null)).toBe('')
      expect(escapeHtml(undefined)).toBe('')
    })

    it('should handle empty strings', () => {
      expect(escapeHtml('')).toBe('')
    })

    it('should handle safe strings unchanged', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World')
    })
  })

  describe('sanitizeAttribute', () => {
    it('should escape HTML and replace newlines', () => {
      expect(sanitizeAttribute('<test>\nvalue')).toBe('&lt;test&gt; value')
    })

    it('should trim whitespace', () => {
      expect(sanitizeAttribute('  value  ')).toBe('value')
    })
  })

  describe('sanitizeUrl', () => {
    it('should allow safe URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com')
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com')
      expect(sanitizeUrl('/path/to/resource')).toBe('/path/to/resource')
    })

    it('should block javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert("xss")')).toBe('')
      expect(sanitizeUrl('JAVASCRIPT:alert("xss")')).toBe('')
    })

    it('should block data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert("xss")</script>')).toBe('')
    })

    it('should block vbscript: URLs', () => {
      expect(sanitizeUrl('vbscript:msgbox("xss")')).toBe('')
    })

    it('should handle null and undefined', () => {
      expect(sanitizeUrl(null)).toBe('')
      expect(sanitizeUrl(undefined)).toBe('')
    })
  })

  describe('textToHtml', () => {
    it('should convert newlines to <br> tags', () => {
      expect(textToHtml('Line 1\nLine 2')).toBe('Line 1<br>Line 2')
    })

    it('should escape HTML before converting newlines', () => {
      expect(textToHtml('<script>\nalert()</script>')).toBe(
        '&lt;script&gt;<br>alert()&lt;&#x2F;script&gt;'
      )
    })
  })

  describe('sanitizeForEmail', () => {
    it('should escape HTML and convert newlines for email', () => {
      const input = 'Hello <b>World</b>\nNew line'
      const output = sanitizeForEmail(input)
      expect(output).toContain('&lt;b&gt;')
      expect(output).toContain('<br>')
    })
  })

  describe('stripHtml', () => {
    it('should remove HTML tags', () => {
      expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World')
    })

    it('should convert HTML entities', () => {
      expect(stripHtml('Tom &amp; Jerry')).toBe('Tom & Jerry')
    })

    it('should handle empty input', () => {
      expect(stripHtml('')).toBe('')
      expect(stripHtml(null)).toBe('')
    })
  })

  describe('sanitizeFilename', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeFilename('file/name.txt')).toBe('file_name.txt')
      expect(sanitizeFilename('file\\name.txt')).toBe('file_name.txt')
      expect(sanitizeFilename('file?name.txt')).toBe('file_name.txt')
    })

    it('should prevent path traversal', () => {
      // Path traversal: "../../../etc/passwd"
      // Each ".." becomes "__", and each "/" becomes "_"
      // So: ".." + "/" + ".." + "/" + ".." + "/" + "etc" + "/" + "passwd"
      // = "__" + "_" + "__" + "_" + "__" + "_" + "etc" + "_" + "passwd"
      // = "_________etc_passwd"
      expect(sanitizeFilename('../../../etc/passwd')).toBe('_________etc_passwd')
    })

    it('should handle leading dots appropriately', () => {
      // Single leading dot is removed
      expect(sanitizeFilename('.htaccess')).toBe('htaccess')
      // "..." = ".." + "." => "__" + ".", then leading chars are not dots, so stays "__.hidden"
      // This is actually correct behavior - we prevent path traversal but keep the marker
      expect(sanitizeFilename('...hidden')).toBe('__.hidden')
    })

    it('should return unnamed for empty input', () => {
      expect(sanitizeFilename('')).toBe('unnamed')
      expect(sanitizeFilename(null)).toBe('unnamed')
    })
  })
})
