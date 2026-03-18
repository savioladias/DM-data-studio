import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Verify cron secret to prevent unauthorized calls
const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key'

let resend: any = null

export async function POST(request: Request) {
  // Verify secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Lazy initialize Resend
    if (!resend && process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend')
      resend = new Resend(process.env.RESEND_API_KEY)
    }

    const now = new Date()

    // Find all scheduled reports that should be sent
    const reportsToSend = await db.scheduledReport.findMany({
      where: {
        enabled: true,
        nextSendAt: {
          lte: now,
        },
      },
      include: {
        project: true,
      },
    })

    if (reportsToSend.length === 0) {
      return NextResponse.json({ message: 'No reports to send', count: 0 })
    }

    const results = []

    for (const report of reportsToSend) {
      try {
        // Skip if Resend is not available
        if (!resend) {
          results.push({ id: report.id, status: 'skipped', reason: 'Resend API not configured' })
          continue
        }

        // Fetch project metrics
        const channels = report.includeChannels ? JSON.parse(report.includeChannels) : []

        // Build email content
        const emailContent = await generateReportEmail(report.project, channels)

        // Send email via Resend
        await resend.emails.send({
          from: 'reports@dm-data-studio.com',
          to: report.recipientEmail,
          subject: `${report.project.name} — ${report.name} Report`,
          html: emailContent,
        })

        // Calculate next send time
        const nextSendAt = calculateNextSendTime(
          report.frequency,
          report.dayOfWeek,
          report.dayOfMonth,
          report.hour
        )

        // Update last sent and next send times
        await db.scheduledReport.update({
          where: { id: report.id },
          data: {
            lastSentAt: now,
            nextSendAt,
          },
        })

        results.push({ id: report.id, status: 'sent' })
      } catch (error) {
        console.error(`Failed to send report ${report.id}:`, error)
        results.push({
          id: report.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      message: 'Report sending completed',
      count: results.length,
      results,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function generateReportEmail(
  project: any,
  channels: string[]
): Promise<string> {
  // Fetch latest metrics for included channels
  let metricsHtml = '<p style="color: #666;">No metric data available</p>'

  if (channels.length > 0) {
    // Build a simple HTML report
    metricsHtml = `
      <div style="margin-top: 20px;">
        <h3 style="color: #333; margin-bottom: 10px;">Included Channels</h3>
        <ul style="color: #666; line-height: 1.8;">
          ${channels.map(ch => `<li>${ch}</li>`).join('')}
        </ul>
      </div>
    `
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${project.name} Report</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
          .header h1 { margin: 0; }
          .content { margin-top: 20px; background: #f9f9f9; padding: 20px; border-radius: 8px; }
          .metric { margin: 15px 0; padding-bottom: 15px; border-bottom: 1px solid #ddd; }
          .metric:last-child { border-bottom: none; }
          .metric-label { font-size: 14px; color: #666; }
          .metric-value { font-size: 24px; font-weight: bold; color: #333; }
          .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${project.name}</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Automated Performance Report</p>
          </div>

          <div class="content">
            <p>Hello,</p>
            <p>Your automated report for <strong>${project.name}</strong> is ready. Here's what happened recently:</p>

            ${metricsHtml}

            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://dm-data-studio.com'}/projects/${project.id}" class="cta-button">
              View Full Dashboard
            </a>
          </div>

          <div class="footer">
            <p>This is an automated report from DM Data Studio</p>
            <p>Report sent to: ${project.name}</p>
          </div>
        </div>
      </body>
    </html>
  `
}

function calculateNextSendTime(
  frequency: string,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null,
  hour: number = 9
): Date {
  const next = new Date()
  next.setHours(hour, 0, 0, 0)

  if (frequency === 'daily') {
    next.setDate(next.getDate() + 1)
  } else if (frequency === 'weekly' && dayOfWeek !== null && dayOfWeek !== undefined) {
    const currentDay = next.getDay()
    let daysUntil = dayOfWeek - currentDay
    if (daysUntil <= 0) daysUntil += 7
    next.setDate(next.getDate() + daysUntil)
  } else if (frequency === 'monthly' && dayOfMonth !== null && dayOfMonth !== undefined) {
    next.setMonth(next.getMonth() + 1)
    next.setDate(dayOfMonth)
  }

  return next
}
