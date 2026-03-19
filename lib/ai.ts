import { GoogleGenerativeAI } from '@google/generative-ai'

const client = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')

export interface MetricContext {
  metricName: string
  currentValue: number | string
  previousValue?: number | string
  deltaPercent?: number
  channel: string
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  historicalData?: { date: string; value: number }[]
}

export interface ChannelContext {
  channel: string
  projectName: string
  metrics: MetricContext[]
  dateRange: string
}

export interface Recommendation {
  title: string
  body: string
  priority: 'high' | 'medium' | 'low'
  metric?: string
}

export interface Anomaly {
  metricKey: string
  title: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  value: number
  expectedRange?: { min: number; max: number }
}

export async function generateMetricInsight(metric: MetricContext): Promise<string> {
  try {
    const delta = metric.deltaPercent !== undefined
      ? `${metric.deltaPercent > 0 ? '+' : ''}${metric.deltaPercent.toFixed(1)}% vs previous period`
      : 'no comparison data available'

    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(`You are a marketing analytics expert. Write a single, concise insight (1-2 sentences, max 30 words) about this metric for a client dashboard.

Metric: ${metric.metricName}
Channel: ${metric.channel}
Current value: ${metric.currentValue}${metric.unit ? ' ' + metric.unit : ''}
Change: ${delta}
Trend: ${metric.trend || 'unknown'}

Be specific, direct, and actionable. No fluff. Start with the most important observation.`)

    return result.response.text()
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Gemini API error: ${msg}`)
  }
}

export async function generateChannelSummary(context: ChannelContext): Promise<string> {
  try {
    const metricsText = context.metrics
      .map(m => `- ${m.metricName}: ${m.currentValue}${m.unit ? ' ' + m.unit : ''} (${m.deltaPercent !== undefined ? (m.deltaPercent > 0 ? '+' : '') + m.deltaPercent.toFixed(1) + '%' : 'no change data'})`)
      .join('\n')

    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(`You are a marketing analytics expert writing a performance summary for a client report.

Project: ${context.projectName}
Channel: ${context.channel}
Period: ${context.dateRange}

Metrics:
${metricsText}

Write a 3-4 sentence summary covering: overall performance, the standout positive, the main concern, and one specific recommended action. Be concrete and data-driven. No generic marketing speak.

End with a brief 'Recommended Next Steps:' section listing 2-3 specific, actionable recommendations based on this data.`)

    return result.response.text()
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Gemini API error: ${msg}`)
  }
}

export async function generateAnswerToQuestion(
  projectName: string,
  data: { channel: string; dateRange: string; metrics: MetricContext[]; question: string }
): Promise<string> {
  try {
    const metricsText = data.metrics
      .map(m => `- ${m.metricName} (${m.channel}): ${m.currentValue}${m.unit ? ' ' + m.unit : ''} (${m.deltaPercent !== undefined ? (m.deltaPercent > 0 ? '+' : '') + m.deltaPercent.toFixed(1) + '%' : 'no change'})`)
      .join('\n')

    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(`You are a marketing analytics expert answering questions about marketing performance data.

Project: ${projectName}
Period: ${data.dateRange}

Current Metrics:
${metricsText || 'No metrics available'}

User Question: ${data.question}

Provide a concise, data-driven answer (2-4 sentences). Reference specific metrics from the data above when relevant. Be direct and actionable.`)

    return result.response.text()
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Gemini API error: ${msg}`)
  }
}

export async function generateRecommendations(
  projectName: string,
  channelSummaries: { channel: string; metrics: MetricContext[] }[]
): Promise<Recommendation[]> {
  try {
    const summaryText = channelSummaries
      .map(c => {
        const metrics = c.metrics
          .map(m => `  ${m.metricName}: ${m.currentValue} (${m.deltaPercent !== undefined ? (m.deltaPercent > 0 ? '+' : '') + m.deltaPercent.toFixed(1) + '%' : 'flat'})`)
          .join('\n')
        return `${c.channel}:\n${metrics}`
      })
      .join('\n\n')

    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(`You are a marketing strategist. Based on this data for "${projectName}", provide exactly 3 prioritised recommendations in JSON format.

Data:
${summaryText}

Return ONLY valid JSON array:
[
  {
    "title": "Short action title",
    "body": "2-3 sentence explanation with specific data points",
    "priority": "high|medium|low",
    "metric": "the key metric this addresses"
  }
]

No markdown, no extra text, just the JSON array.`)

    try {
      const text = result.response.text()
      return JSON.parse(text) as Recommendation[]
    } catch {
      return []
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Gemini API error: ${msg}`)
  }
}

export async function generateExecutiveSummary(
  projectName: string,
  data: { metrics: MetricContext[] }
): Promise<string> {
  try {
    const metricsText = data.metrics
      .map(m => `- ${m.metricName} (${m.channel}): ${m.currentValue}${m.unit ? ' ' + m.unit : ''} (${m.deltaPercent !== undefined ? (m.deltaPercent > 0 ? '+' : '') + m.deltaPercent.toFixed(1) + '%' : 'no change'})`)
      .join('\n')

    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(`You are a marketing analytics expert writing an executive summary for a client report.

Project: ${projectName}

Current Performance Metrics:
${metricsText}

Write a 3-4 sentence executive summary that:
1. Provides an overview of overall performance across channels
2. Highlights the key achievements and successes
3. Identifies main challenges or areas needing attention
4. Sets the stage for detailed analysis below

Be professional, data-driven, and concise. Focus on what matters most to the client.`)

    return result.response.text()
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Gemini API error: ${msg}`)
  }
}

export async function generateConclusions(
  projectName: string,
  data: { metrics: MetricContext[] }
): Promise<string> {
  try {
    const metricsText = data.metrics
      .map(m => `- ${m.metricName} (${m.channel}): ${m.currentValue}${m.unit ? ' ' + m.unit : ''} (${m.deltaPercent !== undefined ? (m.deltaPercent > 0 ? '+' : '') + m.deltaPercent.toFixed(1) + '%' : 'no change'})`)
      .join('\n')

    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(`You are a marketing strategist writing conclusions and recommendations for a client report.

Project: ${projectName}

Current Performance Metrics:
${metricsText}

Write conclusions and recommendations that:
1. Summarize the key findings and patterns observed
2. Explain what the data means for the business
3. Provide 3-4 specific, actionable recommendations based on the data
4. Include next steps and priority areas for focus

Be strategic, specific, and actionable. Reference metrics when relevant.`)

    return result.response.text()
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`Gemini API error: ${msg}`)
  }
}

export async function detectAnomalies(
  metrics: { key: string; values: number[]; current: number; label: string }[]
): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = []

  for (const metric of metrics) {
    if (metric.values.length < 3) continue

    const avg = metric.values.reduce((a, b) => a + b, 0) / metric.values.length
    const std = Math.sqrt(
      metric.values.reduce((sq, val) => sq + Math.pow(val - avg, 2), 0) / metric.values.length
    )

    const zScore = std > 0 ? Math.abs(metric.current - avg) / std : 0
    const isHigher = metric.current > avg

    if (zScore > 2) {
      anomalies.push({
        metricKey: metric.key,
        title: `${metric.label} ${isHigher ? 'spike' : 'drop'} detected`,
        description: `${metric.label} is ${Math.abs(((metric.current - avg) / avg) * 100).toFixed(0)}% ${isHigher ? 'above' : 'below'} the recent average of ${avg.toFixed(1)}.`,
        severity: zScore > 3 ? 'critical' : 'warning',
        value: metric.current,
        expectedRange: { min: avg - std, max: avg + std },
      })
    }
  }

  return anomalies
}
