import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: Request) {
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

    // Fetch all join requests excluding the admin's own
    const joinRequests = await db.joinRequest.findMany({
      where: { email: { not: user.email } },
      select: { id: true, name: true, email: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ requests: joinRequests })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
