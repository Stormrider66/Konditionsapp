/**
 * HTML Sanitization Utilities
 *
 * Provides XSS protection for user-generated content before rendering in HTML.
 */

/**
 * HTML entities that need escaping
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

/**
 * Escape HTML special characters to prevent XSS
 *
 * @param text - The string to escape
 * @returns Escaped string safe for HTML rendering
 *
 * @example
 * ```ts
 * const userInput = '<script>alert("xss")</script>'
 * const safe = escapeHtml(userInput)
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * ```
 */
export function escapeHtml(text: string | null | undefined): string {
  if (text == null) {
    return ''
  }

  return String(text).replace(/[&<>"'`=/]/g, (char) => HTML_ESCAPE_MAP[char])
}

/**
 * Sanitize a string for use in HTML attributes
 *
 * @param text - The string to sanitize
 * @returns Sanitized string safe for HTML attribute values
 */
export function sanitizeAttribute(text: string | null | undefined): string {
  if (text == null) {
    return ''
  }

  return escapeHtml(text)
    .replace(/\r?\n/g, ' ') // Replace newlines with spaces
    .trim()
}

/**
 * Sanitize a URL to prevent javascript: and data: protocol attacks
 *
 * @param url - The URL to sanitize
 * @returns Sanitized URL or empty string if dangerous
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (url == null || url.trim() === '') {
    return ''
  }

  const trimmed = url.trim().toLowerCase()

  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return ''
  }

  return url
}

/**
 * Create HTML-safe text content
 * Converts newlines to <br> tags after escaping
 *
 * @param text - The text to convert
 * @returns HTML-safe string with line breaks
 */
export function textToHtml(text: string | null | undefined): string {
  if (text == null) {
    return ''
  }

  return escapeHtml(text).replace(/\r?\n/g, '<br>')
}

/**
 * Sanitize user input for use in email templates
 * This is a more permissive sanitizer that allows basic formatting
 *
 * @param text - The text to sanitize
 * @returns Sanitized text safe for email HTML
 */
export function sanitizeForEmail(text: string | null | undefined): string {
  if (text == null) {
    return ''
  }

  // Escape HTML first
  let safe = escapeHtml(text)

  // Convert newlines to <br> for email display
  safe = safe.replace(/\r?\n/g, '<br>')

  return safe
}

/**
 * Strip all HTML tags from a string
 * Use this when you need plain text output
 *
 * @param html - String potentially containing HTML
 * @returns Plain text with all HTML tags removed
 */
export function stripHtml(html: string | null | undefined): string {
  if (html == null) {
    return ''
  }

  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .trim()
}

/**
 * Validate and sanitize a filename
 * Removes path traversal attempts and dangerous characters
 *
 * @param filename - The filename to sanitize
 * @returns Safe filename
 */
export function sanitizeFilename(filename: string | null | undefined): string {
  if (filename == null) {
    return 'unnamed'
  }

  let safe = filename
    .replace(/[/\\?%*:|"<>]/g, '_') // Replace dangerous chars
    .replace(/\.\./g, '__') // Prevent path traversal (replace with double underscore)
    .trim()

  // Remove leading dots (repeatedly until no more)
  while (safe.startsWith('.')) {
    safe = safe.slice(1)
  }

  return safe || 'unnamed'
}
