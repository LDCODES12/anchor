import { describe, expect, it } from "vitest"
import { addDays, subDays } from "date-fns"
import { getLocalDateKey, getWeekKey, getWeekStart } from "./time"
import {
  computeDailyStreak,
  computeWeeklyPoints,
  computeWeeklyStreak,
  computeConsistencyPercentage,
  computeGracefulStreak,
  getSoftFailureMessage,
} from "./scoring"

describe("streak logic", () => {
  it("computes daily streak ending today", () => {
    const tz = "America/Chicago"
    const today = new Date("2025-01-15T18:00:00Z")
    const keys = [
      getLocalDateKey(today, tz),
      getLocalDateKey(subDays(today, 1), tz),
      getLocalDateKey(subDays(today, 2), tz),
    ]
    const streak = computeDailyStreak(keys, getLocalDateKey(today, tz), tz)
    expect(streak).toBe(3)
  })

  it("computes weekly streak across consecutive weeks", () => {
    const tz = "America/Chicago"
    const today = new Date("2025-01-15T18:00:00Z")
    const weekStart = getWeekStart(today, tz)
    const currentKey = getWeekKey(today, tz)
    const prevKey = getWeekKey(subDays(weekStart, 1), tz)
    const weekCounts = {
      [currentKey]: 3,
      [prevKey]: 3,
    }
    const streak = computeWeeklyStreak(weekCounts, weekStart, tz, 3)
    expect(streak).toBe(2)
  })
})

describe("weekly scoring", () => {
  it("caps points and applies early bonus for weekly targets", () => {
    const points = computeWeeklyPoints({
      goal: {
        cadenceType: "WEEKLY",
        pointsPerCheckIn: 10,
        weeklyTarget: 3,
        weeklyTargetBonus: 20,
        streakBonus: 5,
      },
      checkInsThisWeek: 4, // 4 check-ins this week
      dailyStreak: 0,
    })
    // 4 check-ins * 10 pts + 20 bonus for meeting target = 60
    expect(points).toBe(60)
  })
})

describe("graceful failure", () => {
  it("computes consistency percentage correctly", () => {
    const tz = "America/Chicago"
    const today = new Date("2025-01-15T18:00:00Z")
    const todayKey = getLocalDateKey(today, tz)
    // 15 days of check-ins out of 30 = 50%
    const keys = Array.from({ length: 15 }).map((_, i) =>
      getLocalDateKey(subDays(today, i * 2), tz)
    )
    const consistency = computeConsistencyPercentage(keys, todayKey, tz, 30)
    expect(consistency).toBe(50)
  })

  it("computes streak correctly - single miss breaks it", () => {
    const tz = "America/Chicago"
    const today = new Date("2025-01-15T18:00:00Z")
    const todayKey = getLocalDateKey(today, tz)
    // Streak with one gap: day-0, day-1, day-2, [gap at day-3], day-4
    // Without freezes, the gap at day-3 should break the streak
    const keys = [
      getLocalDateKey(today, tz),          // day 0
      getLocalDateKey(subDays(today, 1), tz), // day -1
      getLocalDateKey(subDays(today, 2), tz), // day -2
      // day -3 missing - breaks streak
      getLocalDateKey(subDays(today, 4), tz), // day -4 (not counted due to gap)
    ]
    const result = computeGracefulStreak(keys, todayKey, tz)
    // Without freezes, streak is only the consecutive days from today
    expect(result.currentStreak).toBe(3)
    expect(result.isAtRisk).toBe(false)
  })

  it("detects at-risk streak when today is incomplete", () => {
    const tz = "America/Chicago"
    const today = new Date("2025-01-15T18:00:00Z")
    const todayKey = getLocalDateKey(today, tz)
    // Yesterday done, today not done - streak is at risk
    const keys = [
      getLocalDateKey(subDays(today, 1), tz), // yesterday done
      getLocalDateKey(subDays(today, 2), tz), // day before done
      getLocalDateKey(subDays(today, 3), tz), // 3 days ago done
    ]
    const result = computeGracefulStreak(keys, todayKey, tz)
    // Shows the streak from yesterday that could be lost
    expect(result.currentStreak).toBe(3) // 3-day streak from yesterday
    expect(result.isAtRisk).toBe(true)
  })

  it("returns zero streak when neither today nor yesterday is complete", () => {
    const tz = "America/Chicago"
    const today = new Date("2025-01-15T18:00:00Z")
    const todayKey = getLocalDateKey(today, tz)
    // Today and yesterday not done - no active streak
    const keys = [
      getLocalDateKey(subDays(today, 2), tz), // 2 days ago done
      getLocalDateKey(subDays(today, 3), tz), // 3 days ago done
    ]
    const result = computeGracefulStreak(keys, todayKey, tz)
    expect(result.currentStreak).toBe(0)
    expect(result.isAtRisk).toBe(false) // Nothing to be at risk - already lost
  })

  it("returns soft message based on consistency", () => {
    // High consistency - celebratory message
    const high = getSoftFailureMessage(85, 26, 30)
    expect(high).toContain("85%")
    // Medium consistency - encouraging message
    const medium = getSoftFailureMessage(60, 18, 30)
    expect(medium).toContain("18")
    // Low consistency - supportive message
    const low = getSoftFailureMessage(30, 9, 30)
    expect(low).toBeTruthy()
  })
})
