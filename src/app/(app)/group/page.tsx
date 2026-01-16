import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getLocalDateKey, getWeekKey } from "@/lib/time"
import {
  computeDailyStreak,
  computeWeeklyPoints,
  summarizeDailyCheckIns,
} from "@/lib/scoring"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CompletionRing } from "@/components/completion-ring"
import { CheerButton } from "@/components/cheer-button"
import { RemindButton } from "@/components/remind-button"
import { GroupSetup } from "@/components/group-setup"
import { InviteLinkCard } from "@/components/invite-link-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
        return {
          goal,
          checkedToday,
          weekCount,
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
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/70" />
                  Completed today
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/70" />
                  Due today
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-muted" />
                  Weekly / not due today
                </span>
              </div>
              <div className="grid gap-3 text-sm">
                {todaySnapshots.map((entry) => {
                  const completedCount = entry.goals.filter(
                    (goal) => goal.checkedToday
                  ).length
                  const totalGoals = entry.goals.length
                  const needsReminder = entry.goals.some(
                    (goal) =>
                      goal.goal.cadenceType === "DAILY" && !goal.checkedToday
                  )

                  return (
                    <div
                      key={entry.member.id}
                      className="rounded-xl border bg-background px-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {entry.member.user.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {totalGoals === 0
                            ? "No goals"
                            : `${completedCount} completed`}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entry.goals.length === 0 ? (
                          <span className="text-muted-foreground">
                            No goals yet.
                          </span>
                        ) : (
                          entry.goals.slice(0, 12).map((goal) => {
                            const isDaily = goal.goal.cadenceType === "DAILY"
                            const className = goal.checkedToday
                              ? "bg-emerald-500/70"
                              : isDaily
                              ? "bg-amber-500/70"
                              : "bg-muted"
                            const label = goal.checkedToday
                              ? "Completed today"
                              : isDaily
                              ? "Due today"
                              : "Weekly / not due today"

                            return (
                              <span
                                key={goal.goal.id}
                                className={`h-4 w-4 rounded-sm ${className}`}
                                title={`${goal.goal.name} — ${label}`}
                              />
                            )
                          })
                        )}
                        {entry.goals.length > 12 ? (
                          <span className="rounded-sm bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                            +{entry.goals.length - 12} more
                          </span>
                        ) : null}
                      </div>
                      {needsReminder && entry.member.user.id !== session.user.id ? (
                        <div className="mt-2">
                          <RemindButton
                            recipientId={entry.member.user.id}
                            recipientName={entry.member.user.name}
                          />
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="details" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLeaderboard.map((entry, index) => (
                    <TableRow key={entry.member.id}>
                      <TableCell>
                        {index + 1}. {entry.member.user.name}
                      </TableCell>
                      <TableCell>{entry.totalPoints}</TableCell>
                      <TableCell>
                        {entry.completedToday ? (
                          <Badge variant="secondary">Completed today</Badge>
                        ) : (
                          <Badge variant="outline">Not completed</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
