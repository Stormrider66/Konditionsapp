// app/api/send-report-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { escapeHtml, sanitizeForEmail } from '@/lib/sanitize'
import { getRequestIp, rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

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

    // Sanitize all user inputs for XSS protection
    const safeClientName = escapeHtml(clientName)
    const safeTestDate = escapeHtml(testDate)
    const safeTestLeader = escapeHtml(testLeader)
    const safeOrganization = escapeHtml(organization)
    const safeCustomMessage = customMessage ? sanitizeForEmail(customMessage) : ''

    // Format the email with sanitized content
    const emailSubject = `Ditt konditionstest från ${safeOrganization}`
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">Konditionstestrapport</h2>

        <p>Hej ${safeClientName},</p>

        <p>Här är resultatet från ditt konditionstest som genomfördes <strong>${safeTestDate}</strong>.</p>

        ${safeCustomMessage ? `<p>${safeCustomMessage}</p>` : ''}

        <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Testledare:</strong> ${safeTestLeader}</p>
          <p style="margin: 5px 0;"><strong>Organisation:</strong> ${safeOrganization}</p>
        </div>

        <p>Se bifogad PDF för din fullständiga rapport med resultat och träningszoner.</p>

        <p style="margin-top: 30px;">Med vänliga hälsningar,<br/>
        <strong>${safeOrganization}</strong></p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;"/>

        <p style="font-size: 12px; color: #666;">
          Detta mail är skickat från ${safeOrganization}s konditionstestsystem.
        </p>
      </div>
    `

    // Sanitize filename
    const safeFilename = `Konditionstest_${safeClientName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')}_${safeTestDate.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Star by Thomson <konditionstest@thomsons.se>',
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
