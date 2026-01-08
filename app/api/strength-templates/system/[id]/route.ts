/**
 * Single System Strength Template API
 *
 * GET - Get a specific system template by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTemplateById } from '@/lib/training-engine/templates/strength-templates'
import { logError } from '@/lib/logger-console'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const template = getTemplateById(id)

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: template,
    })
  } catch (error) {
    logError('Error fetching system template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}
