/**
 * Email sending via Resend.
 *
 * When RESEND_API_KEY is not set, logs to console instead (dev mode).
 */

import { Resend } from 'resend'

let resendClient: Resend | null = null

function getResend(): Resend | null {
  if (resendClient) return resendClient

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null

  resendClient = new Resend(apiKey)
  return resendClient
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_ADDRESS || 'noreply@mcar.example.com'
}

// ── Email templates ────────────────────────────────────────────────────────────

interface BookingConfirmationData {
  customerName: string
  customerEmail: string
  reg: string
  make: string
  model: string
  year: number
  appointmentType: string
  appointmentDate: string
  estimatedMin: number
  estimatedMax: number
}

interface AdminNewLeadData {
  leadId: string
  sellerName: string
  sellerEmail: string
  sellerPhone: string
  reg: string
  make: string
  model: string
  estimatedMin: number
  estimatedMax: number
}

/**
 * Send booking confirmation email to the customer.
 */
export async function sendBookingConfirmation(data: BookingConfirmationData): Promise<void> {
  const resend = getResend()

  const subject = `Booking Confirmed - ${data.reg}`
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Booking Confirmed</h2>
      <p>Hi ${data.customerName},</p>
      <p>Your appointment has been booked. Here are the details:</p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #666;">Vehicle</td><td style="padding: 8px 0; font-weight: 600;">${data.make} ${data.model} (${data.year})</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Registration</td><td style="padding: 8px 0; font-weight: 600;">${data.reg}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Appointment</td><td style="padding: 8px 0; font-weight: 600;">${data.appointmentType === 'video' ? 'Video Call' : 'In Person'}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Date</td><td style="padding: 8px 0; font-weight: 600;">${data.appointmentDate}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Estimated Offer</td><td style="padding: 8px 0; font-weight: 600; color: #16a34a;">GBP ${data.estimatedMin.toLocaleString()} - GBP ${data.estimatedMax.toLocaleString()}</td></tr>
      </table>

      <p>We'll be in touch shortly to confirm the final details.</p>
      <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
    </div>
  `

  if (!resend) {
    console.log('[email] DEV MODE - Booking confirmation:', { to: data.customerEmail, subject })
    return
  }

  try {
    await resend.emails.send({
      from: getFromAddress(),
      to: data.customerEmail,
      subject,
      html,
    })
  } catch (err) {
    console.error('[email] Failed to send booking confirmation:', err)
  }
}

/**
 * Send admin alert when a new lead is created.
 */
export async function sendAdminNewLeadAlert(data: AdminNewLeadData): Promise<void> {
  const resend = getResend()
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || getFromAddress()

  const subject = `New Lead: ${data.reg} - ${data.sellerName}`
  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">New Lead Created</h2>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #666;">Lead ID</td><td style="padding: 8px 0; font-weight: 600;">${data.leadId}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Seller</td><td style="padding: 8px 0; font-weight: 600;">${data.sellerName}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;">${data.sellerEmail}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Phone</td><td style="padding: 8px 0;">${data.sellerPhone}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Vehicle</td><td style="padding: 8px 0; font-weight: 600;">${data.make} ${data.model}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Registration</td><td style="padding: 8px 0; font-weight: 600;">${data.reg}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Estimated Offer</td><td style="padding: 8px 0; font-weight: 600; color: #16a34a;">GBP ${data.estimatedMin.toLocaleString()} - GBP ${data.estimatedMax.toLocaleString()}</td></tr>
      </table>

      <p><a href="https://mcarweb.vercel.app/admin/leads/${data.leadId}" style="color: #2563eb;">View in Admin Panel</a></p>
    </div>
  `

  if (!resend) {
    console.log('[email] DEV MODE - Admin alert:', { to: adminEmail, subject })
    return
  }

  try {
    await resend.emails.send({
      from: getFromAddress(),
      to: adminEmail,
      subject,
      html,
    })
  } catch (err) {
    console.error('[email] Failed to send admin alert:', err)
  }
}
