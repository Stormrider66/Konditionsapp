/**
 * Document Upload API
 *
 * POST /api/documents/upload - Upload document (PDF, Excel) to Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';
import { DocumentType } from '@prisma/client';
import { rateLimitJsonResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger'

// Next.js 15 App Router route segment config
export const maxDuration = 60; // Allow up to 60 seconds for upload
export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES: Record<string, DocumentType> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'EXCEL',
  'application/vnd.ms-excel': 'EXCEL',
  'text/csv': 'EXCEL',
  'text/plain': 'TEXT',
  'text/markdown': 'MARKDOWN',
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();

    const rateLimited = await rateLimitJsonResponse('documents:upload', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Document name is required' },
        { status: 400 }
      );
    }

    // Determine file type from MIME or extension
    let fileType: DocumentType | null = ALLOWED_MIME_TYPES[file.type] || null;

    if (!fileType) {
      // Try by extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') fileType = 'PDF';
      else if (['xlsx', 'xls', 'csv'].includes(ext || '')) fileType = 'EXCEL';
      else if (['md', 'markdown'].includes(ext || '')) fileType = 'MARKDOWN';
      else if (ext === 'txt') fileType = 'TEXT';
    }

    if (!fileType) {
      return NextResponse.json(
        { error: 'Unsupported file type. Allowed: PDF, Excel, CSV, Markdown, Text' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size: 50MB' },
        { status: 400 }
      );
    }

    // For TEXT and MARKDOWN, read content and store directly
    if (fileType === 'TEXT' || fileType === 'MARKDOWN') {
      const content = await file.text();
      const dataUrl = `data:text/plain;base64,${Buffer.from(content).toString('base64')}`;

      const document = await prisma.coachDocument.create({
        data: {
          coachId: user.id,
          name: name.trim(),
          description: description?.trim() || null,
          fileType,
          fileUrl: dataUrl,
          fileSize: file.size,
          mimeType: file.type || 'text/plain',
          processingStatus: 'PENDING',
          metadata: { rawContent: content },
        },
      });

      return NextResponse.json({
        success: true,
        document,
        message: 'Document uploaded. Use "Generera" to create embeddings.',
      });
    }

    // For PDF and EXCEL, upload to Supabase Storage
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'pdf';
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${user.id}/${timestamp}-${safeFileName}`;

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const supabase = createAdminSupabaseClient();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('coach-documents')
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      logger.error('Supabase document upload error', { userId: user.id }, uploadError)

      // Check for common errors
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
        return NextResponse.json(
          {
            error: 'Storage bucket "coach-documents" not found',
            details: 'Please create a bucket named "coach-documents" in Supabase Dashboard → Storage.',
            setupInstructions: [
              '1. Go to your Supabase project dashboard',
              '2. Navigate to Storage',
              '3. Click "New bucket"',
              '4. Name it "coach-documents"',
              '5. Set it as private (not public)',
              '6. Try uploading again',
            ]
          },
          { status: 500 }
        );
      }

      if (uploadError.message?.includes('exceeded') || uploadError.message?.includes('size')) {
        return NextResponse.json(
          { error: 'File too large for storage. Check bucket size limits.' },
          { status: 413 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to upload document', details: uploadError.message },
        { status: 500 }
      );
    }
    logger.info('Document uploaded to storage', { userId: user.id })

    // Create document record in database
    const document = await prisma.coachDocument.create({
      data: {
        coachId: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        fileType,
        fileUrl: uploadData.path, // Store the storage path
        fileSize: file.size,
        mimeType: file.type,
        processingStatus: 'PENDING',
      },
    });
    logger.info('Document record created', { userId: user.id, documentId: document.id })

    return NextResponse.json({
      success: true,
      document,
      uploadPath: uploadData.path,
      message: 'Document uploaded. Use "Generera" to create embeddings.',
    });
  } catch (error) {
    logger.error('Document upload error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: 'Failed to upload document',
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    );
  }
}
