import { addDays, subDays, format, eachDayOfInterval, getDay } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"

export const DEFAULT_TIMEZONE = "America/Chicago"

export function getLocalDateKey(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd")
}

export function getWeekKey(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, "RRRR-'W'II")
}

export function getWeekStart(date: Date, timeZone: string) {
  // Get day of week in user's timezone (1=Monday, 7=Sunday per ISO)
  const day = Number(formatInTimeZone(date, timeZone, "i"))
  const offset = day - 1
  // Subtract days to get to Monday. Note: This works correctly for week key
  // computation since we only care about the date, not the exact hour.
  return addDays(new Date(date), -offset)
}

export function getWeekEnd(date: Date, timeZone: string) {
  return addDays(getWeekStart(date, timeZone), 6)
}

/**
 * Generate array of date strings (YYYY-MM-DD) in a range (inclusive)
 */
export function getDateRange(start: Date, end: Date): string[] {
  if (start > end) return []
  const days = eachDayOfInterval({ start, end })
  return days.map((d) => format(d, "yyyy-MM-dd"))
}

/**
 * Generate dates matching specific weekdays in a range
 * @param weekdays Array of weekday numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
 */
export function getWeekdayDates(
  start: Date,
  end: Date,
  weekdays: number[]
): string[] {
  if (start > end || weekdays.length === 0) return []
  const days = eachDayOfInterval({ start, end })
  return days
    .filter((d) => weekdays.includes(getDay(d)))
    .map((d) => format(d, "yyyy-MM-dd"))
}

/**
 * Generate N consecutive days ending on a specific date
 * @param endDate The last day of the streak (inclusive)
 * @param count Number of days in the streak
 */
export function getStreakDates(endDate: Date, count: number): string[] {
  if (count <= 0) return []
  const dates: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    dates.push(format(subDays(endDate, i), "yyyy-MM-dd"))
  }
  return dates
}
