// Shared pure helpers for the floating AI chat components (coach + athlete).
// Voice recording file-extension mapping, duration formatting, and message
// text extraction / speech sanitization. Extracted to dedup identical logic
// between FloatingAIChat and AthleteFloatingChat.

export function getVoiceFileExtension(mimeType: string): string {
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('wav')) return 'wav'
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3'
  return 'webm'
}

export function formatVoiceDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function getMessageTextContent(parts?: unknown[]): string {
  return parts
    ?.filter((part): part is { type: 'text'; text: string } => {
      return typeof part === 'object' && part !== null && (part as { type?: unknown }).type === 'text'
    })
    .map((part) => part.text)
    .join('') || ''
}

export function getSpeakableAssistantText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_~>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
