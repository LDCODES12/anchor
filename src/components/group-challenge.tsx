"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, addDays, startOfWeek, parseISO } from "date-fns"
import { Shield, Trophy, Users, Zap, CheckCircle2, XCircle, Clock, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  createChallengeAction,
  approveChallengeAction,
  getGroupChallengeAction,
} from "@/app/actions/challenges"
import { getRankName } from "@/lib/ranks"
import { toast } from "sonner"

// Rank colors and icons
const RANK_CONFIG: Record<number, { color: string; bgColor: string; borderColor: string }> = {
  1: { color: "text-amber-700", bgColor: "bg-amber-100 dark:bg-amber-900/30", borderColor: "border-amber-300" },
  2: { color: "text-slate-500", bgColor: "bg-slate-100 dark:bg-slate-800/50", borderColor: "border-slate-300" },
  3: { color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", borderColor: "border-yellow-300" },
  4: { color: "text-cyan-600", bgColor: "bg-cyan-100 dark:bg-cyan-900/30", borderColor: "border-cyan-300" },
  5: { color: "text-violet-600", bgColor: "bg-violet-100 dark:bg-violet-900/30", borderColor: "border-violet-300" },
}

function getRankConfig(rank: number) {
  if (rank >= 5) return RANK_CONFIG[5]
  return RANK_CONFIG[rank] ?? RANK_CONFIG[1]
}

/**
 * Rank Badge - Displays the group's current rank with a shield icon
 */
export function RankBadge({ rank, size = "default" }: { rank: number; size?: "sm" | "default" | "lg" }) {
  const config = getRankConfig(rank)
  const rankName = getRankName(rank)
  
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    default: "px-3 py-1 text-sm gap-1.5",
    lg: "px-4 py-1.5 text-base gap-2",
  }
  
  const iconSizes = { sm: 12, default: 14, lg: 18 }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        config.bgColor,
        config.borderColor,
        config.color,
        sizeClasses[size]
      )}
    >
      <Shield className="shrink-0" style={{ width: iconSizes[size], height: iconSizes[size] }} />
      <span>{rankName}</span>
    </div>
  )
}

/**
 * Challenge Card - Main component for challenge interaction
 */
export function ChallengeCard({ groupId }: { groupId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [challenge, setChallenge] = useState<{
    id: string
    weekKey: string
    status: string
    threshold: number
    approvalCount: number
    memberCount: number
    hasApproved: boolean
    isCurrentWeek: boolean
    isNextWeek: boolean
  } | null>(null)
  const [groupRank, setGroupRank] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await getGroupChallengeAction(groupId)
      if (result.ok) {
        setChallenge(result.challenge ?? null)
        setGroupRank(result.groupRank ?? 1)
      }
      setLoading(false)
    }
    load()
  }, [groupId])

  const handleCreateChallenge = () => {
    startTransition(async () => {
      const result = await createChallengeAction(groupId)
      if (result.ok) {
        toast.success("Challenge created! Waiting for others to join.")
        router.refresh()
        const newData = await getGroupChallengeAction(groupId)
        if (newData.ok) {
          setChallenge(newData.challenge ?? null)
          setGroupRank(newData.groupRank ?? 1)
        }
      } else {
        toast.error(result.error ?? "Failed to create challenge")
      }
    })
  }

  const handleApprove = () => {
    if (!challenge) return
    startTransition(async () => {
      const result = await approveChallengeAction(challenge.id)
      if (result.ok) {
        toast.success("You joined the challenge!")
        router.refresh()
        const newData = await getGroupChallengeAction(groupId)
        if (newData.ok) {
          setChallenge(newData.challenge ?? null)
          setGroupRank(newData.groupRank ?? 1)
        }
      } else {
        toast.error(result.error ?? "Failed to join challenge")
      }
    })
  }

  // Parse week key to get date range
  const getWeekDateRange = (weekKey: string) => {
    const [yearStr, weekNumStr] = weekKey.split("-W")
    const year = parseInt(yearStr)
    const weekNum = parseInt(weekNumStr)
    const jan4 = new Date(year, 0, 4)
    const jan4Day = jan4.getDay() || 7
    const week1Monday = new Date(jan4)
    week1Monday.setDate(jan4.getDate() - (jan4Day - 1))
    const weekStart = addDays(week1Monday, (weekNum - 1) * 7)
    const weekEnd = addDays(weekStart, 6)
    return { start: weekStart, end: weekEnd }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading challenge info...
        </CardContent>
      </Card>
    )
  }

  // No active challenge - show option to start one
  if (!challenge) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4" />
              Weekly Challenge
            </CardTitle>
            <RankBadge rank={groupRank} size="sm" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Start a challenge for next week. If everyone hits 90%+ completion, your group ranks up!
          </p>
          <Button onClick={handleCreateChallenge} disabled={isPending} className="w-full">
            <Zap className="h-4 w-4 mr-2" />
            Start Challenge
          </Button>
        </CardContent>
      </Card>
    )
  }

  const weekRange = getWeekDateRange(challenge.weekKey)
  const approvalProgress = (challenge.approvalCount / challenge.memberCount) * 100

  // Challenge is pending approval
  if (challenge.status === "PENDING") {
    return (
      <Card className="border-amber-300/50 bg-amber-50/30 dark:bg-amber-900/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-amber-600" />
              Pending Challenge
            </CardTitle>
            <RankBadge rank={groupRank} size="sm" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Challenge for <span className="font-medium text-foreground">
              {format(weekRange.start, "MMM d")} - {format(weekRange.end, "MMM d")}
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Members joined
              </span>
              <span className="font-medium">{challenge.approvalCount}/{challenge.memberCount}</span>
            </div>
            <Progress value={approvalProgress} className="h-2" />
          </div>

          {challenge.hasApproved ? (
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 rounded-lg py-2">
              <CheckCircle2 className="h-4 w-4" />
              You&apos;ve joined! Waiting for others...
            </div>
          ) : (
            <Button onClick={handleApprove} disabled={isPending} className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              Join Challenge
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // Challenge is scheduled (all approved, waiting for week to start)
  if (challenge.status === "SCHEDULED") {
    return (
      <Card className="border-blue-300/50 bg-blue-50/30 dark:bg-blue-900/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-blue-600" />
              Challenge Scheduled
            </CardTitle>
            <RankBadge rank={groupRank} size="sm" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            Challenge starts <span className="font-medium text-foreground">
              {format(weekRange.start, "EEEE, MMM d")}
            </span>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-blue-600 bg-blue-500/10 rounded-lg py-2">
            <Users className="h-4 w-4" />
            All {challenge.memberCount} members are ready!
          </div>

          <div className="text-xs text-muted-foreground text-center">
            Everyone needs {challenge.threshold}%+ completion to rank up
          </div>
        </CardContent>
      </Card>
    )
  }

  // Challenge is active
  if (challenge.status === "ACTIVE") {
    return (
      <Card className="border-emerald-300/50 bg-emerald-50/30 dark:bg-emerald-900/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-emerald-600" />
              Challenge Active!
            </CardTitle>
            <RankBadge rank={groupRank} size="sm" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            Ends <span className="font-medium text-foreground">
              {format(weekRange.end, "EEEE, MMM d")}
            </span>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 rounded-lg py-3 font-medium">
            <Trophy className="h-4 w-4" />
            Everyone hit {challenge.threshold}% to rank up!
          </div>

          <Badge variant="outline" className="w-full justify-center py-1.5">
            Next rank: {getRankName(groupRank + 1)}
          </Badge>
        </CardContent>
      </Card>
    )
  }

  // Challenge succeeded
  if (challenge.status === "SUCCEEDED") {
    return (
      <Card className="border-emerald-300/50 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base text-emerald-700 dark:text-emerald-400">
              <Trophy className="h-5 w-5" />
              Challenge Complete!
            </CardTitle>
            <RankBadge rank={groupRank} size="sm" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm">
            <span className="text-2xl">🎉</span>
            <div className="mt-2 font-medium text-emerald-700 dark:text-emerald-400">
              Your group ranked up!
            </div>
          </div>

          <Button onClick={handleCreateChallenge} disabled={isPending} variant="outline" className="w-full">
            <Zap className="h-4 w-4 mr-2" />
            Start Next Challenge
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Challenge failed
  if (challenge.status === "FAILED") {
    return (
      <Card className="border-red-300/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
              <XCircle className="h-4 w-4 text-red-400" />
              Challenge Incomplete
            </CardTitle>
            <RankBadge rank={groupRank} size="sm" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Not everyone hit {challenge.threshold}%. Try again next week!
          </p>

          <Button onClick={handleCreateChallenge} disabled={isPending} className="w-full">
            <Zap className="h-4 w-4 mr-2" />
            Start New Challenge
          </Button>
        </CardContent>
      </Card>
    )
  }

  return null
}
