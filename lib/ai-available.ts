/**
 * Check if AI features are available by testing the API key
 */
export async function isAiAvailable(): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_AI_ENABLED) {
    return false
  }

  try {
    const res = await fetch('/api/ai/test', {
      method: 'GET',
      cache: 'no-store',
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Client-side check - returns true if GOOGLE_GENERATIVE_AI_API_KEY appears to be set
 * (More optimistic check for UI purposes)
 */
export function isAiLikelyAvailable(): boolean {
  // This is client-side, so we can't check env vars directly.
  // We assume it's available unless proven otherwise by API calls.
  // The test endpoint will give us the real answer.
  return true
}
