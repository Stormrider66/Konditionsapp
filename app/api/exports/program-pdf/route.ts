/**
 * Server-side training program PDF export
 *
 * POST /api/exports/program-pdf
 *
 * Accepts a ParsedProgram (plus optional metadata) in the request
 * body and returns a streamed application/pdf response. Primary
 * consumer is ProgramExportButton, which falls back to the
 * existing client-side html2canvas generator if this route errors.
 *
 * Rationale: the client-side generator renders the whole program
 * to a hidden DOM node and captures it via html2canvas, which can
 * time out on large periodized programs over slow connections.
 * @react-pdf/renderer runs in Node without a browser and produces
 * a compact file directly from data.
 */

import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { renderToStream } from '@react-pdf/renderer'
import { requireCoach } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api/utils'
import { logger } from '@/lib/logger'
import { ProgramSchema } from '@/lib/ai/program-parser'
import { ProgramPDFDocument } from '@/lib/pdf/program-pdf-document'

export const runtime = 'nodejs'
export const maxDuration = 60

const requestSchema = z.object({
  program: ProgramSchema,
  athleteName: z.string().max(200).optional(),
  coachName: z.string().max(200).optional(),
  organization: z.string().max(200).optional(),
  startDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
    .optional(),
})

function safeFilename(name: string): string {
  const base = name
    .replace(/[åä]/gi, 'a')
    .replace(/[ö]/gi, 'o')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50)
  const date = new Date().toISOString().split('T')[0]
  return `Traningsprogram_${base || 'program'}_${date}.pdf`
}

export async function POST(request: NextRequest) {
  try {
    await requireCoach()

    const body = await request.json()
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ogiltig indata', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { program, athleteName, coachName, organization, startDate } =
      parsed.data

    const pdfStream = await renderToStream(
      React.createElement(ProgramPDFDocument, {
        program,
        athleteName,
        coachName,
        organization,
        startDate: startDate ? new Date(startDate) : undefined,
      })
    )

    logger.info('Server-side program PDF generated', {
      programName: program.name,
      phaseCount: program.phases.length,
    })

    // @react-pdf returns a Node Readable; convert to a Web ReadableStream
    // so we can hand it back via NextResponse.
    const webStream = new ReadableStream<Uint8Array>({
      start(controller) {
        pdfStream.on('data', (chunk: Buffer) => {
          controller.enqueue(
            new Uint8Array(
              chunk.buffer,
              chunk.byteOffset,
              chunk.byteLength
            )
          )
        })
        pdfStream.on('end', () => controller.close())
        pdfStream.on('error', (err: Error) => controller.error(err))
      },
      cancel() {
        pdfStream.destroy()
      },
    })

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename(program.name)}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
