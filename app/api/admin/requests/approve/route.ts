import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const approveSchema = z.object({
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
    const { requestId } = approveSchema.parse(body)

    // Find the join request
    const joinRequest = await db.joinRequest.findUnique({ where: { id: requestId } })
    if (!joinRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Create the user account
    const newUser = await db.user.create({
      data: {
        name: joinRequest.name,
        email: joinRequest.email,
        password: joinRequest.password,
      },
      select: { id: true, name: true, email: true },
    })

    // Update join request status
    await db.joinRequest.update({
      where: { id: requestId },
      data: { status: 'approved' },
    })

    // TODO: Send approval email to user

    return NextResponse.json({ message: 'Request approved', user: newUser })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
