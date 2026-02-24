/**
 * Business AI Keys Management
 *
 * GET /api/coach/admin/ai-keys - Get AI key status per provider
 * POST /api/coach/admin/ai-keys - Validate, encrypt, and save business AI keys
 * DELETE /api/coach/admin/ai-keys - Remove all business AI keys
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAdminRole } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { encryptIfPresent } from '@/lib/user-api-keys'
import { handleApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'

interface SaveKeysRequest {
  anthropicKey?: string
  googleKey?: string
  openaiKey?: string
}

// GET - Get AI key status (not actual keys)
export async function GET() {
  try {
    const admin = await requireBusinessAdminRole()

    const aiKeys = await prisma.businessAiKeys.findUnique({
      where: { businessId: admin.businessId },
    })

    // Count members using business keys (members without their own valid keys)
    const totalMembers = await prisma.businessMember.count({
      where: { businessId: admin.businessId, isActive: true },
    })

    const membersWithOwnKeys = await prisma.businessMember.count({
      where: {
        businessId: admin.businessId,
        isActive: true,
        user: {
          apiKeys: {
            OR: [
              { anthropicKeyValid: true },
              { googleKeyValid: true },
              { openaiKeyValid: true },
            ],
          },
        },
      },
    })

    const keys = [
      {
        provider: 'anthropic',
        configured: !!aiKeys?.anthropicKeyEncrypted,
        valid: aiKeys?.anthropicKeyValid ?? false,
        lastValidated: aiKeys?.anthropicKeyLastValidated?.toISOString() ?? null,
      },
      {
        provider: 'google',
        configured: !!aiKeys?.googleKeyEncrypted,
        valid: aiKeys?.googleKeyValid ?? false,
        lastValidated: aiKeys?.googleKeyLastValidated?.toISOString() ?? null,
      },
      {
        provider: 'openai',
        configured: !!aiKeys?.openaiKeyEncrypted,
        valid: aiKeys?.openaiKeyValid ?? false,
        lastValidated: aiKeys?.openaiKeyLastValidated?.toISOString() ?? null,
      },
    ]

    return NextResponse.json({
      success: true,
      keys,
      membersUsingBusinessKeys: totalMembers - membersWithOwnKeys,
      totalMembers,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/coach/admin/ai-keys')
  }
}

// POST - Validate and save business AI keys
export async function POST(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole()

    const body: SaveKeysRequest = await request.json()
    const { anthropicKey, googleKey, openaiKey } = body

    if (!anthropicKey && !googleKey && !openaiKey) {
      return NextResponse.json(
        { error: 'At least one API key must be provided' },
        { status: 400 }
      )
    }

    const validationResults: Record<string, { valid: boolean; error?: string }> = {}

    // Validate OpenAI key
    if (openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey })
        await openai.models.list()
        validationResults.openai = { valid: true }
      } catch (error) {
        validationResults.openai = {
          valid: false,
          error: error instanceof Error ? error.message : 'Invalid OpenAI API key',
        }
      }
    }

    // Validate Anthropic key
    if (anthropicKey) {
      try {
        if (!anthropicKey.startsWith('sk-ant-')) {
          validationResults.anthropic = {
            valid: false,
            error: 'Invalid Anthropic API key format. Key should start with sk-ant-',
          }
        } else {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-6',
              max_tokens: 1,
              messages: [{ role: 'user', content: 'Hi' }],
            }),
          })

          if (response.ok || response.status === 200) {
            validationResults.anthropic = { valid: true }
          } else {
            const errorData = await response.json().catch(() => ({}))
            validationResults.anthropic = {
              valid: false,
              error: errorData.error?.message || `API returned status ${response.status}`,
            }
          }
        }
      } catch (error) {
        validationResults.anthropic = {
          valid: false,
          error: error instanceof Error ? error.message : 'Invalid Anthropic API key',
        }
      }
    }

    // Validate Google key
    if (googleKey) {
      try {
        const googleResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(googleKey)}`
        )

        if (googleResponse.ok) {
          validationResults.google = { valid: true }
        } else {
          const errorData = await googleResponse.json().catch(() => ({}))
          validationResults.google = {
            valid: false,
            error: errorData.error?.message || `API returned status ${googleResponse.status}`,
          }
        }
      } catch (error) {
        validationResults.google = {
          valid: false,
          error: error instanceof Error ? error.message : 'Invalid Google API key',
        }
      }
    }

    // Check for invalid keys
    const invalidKeys = Object.entries(validationResults)
      .filter(([, result]) => !result.valid)
      .map(([provider, result]) => ({ provider, error: result.error }))

    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { error: 'One or more API keys are invalid', invalidKeys },
        { status: 400 }
      )
    }

    // Encrypt keys
    const now = new Date()
    let anthropicKeyEncrypted: string | null | undefined
    let googleKeyEncrypted: string | null | undefined
    let openaiKeyEncrypted: string | null | undefined

    try {
      anthropicKeyEncrypted = encryptIfPresent(anthropicKey)
      googleKeyEncrypted = encryptIfPresent(googleKey)
      openaiKeyEncrypted = encryptIfPresent(openaiKey)
    } catch (e) {
      return NextResponse.json(
        {
          error: e instanceof Error
            ? e.message
            : 'Failed to encrypt API keys. Ensure API_KEY_ENCRYPTION_KEY is configured.',
        },
        { status: 500 }
      )
    }

    // Upsert business AI keys
    await prisma.businessAiKeys.upsert({
      where: { businessId: admin.businessId },
      create: {
        businessId: admin.businessId,
        anthropicKeyEncrypted: anthropicKeyEncrypted ?? null,
        googleKeyEncrypted: googleKeyEncrypted ?? null,
        openaiKeyEncrypted: openaiKeyEncrypted ?? null,
        anthropicKeyValid: anthropicKey ? validationResults.anthropic?.valid ?? false : false,
        googleKeyValid: googleKey ? validationResults.google?.valid ?? false : false,
        openaiKeyValid: openaiKey ? validationResults.openai?.valid ?? false : false,
        anthropicKeyLastValidated: anthropicKey ? now : null,
        googleKeyLastValidated: googleKey ? now : null,
        openaiKeyLastValidated: openaiKey ? now : null,
      },
      update: {
        ...(anthropicKey !== undefined
          ? {
              anthropicKeyEncrypted: anthropicKeyEncrypted ?? null,
              anthropicKeyValid: validationResults.anthropic?.valid ?? false,
              anthropicKeyLastValidated: now,
            }
          : {}),
        ...(googleKey !== undefined
          ? {
              googleKeyEncrypted: googleKeyEncrypted ?? null,
              googleKeyValid: validationResults.google?.valid ?? false,
              googleKeyLastValidated: now,
            }
          : {}),
        ...(openaiKey !== undefined
          ? {
              openaiKeyEncrypted: openaiKeyEncrypted ?? null,
              openaiKeyValid: validationResults.openai?.valid ?? false,
              openaiKeyLastValidated: now,
            }
          : {}),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'AI keys saved successfully',
      validation: validationResults,
    })
  } catch (error) {
    return handleApiError(error, 'POST /api/coach/admin/ai-keys')
  }
}

// DELETE - Remove all business AI keys
export async function DELETE() {
  try {
    const admin = await requireBusinessAdminRole()

    await prisma.businessAiKeys.deleteMany({
      where: { businessId: admin.businessId },
    })

    return NextResponse.json({
      success: true,
      message: 'All business AI keys removed',
    })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/coach/admin/ai-keys')
  }
}
