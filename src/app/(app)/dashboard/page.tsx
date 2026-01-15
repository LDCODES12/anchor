import { getServerSession } from "next-auth"
import Link from "next/link"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getLocalDateKey, getWeekKey, getWeekStart } from "@/lib/time"
import { formatInTimeZone } from "date-fns-tz"
import {
  computeDailyStreak,
  computeWeeklyStreak,
  summarizeDailyCheckIns,
  summarizeWeeklyCheckIns,
} from "@/lib/scoring"
import { getBadges } from "@/lib/badges"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckInButton } from "@/components/check-in-button"
import { EmptyState } from "@/components/empty-state"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/auth/signin")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })
  if (!user) redirect("/auth/signin")

  const membership = await prisma.groupMember.findFirst({
    where: { userId: user.id },
    include: { group: true },
  })

  const goals = await prisma.goal.findMany({
    where: { ownerId: user.id, active: true },
    include: { checkIns: true },
    orderBy: { createdAt: "desc" },
  })

  const todayKey = getLocalDateKey(new Date(), user.timezone)
  const now = new Date()
  const weekKey = getWeekKey(now, user.timezone)
  const weekStart = getWeekStart(now, user.timezone)
  const weekdayNumber = Number(formatInTimeZone(now, user.timezone, "i"))
  const daysElapsed = Math.max(1, Math.min(7, weekdayNumber))

  const todayGoals = goals.map((goal) => {
    const checkIns = goal.checkIns.filter((check) => check.userId === user.id)
    const todayDone = checkIns.some((check) => check.localDateKey === todayKey)
    const checkInsThisWeek = checkIns.filter(
      (check) => check.weekKey === weekKey
    )

    const dailyStreak = computeDailyStreak(
      summarizeDailyCheckIns(checkIns),
      todayKey
    )
    const weeklyCounts = summarizeWeeklyCheckIns(checkIns)
    const weeklyStreak =
      goal.cadenceType === "WEEKLY" && goal.weeklyTarget
        ? computeWeeklyStreak(weeklyCounts, weekStart, user.timezone, goal.weeklyTarget)
        : 0

    return {
      goal,
      todayDone,
      checkInsThisWeek,
      dailyStreak,
      weeklyStreak,
      checkIns,
    }
  })

  const hasMissingToday =
    todayGoals.filter((item) => item.goal.cadenceType === "DAILY")
      .length > 0 &&
    todayGoals.some(
      (item) => item.goal.cadenceType === "DAILY" && !item.todayDone
    )

  const totalCheckIns = todayGoals.reduce(
    (sum, item) => sum + item.checkIns.length,
    0
  )
  const badges = getBadges({
    totalCheckIns,
    dailyStreaks: todayGoals
      .filter((item) => item.goal.cadenceType === "DAILY")
      .map((item) => item.dailyStreak),
    weeklyGoals: todayGoals
      .filter((item) => item.goal.cadenceType === "WEEKLY")
      .map((item) => ({
        cadenceType: item.goal.cadenceType,
        weeklyTarget: item.goal.weeklyTarget,
        checkIns: item.checkIns.map((check) => ({ weekKey: check.weekKey })),
      })),
    timeZone: user.timezone,
    today: new Date(),
  })

  const reminderLabel =
    user.reminderFrequency === "WEEKDAYS" ? "Weekdays" : "Daily"

  return (
    <div className="space-y-6">
      {!membership ? (
        <div className="rounded-2xl border border-dashed bg-background px-6 py-4 text-sm text-muted-foreground">
          You&apos;re not in a group yet.{" "}
          <a href="/group" className="text-foreground underline">
            Create or join one
          </a>{" "}
          when you&apos;re ready for accountability.
        </div>
      ) : null}
      {hasMissingToday ? (
        <div className="rounded-2xl border border-dashed bg-background px-6 py-4 text-sm text-muted-foreground">
          You haven&apos;t checked in today. A quick tap keeps your streak alive.
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayGoals.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Create your first goal to start tracking.
              </div>
            ) : (
              todayGoals.map(({ goal, todayDone, checkInsThisWeek }) => {
                const target =
                  goal.cadenceType === "WEEKLY" && goal.weeklyTarget
                    ? goal.weeklyTarget
                    : 1
                const progress = Math.min(
                  100,
                  Math.round((checkInsThisWeek.length / target) * 100)
                )
                return (
                  <div
                    key={goal.id}
                    className="flex flex-col gap-3 rounded-2xl border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{goal.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {goal.cadenceType === "DAILY"
                            ? "Daily"
                            : `Weekly target: ${goal.weeklyTarget}x`}
                        </div>
                      </div>
                      <CheckInButton
                        goalId={goal.id}
                        completed={todayDone}
                        label="Check in"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>This week</span>
                        <span>
                          {checkInsThisWeek.length}/{target}
                        </span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Streaks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayGoals.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Streaks will appear once you start checking in.
              </div>
            ) : (
              todayGoals.map(({ goal, dailyStreak, weeklyStreak }) => (
                <div
                  key={goal.id}
                  className="flex items-center justify-between rounded-xl border bg-background px-3 py-2"
                >
                  <div className="text-sm font-medium">{goal.name}</div>
                  <Badge variant="secondary">
                    {goal.cadenceType === "DAILY"
                      ? `${dailyStreak} day streak`
                      : `${weeklyStreak} week streak`}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Weekly planning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayGoals.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Add goals to see your weekly plan.
            </div>
          ) : (
            todayGoals.map(({ goal, checkInsThisWeek }) => {
              const weeklyTarget =
                goal.cadenceType === "WEEKLY" && goal.weeklyTarget
                  ? goal.weeklyTarget
                  : 7
              const expectedByNow =
                goal.cadenceType === "WEEKLY" && goal.weeklyTarget
                  ? Math.ceil((goal.weeklyTarget * daysElapsed) / 7)
                  : daysElapsed
              const onTrack = checkInsThisWeek.length >= expectedByNow
              const progress = Math.min(
                100,
                Math.round((checkInsThisWeek.length / weeklyTarget) * 100)
              )

              return (
                <div
                  key={goal.id}
                  className="rounded-2xl border bg-background p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{goal.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {goal.cadenceType === "DAILY"
                          ? "Daily"
                          : `Weekly target: ${goal.weeklyTarget}x`}
                      </div>
                    </div>
                    <Badge variant={onTrack ? "secondary" : "outline"}>
                      {onTrack ? "On track" : "Behind"}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progress this week</span>
                      <span>
                        {checkInsThisWeek.length}/{weeklyTarget}
                      </span>
                    </div>
                    <Progress value={progress} />
                    <div className="text-[11px] text-muted-foreground">
                      Aim for {expectedByNow} by today
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {badges.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No badges yet. Your first check-in unlocks one!
            </div>
          ) : (
            badges.map((badge) => (
              <Badge key={badge} variant="secondary">
                {badge}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming reminders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>
              Next reminder:{" "}
              <span className="text-foreground">{user.reminderTime}</span>
            </div>
            <div>
              Frequency: <span className="text-foreground">{reminderLabel}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Push/email reminders are coming soon. We&apos;ll notify you when
              they&apos;re ready.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Link href="/goals" className="block text-primary underline">
              View all goals
            </Link>
            <Link href="/group" className="block text-primary underline">
              Group dashboard
            </Link>
            <Link href="/settings" className="block text-primary underline">
              Update settings
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
