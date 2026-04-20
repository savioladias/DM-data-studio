import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendRejectionEmail } from '@/lib/email'
import { z } from 'zod'

const rejectSchema = z.object({
  requestId: z.string(),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is admin
    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { requestId } = rejectSchema.parse(body)

    // Find and update the join request
    const joinRequest = await db.joinRequest.findUnique({ where: { id: requestId } })
    if (!joinRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    await db.joinRequest.update({
      where: { id: requestId },
      data: { status: 'rejected' },
    })

    // TODO: Send rejection email to user
    await sendRejectionEmail(joinRequest.email, joinRequest.name)

    return NextResponse.json({ message: 'Request rejected' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
