/**
 * System Strength Templates API
 *
 * GET - List pre-built system strength templates
 *
 * These are hard-coded templates that don't require database storage.
 * Available to all users (coaches and self-service athletes).
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  STRENGTH_TEMPLATES,
  getTemplatesByCategory,
  getTemplatesForLevel,
  searchTemplates,
  getTemplateById,
} from '@/lib/training-engine/templates/strength-templates'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const level = searchParams.get('level') as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE' | null
    const query = searchParams.get('q')
    const templateId = searchParams.get('id')

    // Get specific template by ID
    if (templateId) {
      const template = getTemplateById(templateId)
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
    }

    let templates = STRENGTH_TEMPLATES

    // Filter by category
    if (category && category !== 'ALL') {
      templates = getTemplatesByCategory(
        category as 'RUNNER' | 'BEGINNER' | 'MARATHON' | 'INJURY_PREVENTION' | 'POWER' | 'MAINTENANCE'
      )
    }

    // Filter by level
    if (level) {
      templates = getTemplatesForLevel(level)
    }

    // Search by query
    if (query) {
      templates = searchTemplates(query)
    }

    // Return summary (without full exercise list for listing)
    return NextResponse.json({
      success: true,
      data: templates.map((t) => ({
        id: t.id,
        name: t.name,
        nameSv: t.nameSv,
        description: t.description,
        descriptionSv: t.descriptionSv,
        category: t.category,
        phase: t.phase,
        sessionsPerWeek: t.sessionsPerWeek,
        estimatedDuration: t.estimatedDuration,
        athleteLevel: t.athleteLevel,
        equipmentRequired: t.equipmentRequired,
        includesWarmup: t.includesWarmup,
        includesCore: t.includesCore,
        includesCooldown: t.includesCooldown,
        tags: t.tags,
        exerciseCount: t.exercises.length,
        isSystemTemplate: true,
      })),
      total: templates.length,
    })
  } catch (error) {
    console.error('Error fetching system strength templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}
