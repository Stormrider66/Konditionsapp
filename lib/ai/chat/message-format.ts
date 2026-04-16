import type { CoreMessage } from 'ai'
import type { ChatRequestMessage, UIMessagePart } from './types'

/**
 * Pull plain text out of a chat message regardless of which AI SDK
 * format produced it. AI SDK 5 sends `parts[]`; older clients still use
 * a string `content`.
 */
export function getMessageContent(message: ChatRequestMessage): string {
  if (message.parts && message.parts.length > 0) {
    return message.parts
      .filter((part): part is UIMessagePart => part.type === 'text')
      .map((part) => part.text)
      .join('')
  }
  return message.content || ''
}

/** Convert UIMessage format to the CoreMessage shape streamText expects. */
export function convertToCoreMessages(messages: ChatRequestMessage[]): CoreMessage[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: getMessageContent(msg),
  }))
}
