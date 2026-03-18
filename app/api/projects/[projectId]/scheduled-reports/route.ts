import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params

  const project = await db.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  })

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const reports = await db.scheduledReport.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ reports })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params
  const body = await request.json()

  const project = await db.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  })

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Calculate next send time based on frequency
  const nextSendAt = calculateNextSendTime(
    body.frequency,
    body.dayOfWeek,
    body.dayOfMonth,
    body.hour
  )

  const report = await db.scheduledReport.create({
    data: {
      projectId,
      recipientEmail: body.recipientEmail,
      name: body.name,
      frequency: body.frequency,
      dayOfWeek: body.dayOfWeek,
      dayOfMonth: body.dayOfMonth,
      hour: body.hour || 9,
      includeChannels: body.includeChannels ? JSON.stringify(body.includeChannels) : null,
      nextSendAt,
      enabled: true,
    },
  })

  return NextResponse.json({ report }, { status: 201 })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params
  const { searchParams } = new URL(request.url)
  const reportId = searchParams.get('reportId')

  if (!reportId) {
    return NextResponse.json({ error: 'Missing reportId' }, { status: 400 })
  }

  const project = await db.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  })

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const report = await db.scheduledReport.findFirst({
    where: { id: reportId, projectId },
  })

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  await db.scheduledReport.delete({
    where: { id: reportId },
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params
  const { searchParams } = new URL(request.url)
  const reportId = searchParams.get('reportId')
  const body = await request.json()

  if (!reportId) {
    return NextResponse.json({ error: 'Missing reportId' }, { status: 400 })
  }

  const project = await db.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  })

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const report = await db.scheduledReport.findFirst({
    where: { id: reportId, projectId },
  })

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  // Recalculate next send time if frequency changed
  const nextSendAt = body.frequency || body.dayOfWeek !== undefined || body.dayOfMonth !== undefined || body.hour !== undefined
    ? calculateNextSendTime(
        body.frequency || report.frequency,
        body.dayOfWeek !== undefined ? body.dayOfWeek : report.dayOfWeek,
        body.dayOfMonth !== undefined ? body.dayOfMonth : report.dayOfMonth,
        body.hour || report.hour
      )
    : report.nextSendAt

  const updated = await db.scheduledReport.update({
    where: { id: reportId },
    data: {
      ...(body.enabled !== undefined && { enabled: body.enabled }),
      ...(body.hour !== undefined && { hour: body.hour }),
      ...(body.frequency && { frequency: body.frequency }),
      ...(body.dayOfWeek !== undefined && { dayOfWeek: body.dayOfWeek }),
      ...(body.dayOfMonth !== undefined && { dayOfMonth: body.dayOfMonth }),
      ...(body.includeChannels && { includeChannels: JSON.stringify(body.includeChannels) }),
      nextSendAt,
    },
  })

  return NextResponse.json({ report: updated })
}

function calculateNextSendTime(
  frequency: string,
  dayOfWeek?: number,
  dayOfMonth?: number,
  hour: number = 9
): Date {
  const now = new Date()
  const next = new Date(now)
  next.setHours(hour, 0, 0, 0)

  if (frequency === 'daily') {
    // If time already passed today, schedule for tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }
  } else if (frequency === 'weekly' && dayOfWeek !== undefined) {
    // Schedule for next occurrence of dayOfWeek
    const currentDay = next.getDay()
    let daysUntil = dayOfWeek - currentDay
    if (daysUntil <= 0 || (daysUntil === 0 && next <= now)) {
      daysUntil += 7
    }
    next.setDate(next.getDate() + daysUntil)
  } else if (frequency === 'monthly' && dayOfMonth !== undefined) {
    // Schedule for next occurrence of dayOfMonth
    next.setDate(dayOfMonth)
    if (next <= now) {
      next.setMonth(next.getMonth() + 1)
      next.setDate(dayOfMonth)
    }
  }

  return next
}
