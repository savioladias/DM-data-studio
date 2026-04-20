import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
const adminEmail = 'saviola.dias@kilowott.com'

export async function sendJoinRequestNotification(request: {
  id: string
  name: string
  email: string
}) {
  const approveUrl = `${appUrl}/api/admin/requests/action?id=${request.id}&action=approve`
  const rejectUrl = `${appUrl}/api/admin/requests/action?id=${request.id}&action=reject`

  const result = await resend.emails.send({
    from: 'DM Data Studio <onboarding@resend.dev>',
    to: adminEmail,
    subject: `New join request from ${request.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>New Join Request</h2>
        <p><strong>${request.name}</strong> (${request.email}) has requested access to DM Data Studio.</p>
        <div style="margin: 32px 0; display: flex; gap: 12px;">
          <a href="${approveUrl}" style="background:#22c55e;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-right:12px;">
            ✓ Approve
          </a>
          <a href="${rejectUrl}" style="background:#ef4444;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
            ✗ Reject
          </a>
        </div>
        <p style="color:#888;font-size:12px;">Or manage requests in the admin panel.</p>
      </div>
    `,
  })
  console.log('[email] sendJoinRequestNotification result:', JSON.stringify(result))
}

export async function sendApprovalEmail(to: string, name: string) {
  await resend.emails.send({
    from: 'DM Data Studio <onboarding@resend.dev>',
    to,
    subject: 'Your access request has been approved',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>You're in, ${name}!</h2>
        <p>Your request to join DM Data Studio has been approved. You can now log in.</p>
        <a href="${appUrl}/login" style="background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
          Log in now
        </a>
      </div>
    `,
  })
}

export async function sendRejectionEmail(to: string, name: string) {
  await resend.emails.send({
    from: 'DM Data Studio <onboarding@resend.dev>',
    to,
    subject: 'Your access request was not approved',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Hi ${name},</h2>
        <p>Unfortunately your request to join DM Data Studio was not approved at this time.</p>
        <p>If you think this is a mistake, please contact your administrator.</p>
      </div>
    `,
  })
}
