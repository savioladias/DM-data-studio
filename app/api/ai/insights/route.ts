import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateMetricInsight, generateChannelSummary, generateRecommendations, generateAnswerToQuestion, generateExecutiveSummary, generateConclusions } from '@/lib/ai'
import { z } from 'zod'

const insightSchema = z.object({
  projectId: z.string(),
  type: z.enum(['metric', 'channel', 'channel_analysis', 'recommendations', 'executive_summary', 'conclusions']),
  channel: z.string().optional(),
  metricKey: z.string().optional(),
  data: z.any(),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Claude API key is optional - will return a placeholder message if not set

  try {
    const body = await request.json()
    const { projectId, type, channel, metricKey, data } = insightSchema.parse(body)

    const project = await db.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: session.user.id },
          { projectUsers: { some: { userId: session.user.id } } },
        ],
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let insightText = ''

    if (type === 'metric' && data) {
      insightText = await generateMetricInsight(data)
    } else if ((type === 'channel' || type === 'channel_analysis') && data) {
      if (data.question) {
        insightText = await generateAnswerToQuestion(project.name, data)
      } else {
        // Normalize metrics shape — channel_analysis uses different field names
        const normalizedData = {
          ...data,
          metrics: (data.metrics || []).map((m: any) => ({
            metricName: m.metricName || m.name || m.label,
            currentValue: m.currentValue ?? m.value,
            previousValue: m.previousValue,
            deltaPercent: m.deltaPercent ?? m.changePercent,
            channel: m.channel || data.channel,
            unit: m.unit,
            trend: m.trend,
          })),
          dateRange: data.dateRange || 'current period',
        }
        insightText = await generateChannelSummary({ ...normalizedData, projectName: project.name })
      }
    } else if (type === 'recommendations' && data) {
      const recommendations = await generateRecommendations(project.name, data)
      // Store recommendations as insights
      for (const rec of recommendations) {
        await db.insight.create({
          data: {
            projectId,
            channel,
            type: 'recommendation',
            title: rec.title,
            body: rec.body,
            severity: rec.priority === 'high' ? 'critical' : rec.priority === 'medium' ? 'warning' : 'info',
            data: JSON.stringify(rec),
          },
        })
      }
      return NextResponse.json({ recommendations })
    } else if (type === 'executive_summary' && data) {
      insightText = await generateExecutiveSummary(project.name, data)
    } else if (type === 'conclusions' && data) {
      insightText = await generateConclusions(project.name, data)
    }

    // Store insight in DB
    if (insightText && (channel || metricKey)) {
      await db.insight.create({
        data: {
          projectId,
          channel,
          metricKey,
          type: type === 'metric' ? 'summary' : 'summary',
          title: `${channel ?? metricKey} analysis`,
          body: insightText,
        },
      })
    }

    return NextResponse.json({ insight: insightText })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('AI insight error:', errorMsg)
    return NextResponse.json({ error: `Failed to generate insight: ${errorMsg}` }, { status: 500 })
  }
}
