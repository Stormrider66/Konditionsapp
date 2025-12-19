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

export interface InlineDataPart {
  inlineData: {
    mimeType: string;
    data: string; // base64 encoded
  };
}

export interface FileDataPart {
  fileData: {
    fileUri: string;
    mimeType?: string;
  };
}

export type ContentPart = TextPart | InlineDataPart | FileDataPart;

/**
 * Generate content with video/audio analysis.
 *
 * @param client - GoogleGenAI client instance
 * @param model - Model ID (e.g., 'gemini-2.5-pro')
 * @param parts - Content parts (text, inline data, or file references)
 * @returns Generated text response
 */
export async function generateContent(
  client: GoogleGenAI,
  model: string,
  parts: ContentPart[]
): Promise<{ text: string; usage?: { inputTokens?: number; outputTokens?: number } }> {
  const response = await client.models.generateContent({
    model,
    contents: [{ role: 'user', parts }],
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
 * Create inline data part from base64-encoded content.
 */
export function createInlineData(base64Data: string, mimeType: string): InlineDataPart {
  return {
    inlineData: {
      mimeType,
      data: base64Data,
    },
  };
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
export async function fetchAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = response.headers.get('content-type') || 'application/octet-stream';

  return { base64, mimeType };
}

/**
 * Get the recommended model for video/audio tasks.
 * Maps our config to actual model IDs.
 *
 * Available models (December 2025):
 * - gemini-3-flash-preview: Fast, stable, video support (newest flash model)
 * - gemini-2.5-pro: Advanced reasoning
 * - gemini-3-pro-preview: Newest capability
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
