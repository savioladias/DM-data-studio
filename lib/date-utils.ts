import { subDays, startOfYear, differenceInDays, subMonths } from 'date-fns'

export interface DateRangePair {
  current: { start: Date; end: Date }
  prior: { start: Date; end: Date }
}

/**
 * Calculate corresponding prior period dates
 * e.g., if current is Jan 1-30, prior is Dec 2-31
 */
export function getPriorPeriodDates(
  currentStart: string,
  currentEnd: string
): DateRangePair {
  const start = new Date(currentStart)
  const end = new Date(currentEnd)
  const daysInRange = differenceInDays(end, start) + 1

  const priorEnd = new Date(start)
  priorEnd.setDate(priorEnd.getDate() - 1)

  const priorStart = subDays(priorEnd, daysInRange - 1)

  return {
    current: { start, end },
    prior: { start: priorStart, end: priorEnd },
  }
}

/**
 * Format date for API calls (YYYY-MM-DD)
 */
export function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Calculate days between two date strings
 */
export function daysBetween(start: string, end: string): number {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return differenceInDays(endDate, startDate) + 1
}
