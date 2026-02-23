/**
 * Google GenAI Client
 *
 * Direct integration with Google's official @google/genai SDK for
 * Gemini 2.5/3 Pro video and audio analysis.
 *
 * This bypasses the Vercel AI SDK which has compatibility issues with
 * newer Gemini models, while keeping the rest of the app on Vercel SDK.
 */

import { GoogleGenAI } from '@google/genai';
import { GEMINI_MODELS } from './gemini-config';

/**
 * Create a Google GenAI client instance.
 */
export function createGoogleGenAIClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

/**
 * Content part types for Gemini requests
 */
export interface TextPart {
  text: string;
}

export interface VideoMetadata {
  /** The end offset of the video (e.g., "10s") */
  endOffset?: string;
  /** Frame rate for video analysis. Range: (0.0, 24.0]. Default: 1.0 */
  fps?: number;
  /** The start offset of the video (e.g., "0s") */
  startOffset?: string;
}

export interface InlineDataPart {
  inlineData: {
    mimeType: string;
    data: string; // base64 encoded
  };
  videoMetadata?: VideoMetadata;
}

export interface FileDataPart {
  fileData: {
    fileUri: string;
    mimeType?: string;
  };
}

export type ContentPart = TextPart | InlineDataPart | FileDataPart;

export interface GenerateContentConfig {
  /** Maximum number of output tokens (default: uses model default) */
  maxOutputTokens?: number;
  /** Temperature for response randomness (0-2, default: 1) */
  temperature?: number;
}

/**
 * Generate content with video/audio analysis.
 *
 * @param client - GoogleGenAI client instance
 * @param model - Model ID (e.g., 'gemini-2.5-pro')
 * @param parts - Content parts (text, inline data, or file references)
 * @param config - Optional generation configuration
 * @returns Generated text response
 */
export async function generateContent(
  client: GoogleGenAI,
  model: string,
  parts: ContentPart[],
  config?: GenerateContentConfig
): Promise<{ text: string; usage?: { inputTokens?: number; outputTokens?: number } }> {
  const response = await client.models.generateContent({
    model,
    contents: [{ role: 'user', parts }],
    config: config ? {
      maxOutputTokens: config.maxOutputTokens,
      temperature: config.temperature,
    } : undefined,
  });

  return {
    text: response.text || '',
    usage: response.usageMetadata
      ? {
          inputTokens: response.usageMetadata.promptTokenCount,
          outputTokens: response.usageMetadata.candidatesTokenCount,
        }
      : undefined,
  };
}

/**
 * Generate structured output (JSON) with schema validation.
 *
 * Uses Gemini's native JSON mode for reliable structured output.
 *
 * @param client - GoogleGenAI client instance
 * @param model - Model ID
 * @param parts - Content parts
 * @param schema - JSON schema for the expected output
 * @returns Parsed JSON object
 */
export async function generateStructuredContent<T>(
  client: GoogleGenAI,
  model: string,
  parts: ContentPart[],
  schema: object
): Promise<{ object: T; text: string; usage?: { inputTokens?: number; outputTokens?: number } }> {
  const response = await client.models.generateContent({
    model,
    contents: [{ role: 'user', parts }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  const text = response.text || '{}';
  let object: T;

  try {
    object = JSON.parse(text) as T;
  } catch {
    // If JSON parsing fails, try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      object = JSON.parse(jsonMatch[1]) as T;
    } else {
      throw new Error(`Failed to parse JSON response: ${text.substring(0, 200)}`);
    }
  }

  return {
    object,
    text,
    usage: response.usageMetadata
      ? {
          inputTokens: response.usageMetadata.promptTokenCount,
          outputTokens: response.usageMetadata.candidatesTokenCount,
        }
      : undefined,
  };
}

/**
 * Upload a file to Gemini's File API for large files (>20MB).
 *
 * @param client - GoogleGenAI client instance
 * @param filePath - Local file path
 * @param mimeType - MIME type of the file
 * @returns File URI for use in generateContent
 */
export async function uploadFile(
  client: GoogleGenAI,
  filePath: string,
  mimeType: string
): Promise<{ uri: string; mimeType: string }> {
  const result = await client.files.upload({
    file: filePath,
    config: { mimeType },
  });

  return {
    uri: result.uri || '',
    mimeType: result.mimeType || mimeType,
  };
}

/**
 * Upload a Buffer to Gemini's File API (for serverless environments without local files).
 *
 * @param client - GoogleGenAI client instance
 * @param buffer - File content as Buffer
 * @param mimeType - MIME type of the file
 * @param displayName - Optional display name for the file
 * @returns File URI for use in generateContent
 */
export async function uploadFileFromBuffer(
  client: GoogleGenAI,
  buffer: Buffer,
  mimeType: string,
  displayName?: string,
): Promise<{ uri: string; mimeType: string }> {
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  const result = await client.files.upload({
    file: blob,
    config: { mimeType, displayName },
  });

  const fileName = result.name;
  if (!fileName) {
    throw new Error('File upload returned no name');
  }

  // Poll until file is ACTIVE (Google processes uploads asynchronously)
  const maxWaitMs = 120_000; // 2 minutes max
  const pollIntervalMs = 2_000;
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const file = await client.files.get({ name: fileName });
    if (file.state === 'ACTIVE') {
      return {
        uri: file.uri || result.uri || '',
        mimeType: file.mimeType || mimeType,
      };
    }
    if (file.state === 'FAILED') {
      throw new Error(`File processing failed: ${fileName}`);
    }
    // Still PROCESSING — wait and retry
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`File not ready after ${maxWaitMs / 1000}s: ${fileName}`);
}

/**
 * Create inline data part from base64-encoded content.
 *
 * @param base64Data - Base64 encoded data
 * @param mimeType - MIME type of the content
 * @param videoMetadata - Optional video metadata (fps, start/end offsets)
 */
export function createInlineData(
  base64Data: string,
  mimeType: string,
  videoMetadata?: VideoMetadata
): InlineDataPart {
  const part: InlineDataPart = {
    inlineData: {
      mimeType,
      data: base64Data,
    },
  };

  if (videoMetadata) {
    part.videoMetadata = videoMetadata;
  }

  return part;
}

/**
 * Create inline data part from a data URL (e.g., from blob storage).
 */
export function createInlineDataFromUrl(dataUrl: string): InlineDataPart {
  // Parse data URL: data:video/mp4;base64,AAAAA...
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid data URL format');
  }

  return {
    inlineData: {
      mimeType: match[1],
      data: match[2],
    },
  };
}

/**
 * Create file data part from a URI (for files uploaded via File API).
 */
export function createFileData(fileUri: string, mimeType?: string): FileDataPart {
  return {
    fileData: {
      fileUri,
      mimeType,
    },
  };
}

/**
 * Create text part.
 */
export function createText(text: string): TextPart {
  return { text };
}

/**
 * Fetch a URL and convert to base64 for inline data.
 * Useful for videos stored in blob storage.
 */
export interface FetchAsBase64Options {
  maxBytes?: number
  timeoutMs?: number
}

const DEFAULT_INLINE_MAX_BYTES = 20 * 1024 * 1024 // 20MB
const DEFAULT_INLINE_TIMEOUT_MS = 15_000
const MAX_REDIRECTS = 2

function getAllowedInlineDataOrigins(): string[] {
  const origins: string[] = []

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supabaseUrl) {
    try {
      origins.push(new URL(supabaseUrl).origin)
    } catch {
      // ignore
    }
  }

  const extra = process.env.INLINE_DATA_ALLOWED_ORIGINS
  if (extra) {
    for (const raw of extra.split(',').map((s) => s.trim()).filter(Boolean)) {
      try {
        origins.push(new URL(raw).origin)
      } catch {
        // ignore
      }
    }
  }

  return Array.from(new Set(origins))
}

function validateInlineFetchUrl(raw: string, allowedOrigins: string[]): string | null {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return 'Invalid URL'
  }

  if (u.username || u.password) return 'URL must not include credentials'
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return 'Only http/https URLs are allowed'

  if (allowedOrigins.length === 0) {
    return 'No allowed origins configured for inline data fetch'
  }

  if (!allowedOrigins.includes(u.origin)) {
    return 'Origin not allowed for inline data fetch'
  }

  // If it's our Supabase origin, only allow Storage URLs (avoid hitting other Supabase endpoints).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  let supabaseOrigin: string | null = null
  if (supabaseUrl) {
    try {
      supabaseOrigin = new URL(supabaseUrl).origin
    } catch {
      supabaseOrigin = null
    }
  }

  if (supabaseOrigin && u.origin === supabaseOrigin) {
    if (!u.pathname.startsWith('/storage/v1/object/')) {
      return 'Only Supabase Storage URLs are allowed'
    }
  }

  return null
}

async function readResponseWithLimit(response: Response, maxBytes: number): Promise<Buffer> {
  const reader = response.body?.getReader()
  if (!reader) {
    const ab = await response.arrayBuffer()
    if (ab.byteLength > maxBytes) throw new Error('MAX_SIZE_EXCEEDED')
    return Buffer.from(ab)
  }

  const chunks: Buffer[] = []
  let total = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > maxBytes) {
      try {
        await reader.cancel()
      } catch {
        // ignore
      }
      throw new Error('MAX_SIZE_EXCEEDED')
    }
    chunks.push(Buffer.from(value))
  }

  return Buffer.concat(chunks)
}

export async function fetchAsBase64(
  url: string,
  options?: FetchAsBase64Options
): Promise<{ base64: string; mimeType: string }> {
  const maxBytes = options?.maxBytes ?? DEFAULT_INLINE_MAX_BYTES
  const timeoutMs = options?.timeoutMs ?? DEFAULT_INLINE_TIMEOUT_MS

  const allowedOrigins = getAllowedInlineDataOrigins()
  const validationError = validateInlineFetchUrl(url, allowedOrigins)
  if (validationError) {
    throw new Error(`Unsafe URL blocked: ${validationError}`)
  }

  let currentUrl = url
  let response: Response | null = null

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      response = await fetch(currentUrl, {
        redirect: 'manual',
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) break

      const nextUrl = new URL(location, currentUrl).toString()
      const nextValidationError = validateInlineFetchUrl(nextUrl, allowedOrigins)
      if (nextValidationError) {
        throw new Error(`Unsafe redirect blocked: ${nextValidationError}`)
      }

      currentUrl = nextUrl
      continue
    }

    break
  }

  if (!response) {
    throw new Error('Failed to fetch inline data: no response')
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch inline data: ${response.status}`)
  }

  const contentLength = response.headers.get('content-length')
  if (contentLength) {
    const size = Number(contentLength)
    if (Number.isFinite(size) && size > maxBytes) {
      throw new Error('MAX_SIZE_EXCEEDED')
    }
  }

  const buffer = await readResponseWithLimit(response, maxBytes)
  const base64 = buffer.toString('base64')
  const mimeType = response.headers.get('content-type') || 'application/octet-stream'

  return { base64, mimeType }
}

/**
 * Get the recommended model for video/audio tasks.
 * Maps our config to actual model IDs.
 *
 * Available models (February 2026):
 * - gemini-3-flash-preview: Fast, stable, video support (newest flash model)
 * - gemini-2.5-pro: Advanced reasoning
 * - gemini-3.1-pro-preview: Newest capability
 *
 * Note: Do NOT use date-stamped versions like gemini-2.5-pro-preview-05-06
 * The SDK handles API versioning automatically.
 */
export function getGeminiModelId(task: 'video' | 'audio' | 'chat'): string {
  switch (task) {
    case 'video':
      // Gemini 3 Flash - fast, excellent for video/gait analysis
      return 'gemini-3-flash-preview';
    case 'audio':
      // Gemini 3 Flash - fast for audio analysis
      return 'gemini-3-flash-preview';
    case 'chat':
      return 'gemini-3-flash-preview';
    default:
      return 'gemini-3-flash-preview';
  }
}

/**
 * Convert a Zod schema to JSON Schema format for Gemini.
 * Gemini requires JSON Schema format for structured output.
 */
export function zodToJsonSchema(zodSchema: { _def: { shape?: () => Record<string, unknown> } }): object {
  // For complex schemas, we need to convert Zod to JSON Schema
  // This is a simplified version - for production, use zod-to-json-schema library
  // For now, we'll rely on the prompt to guide the output format
  return {
    type: 'object',
    description: 'Structured analysis output',
  };
}
