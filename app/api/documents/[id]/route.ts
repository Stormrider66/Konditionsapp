/**
 * Single Document API
 *
 * GET /api/documents/[id] - Get document details
 * PUT /api/documents/[id] - Update document metadata
 * DELETE /api/documents/[id] - Delete document and its chunks
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCoach } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

interface UpdateDocumentRequest {
  name?: string;
  description?: string;
}

// GET - Get single document with chunk info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    const document = await prisma.coachDocument.findFirst({
      where: {
        id,
        coachId: user.id,
      },
      include: {
        chunks: {
          select: {
            id: true,
            chunkIndex: true,
            tokenCount: true,
            metadata: true,
          },
          orderBy: { chunkIndex: 'asc' },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('Get document error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get document' },
      { status: 500 }
    );
  }
}

// PUT - Update document metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    const body: UpdateDocumentRequest = await request.json();
    const { name, description } = body;

    // Verify ownership
    const existing = await prisma.coachDocument.findFirst({
      where: {
        id,
        coachId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const document = await prisma.coachDocument.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('Update document error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

// DELETE - Delete document and all chunks
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach();
    const { id } = await params;

    // Verify ownership
    const existing = await prisma.coachDocument.findFirst({
      where: {
        id,
        coachId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete document (chunks cascade due to onDelete: Cascade)
    await prisma.coachDocument.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Document and all associated chunks deleted',
    });
  } catch (error) {
    console.error('Delete document error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
