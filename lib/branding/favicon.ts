export const DEFAULT_FAVICON_COLOR = '#3b82f6'
export const DEFAULT_FAVICON_LABEL = 'T'

const VALID_HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

function escapeSvgText(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&apos;'
      default:
        return char
    }
  })
}

function expandHexColor(color: string) {
  if (color.length !== 4) return color

  return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
}

function getRelativeLuminance(color: string) {
  const hex = expandHexColor(color).slice(1)
  const [red, green, blue] = [0, 2, 4].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

export function getBusinessFaviconUrl(businessSlug: string) {
  return `/api/branding/favicon/${encodeURIComponent(businessSlug)}`
}

export function normalizeFaviconColor(color: string | null | undefined) {
  const trimmed = color?.trim()
  return trimmed && VALID_HEX_COLOR.test(trimmed) ? trimmed : DEFAULT_FAVICON_COLOR
}

export function getFaviconLabel(name: string | null | undefined) {
  const match = name?.trim().match(/[\p{L}\p{N}]/u)
  return match?.[0]?.toLocaleUpperCase('sv-SE') ?? DEFAULT_FAVICON_LABEL
}

export function buildBusinessFaviconSvg({
  name,
  primaryColor,
}: {
  name?: string | null
  primaryColor?: string | null
}) {
  const backgroundColor = normalizeFaviconColor(primaryColor)
  const textColor = getRelativeLuminance(backgroundColor) > 0.48 ? '#111827' : '#ffffff'
  const label = escapeSvgText(getFaviconLabel(name))

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
    `<rect width="64" height="64" rx="14" fill="${backgroundColor}"/>`,
    `<text x="32" y="35" text-anchor="middle" dominant-baseline="middle" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700" fill="${textColor}">${label}</text>`,
    '</svg>',
  ].join('')
}
