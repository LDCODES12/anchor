import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { parseISO } from "date-fns"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getLocalDateKey, getWeekKey, getWeekStart } from "@/lib/time"
import {
  computeBestDailyStreak,
  computeDailyStreak,
  computeWeeklyStreak,
  summarizeDailyCheckIns,
  summarizeWeeklyCheckIns,
} from "@/lib/scoring"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckInButton } from "@/components/check-in-button"
import { Calendar } from "@/components/ui/calendar"

export default async function GoalDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/auth/signin")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })
  if (!user) redirect("/auth/signin")

  const goal = await prisma.goal.findFirst({
    where: { id: params.id, ownerId: user.id },
    include: { checkIns: true },
  })
  if (!goal) redirect("/goals")

  const todayKey = getLocalDateKey(new Date(), user.timezone)
  const weekKey = getWeekKey(new Date(), user.timezone)
  const weekStart = getWeekStart(new Date(), user.timezone)

  const checkIns = goal.checkIns.filter((check) => check.userId === user.id)
  const checkInsThisWeek = checkIns.filter((check) => check.weekKey === weekKey)
  const todayDone = checkIns.some((check) => check.localDateKey === todayKey)

  const dateKeys = summarizeDailyCheckIns(checkIns)
  const currentDailyStreak = computeDailyStreak(dateKeys, todayKey)
  const bestDailyStreak = computeBestDailyStreak(dateKeys)

  const weeklyCounts = summarizeWeeklyCheckIns(checkIns)
  const weeklyStreak =
    goal.cadenceType === "WEEKLY" && goal.weeklyTarget
      ? computeWeeklyStreak(weeklyCounts, weekStart, user.timezone, goal.weeklyTarget)
      : 0

  const checkInDates = dateKeys.map((key) => parseISO(key))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{goal.name}</h1>
          <p className="text-sm text-muted-foreground">
            {goal.cadenceType === "DAILY"
              ? "Daily goal"
              : `Weekly target: ${goal.weeklyTarget}x`}
          </p>
        </div>
        <CheckInButton goalId={goal.id} completed={todayDone} />
      </div>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Check-in history</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="multiple"
              selected={checkInDates}
              modifiers={{
                checkedIn: checkInDates,
              }}
              modifiersClassNames={{
                checkedIn: "bg-primary text-primary-foreground rounded-md",
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total check-ins</span>
              <span className="text-lg font-semibold">{checkIns.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">This week</span>
              <span className="text-lg font-semibold">
                {checkInsThisWeek.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current streak</span>
              <Badge variant="secondary">
                {goal.cadenceType === "DAILY"
                  ? `${currentDailyStreak} days`
                  : `${weeklyStreak} weeks`}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Best daily streak</span>
              <span className="text-lg font-semibold">{bestDailyStreak}</span>
            </div>
            {goal.notes ? (
              <div className="rounded-xl border bg-background p-3 text-sm text-muted-foreground">
                {goal.notes}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
