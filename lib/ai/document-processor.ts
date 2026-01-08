/**
 * Document Processing Pipeline
 *
 * Handles parsing and content extraction from various document types:
 * - PDF files
 * - Excel/CSV files
 * - Markdown/Text files
 */

import 'server-only'

import { DocumentType } from '@prisma/client';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import ExcelJS from 'exceljs';

export interface ProcessedDocument {
  content: string;
  metadata: {
    pageCount?: number;
    sheetCount?: number;
    wordCount: number;
    extractedAt: string;
  };
}

const STORAGE_BUCKET = 'coach-documents'
const MAX_BINARY_BYTES = 50 * 1024 * 1024 // 50MB (matches upload limit)
const MAX_TEXT_BYTES = 2 * 1024 * 1024 // 2MB
const MAX_PDF_BYTES = 25 * 1024 * 1024 // 25MB (parsing guardrail)
const MAX_EXCEL_BYTES = 20 * 1024 * 1024 // 20MB (parsing guardrail)
const MAX_VIDEO_BYTES = 20 * 1024 * 1024 // 20MB (Gemini inline_data limits + base64 overhead)

// Output/parsing guardrails (avoid runaway extraction / zip bombs)
const MAX_EXTRACTED_TEXT_CHARS = 300_000
const MAX_PDF_PAGES = 100
const MAX_EXCEL_SHEETS = 10
const MAX_EXCEL_ROWS_PER_SHEET = 5_000
const MAX_EXCEL_COLS_PER_ROW = 50
const MAX_EXCEL_TOTAL_CELLS = 200_000
const TIMEOUT_MS = 15_000
const MAX_REDIRECTS = 2

function getAllowedSupabaseOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!raw) return null
  try {
    return new URL(raw).origin
  } catch {
    return null
  }
}

function validateSupabaseFetchUrl(raw: string): string | null {
  const allowedOrigin = getAllowedSupabaseOrigin()
  if (!allowedOrigin) return 'NEXT_PUBLIC_SUPABASE_URL is not configured'

  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return 'Invalid URL'
  }

  if (u.username || u.password) return 'URL must not include credentials'
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return 'Only http/https URLs are allowed'
  if (u.origin !== allowedOrigin) return 'Only Supabase Storage URLs are allowed'

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

async function fetchBytesFromSupabaseUrl(
  url: string,
  maxBytes: number,
  accept?: string
): Promise<{ buffer: Buffer; contentType: string | null } | ProcessingError> {
  const validationError = validateSupabaseFetchUrl(url)
  if (validationError) {
    return { error: 'Unsafe URL blocked', code: 'UNSAFE_URL', details: validationError }
  }

  let currentUrl = url

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    let response: Response
    try {
      response = await fetch(currentUrl, {
        headers: accept ? { Accept: accept } : undefined,
        redirect: 'manual',
        signal: controller.signal,
      })
    } catch (e) {
      return {
        error: 'Failed to fetch document',
        code: 'FETCH_ERROR',
        details: e instanceof Error ? e.message : 'Unknown network error',
      }
    } finally {
      clearTimeout(timeout)
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) {
        return { error: 'Redirect without location', code: 'FETCH_ERROR' }
      }
      const nextUrl = new URL(location, currentUrl).toString()
      const nextValidationError = validateSupabaseFetchUrl(nextUrl)
      if (nextValidationError) {
        return {
          error: 'Unsafe redirect blocked',
          code: 'UNSAFE_URL',
          details: nextValidationError,
        }
      }
      currentUrl = nextUrl
      continue
    }

    if (!response.ok) {
      return {
        error: 'Failed to fetch document',
        code: 'FETCH_ERROR',
        details: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength) {
      const size = Number(contentLength)
      if (Number.isFinite(size) && size > maxBytes) {
        return { error: 'File too large', code: 'MAX_SIZE', details: `> ${maxBytes} bytes` }
      }
    }

    try {
      const buffer = await readResponseWithLimit(response, maxBytes)
      return {
        buffer,
        contentType: response.headers.get('content-type'),
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'MAX_SIZE_EXCEEDED') {
        return { error: 'File too large', code: 'MAX_SIZE', details: `> ${maxBytes} bytes` }
      }
      return {
        error: 'Failed to read document',
        code: 'FETCH_ERROR',
        details: e instanceof Error ? e.message : 'Unknown error',
      }
    }
  }

  return { error: 'Too many redirects', code: 'FETCH_ERROR' }
}

async function downloadBytesFromSupabaseStorage(
  storagePath: string,
  maxBytes: number
): Promise<{ buffer: Buffer; contentType: string | null } | ProcessingError> {
  try {
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(storagePath)
    if (error || !data) {
      return {
        error: 'Failed to download file from storage',
        code: 'STORAGE_ERROR',
        details: error?.message || 'No data returned',
      }
    }

    const blob = data as unknown as Blob
    if (typeof blob.size === 'number' && blob.size > maxBytes) {
      return { error: 'File too large', code: 'MAX_SIZE', details: `> ${maxBytes} bytes` }
    }

    const ab = await blob.arrayBuffer()
    if (ab.byteLength > maxBytes) {
      return { error: 'File too large', code: 'MAX_SIZE', details: `> ${maxBytes} bytes` }
    }

    return {
      buffer: Buffer.from(ab),
      contentType: blob.type || null,
    }
  } catch (e) {
    return {
      error: 'Failed to download file from storage',
      code: 'STORAGE_ERROR',
      details: e instanceof Error ? e.message : 'Unknown error',
    }
  }
}

function decodeDataUrlToText(dataUrl: string, maxBytes: number): string | null {
  const comma = dataUrl.indexOf(',')
  if (comma === -1) return null

  const base64 = dataUrl.slice(comma + 1)
  const buf = Buffer.from(base64, 'base64')
  if (buf.byteLength > maxBytes) return null
  return buf.toString('utf8')
}

function decodeDataUrlToBytes(
  dataUrl: string,
  maxBytes: number
): { buffer: Buffer; contentType: string | null } | null {
  const comma = dataUrl.indexOf(',')
  if (comma === -1) return null

  const meta = dataUrl.slice('data:'.length, comma)
  const isBase64 = meta.includes(';base64')
  if (!isBase64) return null

  const contentType = meta.split(';')[0] || null
  const base64 = dataUrl.slice(comma + 1)
  const buf = Buffer.from(base64, 'base64')
  if (buf.byteLength > maxBytes) return null

  return { buffer: buf, contentType }
}

export interface ProcessingError {
  error: string;
  code: string;
  details?: string;
}

/**
 * Extract text content from a document based on its type
 */
export async function processDocument(
  fileUrl: string,
  fileType: DocumentType,
  rawContent?: string
): Promise<ProcessedDocument | ProcessingError> {
  try {
    let content: string;
    let metadata: ProcessedDocument['metadata'] = {
      wordCount: 0,
      extractedAt: new Date().toISOString(),
    };

    switch (fileType) {
      case 'TEXT':
      case 'MARKDOWN':
        // For text/markdown, use raw content if provided
        if (rawContent) {
          content = rawContent;
        } else {
          // Prefer decoding from data: URLs or downloading from Supabase storage path.
          if (fileUrl.startsWith('data:')) {
            const decoded = decodeDataUrlToText(fileUrl, MAX_TEXT_BYTES)
            if (decoded == null) {
              return { error: 'Text content too large', code: 'MAX_SIZE' }
            }
            content = decoded
          } else if (!fileUrl.startsWith('http')) {
            const dl = await downloadBytesFromSupabaseStorage(fileUrl, MAX_TEXT_BYTES)
            if ('error' in dl) return dl
            content = dl.buffer.toString('utf8')
          } else {
            const fetched = await fetchBytesFromSupabaseUrl(fileUrl, MAX_TEXT_BYTES, 'text/plain')
            if ('error' in fetched) return fetched
            content = fetched.buffer.toString('utf8')
          }
        }
        break;

      case 'PDF':
        // Use parsePDF function
        return await parsePDF(fileUrl);

      case 'EXCEL':
        // Use parseExcel function
        return await parseExcel(fileUrl);

      case 'VIDEO':
        // Use Gemini for video transcription/description
        return await parseVideo(fileUrl);

      default:
        return {
          error: 'Unsupported document type',
          code: 'UNSUPPORTED_TYPE',
          details: `Type: ${fileType}`,
        };
    }

    // Calculate word count
    metadata.wordCount = content.split(/\s+/).filter(Boolean).length;

    return { content, metadata };
  } catch (error) {
    return {
      error: 'Document processing failed',
      code: 'PROCESSING_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse PDF content using pdf-parse (when installed)
 * This is a placeholder that shows the intended implementation
 */
export async function parsePDF(
  fileUrl: string
): Promise<ProcessedDocument | ProcessingError> {
  try {
    // Dynamic import to avoid breaking if not installed
    // eslint-disable-next-line
    const pdfParse = require('pdf-parse');

    let buffer: Buffer
    if (fileUrl.startsWith('data:')) {
      const decoded = decodeDataUrlToBytes(fileUrl, MAX_PDF_BYTES)
      if (!decoded) {
        return { error: 'Invalid or too large PDF data URL', code: 'MAX_SIZE' }
      }
      buffer = decoded.buffer
    } else {
      const fetched =
        !fileUrl.startsWith('http')
          ? await downloadBytesFromSupabaseStorage(fileUrl, MAX_PDF_BYTES)
          : await fetchBytesFromSupabaseUrl(fileUrl, MAX_PDF_BYTES, 'application/pdf')
      if ('error' in fetched) return fetched
      buffer = fetched.buffer
    }
    // pdf-parse supports limiting pages via { max }
    let parsed: any
    try {
      parsed = await pdfParse(buffer, { max: MAX_PDF_PAGES })
    } catch {
      parsed = await pdfParse(buffer)
    }

    const text = typeof parsed?.text === 'string' ? parsed.text : ''
    const safeText = text.length > MAX_EXTRACTED_TEXT_CHARS ? text.slice(0, MAX_EXTRACTED_TEXT_CHARS) : text

    return {
      content: safeText,
      metadata: {
        pageCount: parsed?.numpages,
        wordCount: safeText.split(/\s+/).filter(Boolean).length,
        extractedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('[Document Processor] PDF parsing error:', error);
    if (
      error instanceof Error &&
      error.message.includes("Cannot find module 'pdf-parse'")
    ) {
      return {
        error: 'pdf-parse library not installed',
        code: 'DEPENDENCY_MISSING',
        details: 'Run: npm install pdf-parse',
      };
    }

    return {
      error: 'PDF parsing failed',
      code: 'PARSING_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse Excel/CSV content using exceljs
 */
export async function parseExcel(
  fileUrl: string
): Promise<ProcessedDocument | ProcessingError> {
  try {
    let buffer: Buffer
    if (fileUrl.startsWith('data:')) {
      const decoded = decodeDataUrlToBytes(fileUrl, MAX_EXCEL_BYTES)
      if (!decoded) {
        return { error: 'Invalid or too large Excel data URL', code: 'MAX_SIZE' }
      }
      buffer = decoded.buffer
    } else {
      const fetched =
        !fileUrl.startsWith('http')
          ? await downloadBytesFromSupabaseStorage(fileUrl, MAX_EXCEL_BYTES)
          : await fetchBytesFromSupabaseUrl(fileUrl, MAX_EXCEL_BYTES)
      if ('error' in fetched) return fetched
      buffer = fetched.buffer
    }
    const workbook = new ExcelJS.Workbook();

    // Try XLSX first; if it fails, fall back to treating it as plain CSV text.
    let parsedAsXlsx = true;
    try {
      // exceljs types can be slightly out of sync with newer Node Buffer generics
      await workbook.xlsx.load(buffer as any);
    } catch {
      parsedAsXlsx = false;
    }

    let content = '';
    let sheetCount = 0;

    if (parsedAsXlsx) {
      class StopParsing extends Error {
        constructor(public reason: string) {
          super(reason)
        }
      }

      const sheets: string[] = [];
      let processedSheets = 0
      let totalCells = 0
      let totalChars = 0

      const cellValueToString = (v: any): string => {
        if (v == null) return ''
        if (v instanceof Date) return v.toISOString()
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v)

        if (typeof v === 'object') {
          // Hyperlink
          if ('hyperlink' in v) return String((v as any).text ?? (v as any).hyperlink)
          // Formula
          if ('formula' in v) return (v as any).result != null ? String((v as any).result) : String((v as any).formula)
          // Rich text
          if ('richText' in v && Array.isArray((v as any).richText)) {
            return (v as any).richText.map((p: any) => p?.text ?? '').join('')
          }
          if ('text' in v && typeof (v as any).text === 'string') return (v as any).text
          if ('result' in v && (v as any).result != null) return String((v as any).result)
        }

        return String(v)
      }

      try {
        workbook.eachSheet((worksheet) => {
          if (processedSheets >= MAX_EXCEL_SHEETS) {
            throw new StopParsing('MAX_SHEETS')
          }
          processedSheets++

          const rows: string[] = [];
          let processedRows = 0

          worksheet.eachRow({ includeEmpty: false }, (row) => {
            if (processedRows >= MAX_EXCEL_ROWS_PER_SHEET) {
              throw new StopParsing('MAX_ROWS')
            }

            const cells: string[] = []
            row.eachCell({ includeEmpty: false }, (cell) => {
              if (cells.length >= MAX_EXCEL_COLS_PER_ROW) return
              cells.push(cellValueToString((cell as any).value))
            })

            totalCells += cells.length
            if (totalCells > MAX_EXCEL_TOTAL_CELLS) {
              throw new StopParsing('MAX_CELLS')
            }

            const line = cells.join('\t')
            totalChars += line.length + 1
            if (totalChars > MAX_EXTRACTED_TEXT_CHARS) {
              throw new StopParsing('MAX_CHARS')
            }

            rows.push(line)
            processedRows++
          });

          sheets.push(`## Sheet: ${worksheet.name}\n\n${rows.join('\n')}`);
        });
      } catch (e) {
        if (!(e instanceof StopParsing)) throw e
      }

      content = sheets.join('\n\n---\n\n');
      // Total sheets in workbook (not just processed)
      sheetCount = workbook.worksheets.length;
    } else {
      // CSV fallback
      const csvText = buffer.toString('utf8')
      const safeCsv = csvText.length > MAX_EXTRACTED_TEXT_CHARS ? csvText.slice(0, MAX_EXTRACTED_TEXT_CHARS) : csvText
      content = `## Sheet: CSV\n\n${safeCsv}`;
      sheetCount = 1;
    }

    return {
      content,
      metadata: {
        sheetCount,
        wordCount: content.split(/\s+/).filter(Boolean).length,
        extractedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('[Document Processor] Excel parsing error:', error);
    return {
      error: 'Excel parsing failed',
      code: 'PARSING_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse video content using Gemini for transcription/description
 * Extracts speech and describes visual content for RAG context
 */
export async function parseVideo(
  fileUrl: string
): Promise<ProcessedDocument | ProcessingError> {
  try {
    let fetched: { buffer: Buffer; contentType: string | null } | ProcessingError
    if (fileUrl.startsWith('data:')) {
      const decoded = decodeDataUrlToBytes(fileUrl, MAX_VIDEO_BYTES)
      if (!decoded) {
        return { error: 'Invalid or too large video data URL', code: 'MAX_SIZE' }
      }
      fetched = decoded
    } else {
      fetched =
        !fileUrl.startsWith('http')
          ? await downloadBytesFromSupabaseStorage(fileUrl, MAX_VIDEO_BYTES)
          : await fetchBytesFromSupabaseUrl(fileUrl, MAX_VIDEO_BYTES)
    }
    if ('error' in fetched) return fetched

    // Check for Gemini API key
    const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return {
        error: 'Gemini API key not configured',
        code: 'CONFIG_ERROR',
        details: 'Set GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY environment variable',
      };
    }

    // Get video as base64
    const videoBuffer = fetched.buffer
    const videoBase64 = videoBuffer.toString('base64');
    const mimeType = fetched.contentType || 'video/mp4';

    // Use Gemini to analyze and transcribe the video
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Analyze this video and provide:
1. A complete transcription of any speech or narration
2. A detailed description of the visual content
3. Key topics or themes discussed
4. Any exercise demonstrations or techniques shown

Format the output as a structured document suitable for search and reference.`,
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: videoBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error('[Document Processor] Gemini API error:', errorData);
      return {
        error: 'Video analysis failed',
        code: 'GEMINI_ERROR',
        details: `HTTP ${geminiResponse.status}: ${errorData.substring(0, 200)}`,
      };
    }

    const geminiData = await geminiResponse.json();
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!content) {
      return {
        error: 'No content extracted from video',
        code: 'EMPTY_CONTENT',
        details: 'Gemini returned empty response',
      };
    }

    console.log('[Document Processor] Video transcription complete, length:', content.length);

    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).filter(Boolean).length,
        extractedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('[Document Processor] Video parsing error:', error);
    return {
      error: 'Video processing failed',
      code: 'PROCESSING_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a processing result is an error
 */
export function isProcessingError(
  result: ProcessedDocument | ProcessingError
): result is ProcessingError {
  return 'error' in result && 'code' in result;
}

/**
 * Get supported file types for document upload
 */
export function getSupportedFileTypes(): {
  type: DocumentType;
  extensions: string[];
  mimeTypes: string[];
  implemented: boolean;
}[] {
  return [
    {
      type: 'TEXT',
      extensions: ['.txt'],
      mimeTypes: ['text/plain'],
      implemented: true,
    },
    {
      type: 'MARKDOWN',
      extensions: ['.md', '.markdown'],
      mimeTypes: ['text/markdown', 'text/x-markdown'],
      implemented: true,
    },
    {
      type: 'PDF',
      extensions: ['.pdf'],
      mimeTypes: ['application/pdf'],
      implemented: true,
    },
    {
      type: 'EXCEL',
      extensions: ['.xlsx', '.xls', '.csv'],
      mimeTypes: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ],
      implemented: true,
    },
    {
      type: 'VIDEO',
      extensions: ['.mp4', '.mov', '.avi', '.webm'],
      mimeTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
      implemented: true, // Uses Gemini for transcription
    },
  ];
}
