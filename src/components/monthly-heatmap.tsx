"use client"

import { cn } from "@/lib/utils"
import { format, subWeeks, addDays, startOfWeek } from "date-fns"

type DayData = {
  date: string // YYYY-MM-DD
  count: number
}

export function MonthlyHeatmap({
  data,
  className,
  weeks = 12,
}: {
  data: DayData[]
  className?: string
  weeks?: number
}) {
  const dataMap = new Map(data.map((d) => [d.date, d]))
  const today = new Date()
  
  // Start from the Sunday of (weeks-1) weeks ago
  // This gives us `weeks` full columns
  const gridStart = startOfWeek(subWeeks(today, weeks - 1), { weekStartsOn: 0 })
  
  // Build grid: each column is a week, each row is a day (Sun=0 to Sat=6)
  // grid[weekIndex] = array of 7 days
  const grid: { date: Date; dateKey: string; isFuture: boolean }[][] = []
  
  for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
    const weekStart = addDays(gridStart, weekIndex * 7)
    const weekDays: { date: Date; dateKey: string; isFuture: boolean }[] = []
    
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = addDays(weekStart, dayIndex)
      weekDays.push({
        date,
        dateKey: format(date, "yyyy-MM-dd"),
        isFuture: date > today,
      })
    }
    grid.push(weekDays)
  }

  // Find max count for intensity scaling
  const maxCount = Math.max(1, ...data.map((d) => d.count))

  const cellSize = 11
  const gap = 3

  // Get month spans - find start and end week for each month
  const monthSpans: { label: string; startWeek: number; endWeek: number }[] = []
  let prevMonth = -1
  
  for (let weekIndex = 0; weekIndex < grid.length; weekIndex++) {
    const firstDay = grid[weekIndex][0]
    const month = firstDay.date.getMonth()
    
    if (month !== prevMonth) {
      // Close previous span
      if (monthSpans.length > 0) {
        monthSpans[monthSpans.length - 1].endWeek = weekIndex - 1
      }
      // Start new span
      monthSpans.push({ 
        label: format(firstDay.date, "MMM"), 
        startWeek: weekIndex, 
        endWeek: grid.length - 1  // Will be updated when next month starts
      })
      prevMonth = month
    }
  }
  
  // Calculate center position for each month label
  const monthLabels = monthSpans.map(span => ({
    label: span.label,
    position: ((span.startWeek + span.endWeek) / 2) * (cellSize + gap)
  }))

  return (
    <div className={cn("inline-block", className)}>
      {/* Month labels - centered over each month's columns */}
      <div className="relative h-4 mb-1" style={{ marginLeft: 18 }}>
        {monthLabels.map(({ label, position }) => (
          <span
            key={`${label}-${position}`}
            className="absolute text-[10px] text-muted-foreground whitespace-nowrap -translate-x-1/2"
            style={{ left: position }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="flex">
        {/* Day labels column */}
        <div className="flex flex-col text-[10px] text-muted-foreground" style={{ width: 18 }}>
          {["S", "M", "T", "W", "T", "F", "S"].map((label, i) => (
            <div 
              key={i}
              style={{ height: cellSize, marginBottom: i < 6 ? gap : 0 }}
              className="flex items-center"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {grid.map((week, weekIndex) => (
          <div 
            key={weekIndex} 
            className="flex flex-col"
            style={{ marginRight: weekIndex < weeks - 1 ? gap : 0 }}
          >
            {week.map((day, dayIndex) => {
              const dayData = dataMap.get(day.dateKey)
              const count = dayData?.count ?? 0
              const intensity = maxCount > 0 ? count / maxCount : 0

              let bg = "bg-muted/40"
              if (day.isFuture) {
                bg = "bg-transparent"
              } else if (count > 0) {
                if (intensity <= 0.25) {
                  bg = "bg-emerald-500/30"
                } else if (intensity <= 0.5) {
                  bg = "bg-emerald-500/50"
                } else if (intensity <= 0.75) {
                  bg = "bg-emerald-500/75"
                } else {
                  bg = "bg-emerald-500"
                }
              }

              return (
                <div
                  key={day.dateKey}
                  className={cn(
                    "rounded-sm",
                    bg,
                    day.isFuture && "border border-dashed border-muted/30"
                  )}
                  style={{ 
                    width: cellSize, 
                    height: cellSize,
                    marginBottom: dayIndex < 6 ? gap : 0,
                  }}
                  title={day.isFuture ? "" : `${format(day.date, "MMM d, yyyy")}: ${count} completion${count !== 1 ? "s" : ""}`}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        <div className="rounded-sm bg-muted/40" style={{ width: 10, height: 10 }} />
        <div className="rounded-sm bg-emerald-500/30" style={{ width: 10, height: 10 }} />
        <div className="rounded-sm bg-emerald-500/50" style={{ width: 10, height: 10 }} />
        <div className="rounded-sm bg-emerald-500/75" style={{ width: 10, height: 10 }} />
        <div className="rounded-sm bg-emerald-500" style={{ width: 10, height: 10 }} />
        <span>More</span>
      </div>
    </div>
  )
}
