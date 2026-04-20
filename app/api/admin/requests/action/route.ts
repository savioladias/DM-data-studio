import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendApprovalEmail, sendRejectionEmail } from '@/lib/email'

// One-click approve/reject from email link — no session required
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const action = searchParams.get('action')

  if (!id || !['approve', 'reject'].includes(action ?? '')) {
    return new NextResponse('Invalid request', { status: 400 })
  }

  const joinRequest = await db.joinRequest.findUnique({ where: { id } })

  if (!joinRequest) {
    return new NextResponse('Request not found', { status: 404 })
  }

  if (joinRequest.status !== 'pending') {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;max-width:480px;margin:0 auto">
        <h2>Already processed</h2>
        <p>This request has already been ${joinRequest.status}.</p>
      </body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    )
  }

  if (action === 'approve') {
    // Create the user account
    await db.user.create({
      data: {
        name: joinRequest.name,
        email: joinRequest.email,
        password: joinRequest.password,
      },
    })
    await db.joinRequest.update({ where: { id }, data: { status: 'approved' } })
    await sendApprovalEmail(joinRequest.email, joinRequest.name)

    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;max-width:480px;margin:0 auto">
        <h2 style="color:#22c55e">✓ Approved</h2>
        <p><strong>${joinRequest.name}</strong> (${joinRequest.email}) has been approved and notified.</p>
      </body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    )
  } else {
    await db.joinRequest.update({ where: { id }, data: { status: 'rejected' } })
    await sendRejectionEmail(joinRequest.email, joinRequest.name)

    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;max-width:480px;margin:0 auto">
        <h2 style="color:#ef4444">✗ Rejected</h2>
        <p><strong>${joinRequest.name}</strong> (${joinRequest.email}) has been rejected and notified.</p>
      </body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    )
  }
}
