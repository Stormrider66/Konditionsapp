// app/api/send-report-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
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

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64')

    // Format the email
    const emailSubject = `Ditt konditionstest från ${organization}`
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">Konditionstestrapport</h2>

        <p>Hej ${clientName},</p>

        <p>Här är resultatet från ditt konditionstest som genomfördes <strong>${testDate}</strong>.</p>

        ${customMessage ? `<p>${customMessage}</p>` : ''}

        <div style="background-color: #f7f7f7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Testledare:</strong> ${testLeader}</p>
          <p style="margin: 5px 0;"><strong>Organisation:</strong> ${organization}</p>
        </div>

        <p>Se bifogad PDF för din fullständiga rapport med resultat och träningszoner.</p>

        <p style="margin-top: 30px;">Med vänliga hälsningar,<br/>
        <strong>${organization}</strong></p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;"/>

        <p style="font-size: 12px; color: #666;">
          Detta mail är skickat från ${organization}s konditionstestsystem.
        </p>
      </div>
    `

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Star by Thomson <konditionstest@thomsons.se>',
      to: [to],
      subject: emailSubject,
      html: emailBody,
      attachments: [
        {
          filename: `Konditionstest_${clientName.replace(/\s+/g, '_')}_${testDate}.pdf`,
          content: pdfBuffer,
        },
      ],
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email',
          details: error,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Email sent successfully',
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
