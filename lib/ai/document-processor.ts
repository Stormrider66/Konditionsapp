/**
 * Document Processing Pipeline
 *
 * Handles parsing and content extraction from various document types:
 * - PDF files
 * - Excel/CSV files
 * - Markdown/Text files
 */

import { DocumentType } from '@prisma/client';

export interface ProcessedDocument {
  content: string;
  metadata: {
    pageCount?: number;
    sheetCount?: number;
    wordCount: number;
    extractedAt: string;
  };
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
          // Fetch from URL
          const textResponse = await fetch(fileUrl);
          if (!textResponse.ok) {
            return {
              error: 'Failed to fetch document',
              code: 'FETCH_ERROR',
              details: `HTTP ${textResponse.status}`,
            };
          }
          content = await textResponse.text();
        }
        break;

      case 'PDF':
        // Use parsePDF function
        return await parsePDF(fileUrl);

      case 'EXCEL':
        // Use parseExcel function
        return await parseExcel(fileUrl);

      case 'VIDEO':
        // Video requires transcription service
        return {
          error: 'Video transcription not implemented',
          code: 'NOT_IMPLEMENTED',
          details: 'Video files need transcription (Whisper API) before processing',
        };

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

    const response = await fetch(fileUrl);
    if (!response.ok) {
      return {
        error: 'Failed to fetch PDF',
        code: 'FETCH_ERROR',
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const data = await pdfParse(buffer);

    return {
      content: data.text,
      metadata: {
        pageCount: data.numpages,
        wordCount: data.text.split(/\s+/).filter(Boolean).length,
        extractedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
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
 * Parse Excel/CSV content using xlsx (when installed)
 * This is a placeholder that shows the intended implementation
 */
export async function parseExcel(
  fileUrl: string
): Promise<ProcessedDocument | ProcessingError> {
  try {
    // Dynamic import to avoid breaking if not installed
    // eslint-disable-next-line
    const XLSX = require('xlsx');

    const response = await fetch(fileUrl);
    if (!response.ok) {
      return {
        error: 'Failed to fetch Excel file',
        code: 'FETCH_ERROR',
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Convert all sheets to text
    const sheets: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      sheets.push(`## Sheet: ${sheetName}\n\n${csv}`);
    }

    const content = sheets.join('\n\n---\n\n');

    return {
      content,
      metadata: {
        sheetCount: workbook.SheetNames.length,
        wordCount: content.split(/\s+/).filter(Boolean).length,
        extractedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Cannot find module 'xlsx'")
    ) {
      return {
        error: 'xlsx library not installed',
        code: 'DEPENDENCY_MISSING',
        details: 'Run: npm install xlsx',
      };
    }

    return {
      error: 'Excel parsing failed',
      code: 'PARSING_ERROR',
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
      implemented: false, // Requires transcription
    },
  ];
}
