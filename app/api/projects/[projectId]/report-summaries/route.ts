import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - load all saved summaries for a project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params

  const insights = await db.insight.findMany({
    where: {
      projectId,
      type: { in: ['executive_summary', 'conclusions', 'channel_summary'] },
    },
    select: { id: true, type: true, channel: true, body: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  // Return as a map: { executive_summary: '...', conclusions: '...', channel_GOOGLE_ADS: '...' }
  const summaries: Record<string, string> = {}
  for (const insight of insights) {
    const key = insight.channel ? `channel_${insight.channel}` : insight.type
    if (!summaries[key]) summaries[key] = insight.body // most recent wins
  }

  return NextResponse.json({ summaries })
}

// POST - save a summary
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params
  const { type, channel, body } = await request.json()

  if (!type || !body) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Upsert — update existing or create new
  const existing = await db.insight.findFirst({
    where: { projectId, type, channel: channel ?? null },
  })

  if (existing) {
    await db.insight.update({
      where: { id: existing.id },
      data: { body },
    })
  } else {
    await db.insight.create({
      data: {
        projectId,
        type,
        channel: channel ?? null,
        title: channel ? `${channel} summary` : type.replace('_', ' '),
        body,
      },
    })
  }

  return NextResponse.json({ ok: true })
}
