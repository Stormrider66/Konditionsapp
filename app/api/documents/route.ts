/**
 * Documents API
 *
 * GET /api/documents - List coach's documents
 * POST /api/documents - Create/upload a new document
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { DocumentType } from '@prisma/client';

interface CreateDocumentRequest {
  name: string;
  description?: string;
  fileType: DocumentType;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  content?: string; // For text/markdown documents
}

// GET - List all documents for coach
export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach();

    const { searchParams } = new URL(request.url);
    const fileType = searchParams.get('fileType') as DocumentType | null;
    const status = searchParams.get('status');
    const includeSystem = searchParams.get('includeSystem') === 'true';

    const documents = await prisma.coachDocument.findMany({
      where: {
        coachId: user.id,
        ...(fileType ? { fileType } : {}),
        ...(status ? { processingStatus: status } : {}),
        ...(includeSystem ? {} : { isSystem: false }),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        fileType: true,
        fileUrl: true,
        fileSize: true,
        mimeType: true,
        isSystem: true,
        processingStatus: true,
        processingError: true,
        chunkCount: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            chunks: true,
          },
        },
      },
    });

    // Transform to include chunk count
    const transformedDocuments = documents.map(doc => ({
      ...doc,
      chunkCount: doc.chunkCount ?? doc._count?.chunks ?? 0,
      _count: undefined,
    }));

    return NextResponse.json({
      success: true,
      documents: transformedDocuments,
      count: transformedDocuments.length,
    });
  } catch (error) {
    console.error('List documents error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to list documents' },
      { status: 500 }
    );
  }
}

// POST - Create a new document record
export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach();

    const body: CreateDocumentRequest = await request.json();
    const { name, description, fileType, fileUrl, fileSize, mimeType, content } =
      body;

    if (!name || !fileType || !fileUrl) {
      return NextResponse.json(
        { error: 'Name, fileType, and fileUrl are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes: DocumentType[] = ['PDF', 'EXCEL', 'MARKDOWN', 'VIDEO', 'TEXT'];
    if (!validTypes.includes(fileType)) {
      return NextResponse.json(
        { error: `Invalid fileType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const document = await prisma.coachDocument.create({
      data: {
        coachId: user.id,
        name,
        description,
        fileType,
        fileUrl,
        fileSize,
        mimeType,
        processingStatus: 'PENDING',
        metadata: content ? { rawContent: content } : undefined,
      },
    });

    return NextResponse.json(
      {
        success: true,
        document,
        message: 'Document created. Use /api/documents/[id]/embed to generate embeddings.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create document error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}
