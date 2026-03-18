import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface ParsedRow {
  date: string
  metricKey: string
  value: number
}

function parseCSV(content: string, channel: string): ParsedRow[] {
  const lines = content.trim().split('\n')
  const rows: ParsedRow[] = []

  for (const line of lines) {
    const parts = line.trim().split(',')
    if (parts.length !== 3) continue

    const [date, metricKey, valueStr] = parts
    const value = parseFloat(valueStr)

    if (!date || !metricKey || isNaN(value)) continue

    rows.push({ date, metricKey, value })
  }

  return rows
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params
    const formData = await req.formData()
    const file = formData.get('file') as File
    const channel = formData.get('channel') as string

    if (!file || !channel) {
      return NextResponse.json(
        { error: 'File and channel required' },
        { status: 400 }
      )
    }

    // Verify user owns this project
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    })

    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Parse CSV
    const content = await file.text()
    const rows = parseCSV(content, channel)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid rows in CSV' },
        { status: 400 }
      )
    }

    // Upsert metrics
    for (const row of rows) {
      const date = new Date(row.date)
      if (isNaN(date.getTime())) continue

      // Check if metric exists for this date
      const existing = await db.metric.findFirst({
        where: {
          projectId,
          channel,
          metricKey: row.metricKey,
          date,
        },
      })

      if (existing) {
        // Update existing
        await db.metric.update({
          where: { id: existing.id },
          data: { value: row.value },
        })
      } else {
        // Create new
        await db.metric.create({
          data: {
            projectId,
            channel,
            metricKey: row.metricKey,
            value: row.value,
            date,
          },
        })
      }
    }

    // Record upload
    const csvUpload = await db.csvUpload.create({
      data: {
        projectId,
        channel,
        filename: file.name,
        rowCount: rows.length,
      },
    })

    return NextResponse.json({
      success: true,
      uploadId: csvUpload.id,
      rowCount: rows.length,
    })
  } catch (error) {
    console.error('CSV upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process CSV' },
      { status: 500 }
    )
  }
}
