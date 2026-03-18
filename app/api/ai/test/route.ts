import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function GET() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: 'GOOGLE_GENERATIVE_AI_API_KEY not set' },
      { status: 400 }
    )
  }

  try {
    const client = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    const model = client.getGenerativeModel({ model: 'gemini-pro' })

    const result = await model.generateContent('Say "API key is valid" in one sentence.')

    return NextResponse.json({
      success: true,
      message: result.response.text(),
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `Gemini API error: ${msg}` },
      { status: 500 }
    )
  }
}
