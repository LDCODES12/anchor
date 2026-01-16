import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getLocalDateKey, getWeekKey, getWeekStart } from "@/lib/time"
import {
  computeDailyStreak,
  computeWeeklyStreak,
  computeWeeklyPoints,
  summarizeDailyCheckIns,
  summarizeWeeklyCheckIns,
} from "@/lib/scoring"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CompletionRing } from "@/components/completion-ring"
import { CheerButton } from "@/components/cheer-button"
import { RemindButton } from "@/components/remind-button"
import { GroupSetup } from "@/components/group-setup"
import { InviteLinkCard } from "@/components/invite-link-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, AlertCircle } from "lucide-react"

export default async function GroupPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/auth/signin")

  const membership = await prisma.groupMember.findFirst({
    where: { userId: session.user.id },
    include: { group: true },
  })
  if (!membership) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Create or join a group</h1>
          <p className="text-sm text-muted-foreground">
            Groups keep everyone accountable. Use an invite code or start your
            own.
          </p>
        </div>
        <GroupSetup />
      </div>
    )
  }

  const group = await prisma.group.findUnique({
    where: { id: membership.groupId },
    include: {
      members: { include: { user: true } },
    },
  })
  if (!group) redirect("/dashboard")

  const goals = await prisma.goal.findMany({
    where: { groupId: group.id, active: true },
    include: { checkIns: true },
  })

  const recentCheckIns = await prisma.checkIn.findMany({
    where: { goal: { groupId: group.id } },
    include: { user: true, goal: true },
    orderBy: { timestamp: "desc" },
    take: 8,
  })

  const todaySnapshots = group.members.map((member) => {
    const userGoals = goals.filter((goal) => goal.ownerId === member.userId)
    const todayKey = getLocalDateKey(new Date(), member.user.timezone)
    const weekKey = getWeekKey(new Date(), member.user.timezone)
    const weekStart = getWeekStart(new Date(), member.user.timezone)

    return {
      member,
      goals: userGoals.map((goal) => {
        const checkIns = goal.checkIns.filter(
          (check) => check.userId === member.userId
        )
        const checkedToday = checkIns.some(
          (check) => check.localDateKey === todayKey
        )
        const weekCount = checkIns.filter((check) => check.weekKey === weekKey)
          .length

        // Compute streaks
        const dailyStreak = computeDailyStreak(
          summarizeDailyCheckIns(checkIns),
          todayKey
        )
        const weeklyStreak =
          goal.cadenceType === "WEEKLY" && goal.weeklyTarget
            ? computeWeeklyStreak(
                summarizeWeeklyCheckIns(checkIns),
                weekStart,
                member.user.timezone,
                goal.weeklyTarget
              )
            : 0

        return {
          goal,
          checkedToday,
          weekCount,
          dailyStreak,
          weeklyStreak,
        }
      }),
    }
  })

  const leaderboard = group.members.map((member) => {
    const userGoals = goals.filter((goal) => goal.ownerId === member.userId)
    const userWeekKey = getWeekKey(new Date(), member.user.timezone)
    const userTodayKey = getLocalDateKey(new Date(), member.user.timezone)
    let totalPoints = 0
    let totalTarget = 0
    let totalCompleted = 0
    let completedToday = false

    for (const goal of userGoals) {
      const checkIns = goal.checkIns.filter(
        (check) => check.userId === member.userId
      )
      const checkInsThisWeek = checkIns.filter(
        (check) => check.weekKey === userWeekKey
      )
      const todayDone = checkIns.some(
        (check) => check.localDateKey === userTodayKey
      )
      if (todayDone) completedToday = true

      const dailyStreak = computeDailyStreak(
        summarizeDailyCheckIns(checkIns),
        userTodayKey
      )

      totalPoints += computeWeeklyPoints({
        goal,
        checkInsThisWeek,
        currentStreak: dailyStreak,
        timeZone: member.user.timezone,
        today: new Date(),
      })

      if (goal.cadenceType === "WEEKLY" && goal.weeklyTarget) {
        totalTarget += goal.weeklyTarget
        totalCompleted += Math.min(checkInsThisWeek.length, goal.weeklyTarget)
      } else {
        totalTarget += 7
        totalCompleted += Math.min(checkInsThisWeek.length, 7)
      }
    }

    const completionPct =
      totalTarget === 0 ? 0 : Math.round((totalCompleted / totalTarget) * 100)

    return {
      member,
      totalPoints,
      completionPct,
      completedToday,
    }
  })

  const sortedLeaderboard = [...leaderboard].sort(
    (a, b) => b.totalPoints - a.totalPoints
  )

  const pulseCompleted = sortedLeaderboard.filter((entry) => entry.completedToday).length

  const baseUrl =
    process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const inviteUrl = `${baseUrl}/group/join?code=${group.inviteCode}`

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{group.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Invite code: <span className="font-medium">{group.inviteCode}</span>
            </p>
          </div>
          <Badge variant="outline">{group.members.length} members</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {sortedLeaderboard.map((entry) => (
              <div
                key={entry.member.id}
                className="flex flex-col items-center gap-2 rounded-2xl border bg-background p-4"
              >
                <div className="text-sm font-medium">
                  {entry.member.user.name}
                </div>
                <CompletionRing
                  value={entry.completionPct}
                  label="Weekly completion"
                />
                <div className="text-xs text-muted-foreground">
                  {entry.totalPoints} points
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <InviteLinkCard inviteUrl={inviteUrl} inviteCode={group.inviteCode} />

      <Tabs defaultValue="pulse" className="w-full">
        <TabsList>
          <TabsTrigger value="pulse">Pulse</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        <TabsContent value="pulse" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pulse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-background px-3 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Members active today</span>
                  <span className="font-medium">
                    {pulseCompleted}/{sortedLeaderboard.length}
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Quick snapshot of who has completed at least one goal today.
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Completed
                </span>
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  Daily - needs attention
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-6 rounded-full bg-primary/20" />
                  Weekly progress
                </span>
              </div>
              <div className="grid gap-4 text-sm">
                {todaySnapshots.map((entry) => {
                  const dailyGoals = entry.goals.filter(
                    (g) => g.goal.cadenceType === "DAILY"
                  )
                  const weeklyGoals = entry.goals.filter(
                    (g) => g.goal.cadenceType === "WEEKLY"
                  )
                  const dailyCompleted = dailyGoals.filter(
                    (g) => g.checkedToday
                  ).length
                  const needsReminder = dailyGoals.some((g) => !g.checkedToday)

                  return (
                    <div
                      key={entry.member.id}
                      className="rounded-xl border bg-background overflow-hidden"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                        <span className="font-medium">
                          {entry.member.user.name}
                        </span>
                        {dailyGoals.length > 0 ? (
                          <span className="text-xs text-muted-foreground">
                            {dailyCompleted}/{dailyGoals.length} daily done
                          </span>
                        ) : entry.goals.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            No goals
                          </span>
                        ) : null}
                      </div>

                      {entry.goals.length === 0 ? (
                        <div className="px-4 py-3 text-muted-foreground text-sm">
                          No goals yet.
                        </div>
                      ) : (
                        <div className="px-4 py-3 space-y-4">
                          {/* Daily Goals Section */}
                          {dailyGoals.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                Required Today
                              </div>
                              <div className="space-y-1.5">
                                {dailyGoals.map((g) => (
                                  <div
                                    key={g.goal.id}
                                    className="flex items-center justify-between"
                                  >
                                    <div className="flex items-center gap-2">
                                      {g.checkedToday ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                      ) : (
                                        <AlertCircle className="h-4 w-4 text-amber-500" />
                                      )}
                                      <span className={g.checkedToday ? "text-muted-foreground" : ""}>
                                        {g.goal.name}
                                      </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {g.checkedToday ? "Done" : "Pending"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Weekly Goals Section */}
                          {weeklyGoals.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                Weekly Progress
                              </div>
                              <div className="space-y-2.5">
                                {weeklyGoals.map((g) => {
                                  const target = g.goal.weeklyTarget ?? 1
                                  const progress = Math.min(
                                    100,
                                    Math.round((g.weekCount / target) * 100)
                                  )
                                  const isComplete = g.weekCount >= target

                                  return (
                                    <div key={g.goal.id} className="space-y-1">
                                      <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                          {isComplete && (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                          )}
                                          <span className={isComplete ? "text-muted-foreground" : ""}>
                                            {g.goal.name}
                                          </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                          {g.weekCount}/{target} this week
                                        </span>
                                      </div>
                                      <Progress value={progress} className="h-1.5" />
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Remind button */}
                      {needsReminder && entry.member.user.id !== session.user.id && (
                        <div className="px-4 py-2 border-t bg-muted/20">
                          <RemindButton
                            recipientId={entry.member.user.id}
                            recipientName={entry.member.user.name}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="details" className="mt-4 space-y-4">
          {/* Member Goal Profiles */}
          {todaySnapshots.map((entry) => {
            const leaderboardEntry = sortedLeaderboard.find(
              (l) => l.member.id === entry.member.id
            )
            const rank = sortedLeaderboard.findIndex(
              (l) => l.member.id === entry.member.id
            ) + 1
            const joinDate = new Date(entry.member.joinedAt).toLocaleDateString(
              "en-US",
              { month: "short", year: "numeric" }
            )

            return (
              <Card key={entry.member.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {entry.member.user.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Member since {joinDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold">
                        {leaderboardEntry?.totalPoints ?? 0}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        points this week · #{rank}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {entry.goals.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-2">
                      No goals yet.
                    </div>
                  ) : (
                    entry.goals.map((g) => {
                      const isDaily = g.goal.cadenceType === "DAILY"
                      const target = isDaily ? 7 : (g.goal.weeklyTarget ?? 1)
                      const progress = Math.min(
                        100,
                        Math.round((g.weekCount / target) * 100)
                      )
                      const streak = isDaily ? g.dailyStreak : g.weeklyStreak
                      const streakLabel = isDaily
                        ? `${streak} day${streak !== 1 ? "s" : ""}`
                        : `${streak} week${streak !== 1 ? "s" : ""}`

                      return (
                        <div
                          key={g.goal.id}
                          className="rounded-xl border bg-background p-4"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="font-medium">{g.goal.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {isDaily
                                  ? "Daily"
                                  : `${g.goal.weeklyTarget}x per week`}
                              </div>
                            </div>
                            {streak > 0 && (
                              <Badge variant="secondary">
                                {streakLabel} streak
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span>This week</span>
                              <span>
                                {g.weekCount}/{target}
                              </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  g.checkedToday ? "bg-emerald-500" : "bg-muted"
                                }`}
                              />
                              {g.checkedToday
                                ? "Completed today"
                                : "Not completed today"}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            )
          })}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentCheckIns.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No completions yet. Be the first to log progress.
                </div>
              ) : (
                recentCheckIns.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm"
                  >
                    <span>
                      {item.user.name} completed:{" "}
                      <span className="font-medium">{item.goal.name}</span>
                    </span>
                    <div className="flex items-center gap-3">
                      <CheerButton name={item.user.name} />
                      <span className="text-xs text-muted-foreground">
                        {item.timestamp.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  )
}
