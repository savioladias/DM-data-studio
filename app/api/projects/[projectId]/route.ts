import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params

  const project = await db.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    include: {
      channels: true,
      insights: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(project)
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
  const body = await request.json()

  const project = await db.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  })

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updateData: any = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.clientName !== undefined) updateData.clientName = body.clientName
  if (body.industry !== undefined) updateData.industry = body.industry
  if (body.website !== undefined) updateData.website = body.website
  if (body.brandColor !== undefined) updateData.brandColor = body.brandColor
  if (body.currency !== undefined) updateData.currency = body.currency
  if (body.timezone !== undefined) updateData.timezone = body.timezone
  if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl
  if (body.zohoProjectId !== undefined) updateData.zohoProjectId = body.zohoProjectId

  const updated = await db.project.update({
    where: { id: projectId },
    data: updateData,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
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

  await db.project.delete({ where: { id: projectId } })

  return NextResponse.json({ success: true })
}
