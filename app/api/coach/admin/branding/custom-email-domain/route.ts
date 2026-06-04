// app/api/coach/admin/branding/custom-email-domain/route.ts
//
// Per-business sending domain via Resend's domain API.
//
// Flow:
//  POST   { domain }  → resend.domains.create → store id + DKIM/SPF records → return them
//  GET                → return current state from DB (no Resend call needed)
//  PUT                → resend.domains.get(id), refresh records + verified flag
//  DELETE             → resend.domains.remove(id), clear DB fields
//
// Server-side, both white-label tier and Resend ownership of the API key are
// enforced. The UI gates this behind `hasWhiteLabel` too — defense in depth.
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { Resend } from 'resend'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { getRequestedBusinessScope, requireBusinessAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { hasWhiteLabel } from '@/lib/branding/feature-gate'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Subdomains and apex domains. Same regex as the routing custom-domain endpoint.
const domainSchema = z.object({
  domain: z
    .string()
    .min(4)
    .max(253)
    .regex(
      /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z]{2,})+$/,
      'Invalid domain format',
    ),
})

// Refuse to even attempt to create a Resend domain on these — DKIM provisioning
// would fail because the customer doesn't control DNS, and we don't want one
// tenant's mistake (typo on signup) to look like a Resend outage.
const FORBIDDEN_DOMAINS = new Set([
  'trainomics.app',
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'yahoo.com',
  'yahoo.se',
  'icloud.com',
  'me.com',
  'protonmail.com',
  'proton.me',
])

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function ensureResend(locale: AppLocale) {
  if (!resend) {
    return NextResponse.json(
      {
        success: false,
        error: t(
          locale,
          'Email service not configured (missing RESEND_API_KEY)',
          'E-posttjänsten är inte konfigurerad (RESEND_API_KEY saknas)'
        ),
      },
      { status: 503 },
    )
  }
  return resend
}

// POST — register the domain with Resend and persist the DNS records.
export async function POST(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole(getRequestedBusinessScope(request))
    const locale = resolveRequestLocale(request, admin.language)
    const businessId = admin.businessId

    if (!(await hasWhiteLabel(businessId))) {
      return NextResponse.json(
        {
          success: false,
          error: t(
            locale,
            'White Label feature required for custom sending domain',
            'White Label krävs för egen avsändardomän'
          ),
        },
        { status: 403 },
      )
    }

    const r = ensureResend(locale)
    if (r instanceof NextResponse) return r

    const body = await request.json()
    const { domain } = domainSchema.parse(body)
    const normalized = domain.toLowerCase()

    if (FORBIDDEN_DOMAINS.has(normalized)) {
      return NextResponse.json(
        {
          success: false,
          error: t(
            locale,
            'This domain cannot be used as a sender. Use a domain you own.',
            'Den här domänen kan inte användas som avsändare. Använd en domän du själv äger.'
          ),
        },
        { status: 400 },
      )
    }

    // Refuse to overwrite an existing tenant's domain — `customEmailDomain` is unique
    const conflict = await prisma.business.findUnique({
      where: { customEmailDomain: normalized },
      select: { id: true },
    })
    if (conflict && conflict.id !== businessId) {
      return NextResponse.json(
        { success: false, error: t(locale, 'The domain is already used by another business', 'Domänen används redan av en annan verksamhet') },
        { status: 409 },
      )
    }

    // If we already have a Resend domain registered for this business under a
    // different name, remove it before creating the new one so the records
    // don't drift out of sync.
    const existing = await prisma.business.findUnique({
      where: { id: businessId },
      select: { resendDomainId: true, customEmailDomain: true },
    })
    if (existing?.resendDomainId && existing.customEmailDomain !== normalized) {
      await r.domains.remove(existing.resendDomainId).catch((err: unknown) => {
        logger.warn('Resend domain remove failed during replace', { businessId, err })
      })
    }

    const created = await r.domains.create({ name: normalized, region: 'eu-west-1' })
    if (created.error || !created.data) {
      return NextResponse.json(
        { success: false, error: created.error?.message || t(locale, 'Could not create domain in Resend', 'Kunde inte skapa domän hos Resend') },
        { status: 502 },
      )
    }

    const records = created.data.records ?? []

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        customEmailDomain: normalized,
        resendDomainId: created.data.id,
        customEmailVerified: false,
        customEmailVerifiedAt: null,
        customEmailDnsRecords: records as unknown as object,
      },
      select: {
        customEmailDomain: true,
        resendDomainId: true,
        customEmailVerified: true,
        customEmailDnsRecords: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    return handleApiError(error, 'POST /api/coach/admin/branding/custom-email-domain')
  }
}

// GET — return current state from the DB.
export async function GET(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole(getRequestedBusinessScope(request))
    const businessId = admin.businessId

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        customEmailDomain: true,
        resendDomainId: true,
        customEmailVerified: true,
        customEmailVerifiedAt: true,
        customEmailDnsRecords: true,
      },
    })

    return NextResponse.json({ success: true, data: business })
  } catch (error) {
    return handleApiError(error, 'GET /api/coach/admin/branding/custom-email-domain')
  }
}

// PUT — refresh records + verified flag from Resend.
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole(getRequestedBusinessScope(request))
    const locale = resolveRequestLocale(request, admin.language)
    const businessId = admin.businessId

    if (!(await hasWhiteLabel(businessId))) {
      return NextResponse.json(
        { success: false, error: t(locale, 'White Label feature required', 'White Label krävs') },
        { status: 403 },
      )
    }

    const r = ensureResend(locale)
    if (r instanceof NextResponse) return r

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { resendDomainId: true, customEmailDomain: true },
    })

    if (!business?.resendDomainId) {
      return NextResponse.json(
        { success: false, error: t(locale, 'No domain registered', 'Ingen domän registrerad') },
        { status: 400 },
      )
    }

    const fetched = await r.domains.get(business.resendDomainId)
    if (fetched.error || !fetched.data) {
      return NextResponse.json(
        { success: false, error: fetched.error?.message || t(locale, 'Could not fetch status from Resend', 'Kunde inte hämta status från Resend') },
        { status: 502 },
      )
    }

    const verified = fetched.data.status === 'verified'
    const records = fetched.data.records ?? []

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        customEmailVerified: verified,
        customEmailVerifiedAt: verified ? new Date() : null,
        customEmailDnsRecords: records as unknown as object,
      },
      select: {
        customEmailDomain: true,
        customEmailVerified: true,
        customEmailVerifiedAt: true,
        customEmailDnsRecords: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: { ...updated, status: fetched.data.status },
    })
  } catch (error) {
    return handleApiError(error, 'PUT /api/coach/admin/branding/custom-email-domain')
  }
}

// DELETE — remove from Resend and clear DB.
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole(getRequestedBusinessScope(request))
    const locale = resolveRequestLocale(request, admin.language)
    const businessId = admin.businessId

    const r = ensureResend(locale)
    if (r instanceof NextResponse) return r

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { resendDomainId: true },
    })

    if (business?.resendDomainId) {
      await r.domains.remove(business.resendDomainId).catch((err: unknown) => {
        // Resend will 404 if the domain is already gone — that's fine, we
        // still want to clear our local row.
        logger.warn('Resend domain remove failed (non-fatal)', { businessId, err })
      })
    }

    await prisma.business.update({
      where: { id: businessId },
      data: {
        customEmailDomain: null,
        resendDomainId: null,
        customEmailVerified: false,
        customEmailVerifiedAt: null,
        customEmailDnsRecords: Prisma.DbNull,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/coach/admin/branding/custom-email-domain')
  }
}
