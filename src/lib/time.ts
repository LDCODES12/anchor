import { addDays } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"

export const DEFAULT_TIMEZONE = "America/Chicago"

export function getLocalDateKey(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd")
}

export function getWeekKey(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, "RRRR-'W'II")
}

export function getWeekStart(date: Date, timeZone: string) {
  const day = Number(formatInTimeZone(date, timeZone, "i"))
  const offset = day - 1
  return addDays(new Date(date), -offset)
}

export function getWeekEnd(date: Date, timeZone: string) {
  return addDays(getWeekStart(date, timeZone), 6)
}
