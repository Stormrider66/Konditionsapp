// app/api/send-report-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { escapeHtml, sanitizeForEmail } from '@/lib/sanitize'
import { getRequestIp, rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { PLATFORM_NAME } from '@/lib/branding/types'
import { resolveEmailBranding } from '@/lib/email/branding'
import { emailLayout } from '@/lib/email/email-branding-types'

const resend = new Resend(process.env.RESEND_API_KEY)

// Maximum PDF size: 10MB
const MAX_PDF_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 emails per minute per IP (Redis-backed with in-memory fallback)
    const ip = getRequestIp(request)
    const rateLimited = await rateLimitJsonResponse('email:send-report', ip, {
      limit: 5,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    // Require COACH or ADMIN (athletes should not be able to send outbound emails)
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } })
    if (!dbUser || (dbUser.role !== 'COACH' && dbUser.role !== 'ADMIN')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { to, clientName, testDate, testLeader, organization, pdfBase64, customMessage } = body

    if (!to || !pdfBase64) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email address and PDF data are required',
        },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email address format',
        },
        { status: 400 }
      )
    }

    // Convert base64 to buffer and validate size
    const pdfBuffer = Buffer.from(pdfBase64, 'base64')
    if (pdfBuffer.length > MAX_PDF_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: 'PDF file size exceeds maximum allowed (10MB)',
        },
        { status: 400 }
      )
    }

    // Resolve email branding from coach's primary business
    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
      orderBy: { createdAt: 'asc' },
    })
    const emailBranding = await resolveEmailBranding(membership?.businessId ?? null)

    // Sanitize all user inputs for XSS protection
    const safeClientName = escapeHtml(clientName)
    const safeTestDate = escapeHtml(testDate)
    const safeTestLeader = escapeHtml(testLeader)
    const safeOrganization = escapeHtml(organization)
    const safeCustomMessage = customMessage ? sanitizeForEmail(customMessage) : ''

    // Format the email with branded layout
    const emailSubject = `Ditt konditionstest från ${safeOrganization}`

    const bodyContent = `
      <h2 style="color: #333; margin-top: 0;">Hej ${safeClientName},</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.6;">
        Här är resultatet från ditt konditionstest som genomfördes <strong>${safeTestDate}</strong>.
      </p>
      ${safeCustomMessage ? `<p style="color: #555; font-size: 16px;">${safeCustomMessage}</p>` : ''}
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <p style="margin: 5px 0; color: #555;"><strong>Testledare:</strong> ${safeTestLeader}</p>
        <p style="margin: 5px 0; color: #555;"><strong>Organisation:</strong> ${safeOrganization}</p>
      </div>
      <p style="color: #555; font-size: 16px;">Se bifogad PDF för din fullständiga rapport med resultat och träningszoner.</p>
      <p style="color: #555; margin-top: 30px;">
        Med vänliga hälsningar,<br/>
        <strong>${safeOrganization}</strong>
      </p>
    `

    const emailBody = emailLayout(emailBranding, 'Konditionstestrapport', bodyContent)

    // Sanitize filename
    const safeFilename = `Konditionstest_${safeClientName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')}_${safeTestDate.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`

    // Send email using Resend
    const senderName = emailBranding.senderName || PLATFORM_NAME
    const { data, error } = await resend.emails.send({
      from: `${senderName} <noreply@trainomics.se>`,
      to: [to],
      subject: emailSubject,
      html: emailBody,
      attachments: [
        {
          filename: safeFilename,
          content: pdfBuffer,
        },
      ],
    })

    if (error) {
      logger.error('Resend error', {}, error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Email sent successfully',
    })
  } catch (error: unknown) {
    logger.error('Error sending email', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send email',
      },
      { status: 500 }
    )
  }
}
