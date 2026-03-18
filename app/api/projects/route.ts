import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const createProjectSchema = z.object({
  name: z.string().min(1),
  clientName: z.string().min(1),
  industry: z.string().optional(),
  website: z.string().optional(),
  brandColor: z.string().optional(),
  currency: z.string().default('USD'),
  timezone: z.string().default('UTC'),
  channels: z.array(z.string()),
  goals: z.record(z.string(), z.number()).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projects = await db.project.findMany({
    where: { userId: session.user.id },
    include: {
      channels: { where: { enabled: true } },
      _count: { select: { insights: true, campaigns: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(projects)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = createProjectSchema.parse(body)

    const project = await db.project.create({
      data: {
        name: data.name,
        clientName: data.clientName,
        industry: data.industry,
        website: data.website,
        brandColor: data.brandColor ?? '#6366f1',
        currency: data.currency,
        timezone: data.timezone,
        userId: session.user.id,
        channels: {
          create: data.channels.map(channel => ({ channel, enabled: true })),
        },
        goals: data.goals
          ? {
              create: Object.entries(data.goals).map(([metricKey, target]) => ({
                metricKey,
                target,
              })),
            }
          : undefined,
      },
      include: { channels: true, goals: true },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
