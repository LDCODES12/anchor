"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { addDays, startOfWeek } from "date-fns"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getWeekKey } from "@/lib/time"

/**
 * Get the week key for the next ISO week (starts Monday)
 */
function getNextWeekKey(timezone: string): string {
  const now = new Date()
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
  const nextWeekStart = addDays(currentWeekStart, 7)
  return getWeekKey(nextWeekStart, timezone)
}

/**
 * Create a new challenge for the group.
 * The challenge will run during the next ISO week.
 * Creator automatically approves.
 */
export async function createChallengeAction(groupId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const membership = await prisma.groupMember.findFirst({
    where: { userId: session.user.id, groupId },
  })
  if (!membership) return { ok: false, error: "Not a member of this group" }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true },
  })
  const timezone = user?.timezone ?? "America/Chicago"

  const nextWeekKey = getNextWeekKey(timezone)

  // Check if a challenge already exists for next week
  const existing = await prisma.groupChallenge.findUnique({
    where: { groupId_weekKey: { groupId, weekKey: nextWeekKey } },
  })
  if (existing) {
    return { ok: false, error: "A challenge already exists for next week" }
  }

  // Create the challenge and auto-approve for the creator
  const challenge = await prisma.groupChallenge.create({
    data: {
      groupId,
      weekKey: nextWeekKey,
      createdById: session.user.id,
      status: "PENDING",
      threshold: 90,
      approvals: {
        create: {
          userId: session.user.id,
        },
      },
    },
    include: { approvals: true },
  })

  // Check if all members have now approved
  const memberCount = await prisma.groupMember.count({ where: { groupId } })
  if (challenge.approvals.length >= memberCount) {
    await prisma.groupChallenge.update({
      where: { id: challenge.id },
      data: { status: "SCHEDULED" },
    })
  }

  revalidatePath("/group")
  return { ok: true, challenge }
}

/**
 * Approve/join a pending challenge.
 */
export async function approveChallengeAction(challengeId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const challenge = await prisma.groupChallenge.findUnique({
    where: { id: challengeId },
    include: { group: { include: { members: true } }, approvals: true },
  })
  if (!challenge) return { ok: false, error: "Challenge not found" }

  // Check if user is a member of the group
  const isMember = challenge.group.members.some((m) => m.userId === session.user.id)
  if (!isMember) return { ok: false, error: "Not a member of this group" }

  if (challenge.status !== "PENDING") {
    return { ok: false, error: "Challenge is not pending approval" }
  }

  // Check if already approved
  const alreadyApproved = challenge.approvals.some((a) => a.userId === session.user.id)
  if (alreadyApproved) {
    return { ok: false, error: "Already approved this challenge" }
  }

  // Create approval
  await prisma.challengeApproval.create({
    data: {
      challengeId,
      userId: session.user.id,
    },
  })

  // Check if all members have now approved
  const newApprovalCount = challenge.approvals.length + 1
  if (newApprovalCount >= challenge.group.members.length) {
    await prisma.groupChallenge.update({
      where: { id: challengeId },
      data: { status: "SCHEDULED" },
    })
  }

  revalidatePath("/group")
  return { ok: true }
}

/**
 * Evaluate and update challenge statuses.
 * Should be called on page load to transition:
 * - SCHEDULED -> ACTIVE when the challenge week starts
 * - ACTIVE -> SUCCEEDED/FAILED when the challenge week ends
 */
export async function evaluateChallengesAction(groupId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true },
  })
  const timezone = user?.timezone ?? "America/Chicago"

  const currentWeekKey = getWeekKey(new Date(), timezone)

  // Get all challenges for this group that might need status updates
  const challenges = await prisma.groupChallenge.findMany({
    where: {
      groupId,
      status: { in: ["SCHEDULED", "ACTIVE"] },
    },
    include: {
      group: { include: { members: { include: { user: true } } } },
    },
  })

  for (const challenge of challenges) {
    // SCHEDULED -> ACTIVE: If current week matches challenge week
    if (challenge.status === "SCHEDULED" && challenge.weekKey === currentWeekKey) {
      await prisma.groupChallenge.update({
        where: { id: challenge.id },
        data: { status: "ACTIVE" },
      })
    }

    // ACTIVE -> SUCCEEDED/FAILED: If challenge week is in the past
    if (challenge.status === "ACTIVE" && challenge.weekKey < currentWeekKey) {
      // Calculate completion for each member
      const memberCompletions = await calculateMemberCompletions(
        challenge.group.members.map((m) => m.userId),
        groupId,
        challenge.weekKey
      )

      // Check if all members met the threshold
      const allPassed = memberCompletions.every((m) => m.completionPercent >= challenge.threshold)

      if (allPassed) {
        // All passed - rank up the group
        await prisma.$transaction([
          prisma.groupChallenge.update({
            where: { id: challenge.id },
            data: { status: "SUCCEEDED" },
          }),
          prisma.group.update({
            where: { id: groupId },
            data: { rank: { increment: 1 } },
          }),
        ])
      } else {
        // Someone failed
        await prisma.groupChallenge.update({
          where: { id: challenge.id },
          data: { status: "FAILED" },
        })
      }
    }
  }

  revalidatePath("/group")
  return { ok: true }
}

/**
 * Calculate completion percentage for members during a specific week.
 */
async function calculateMemberCompletions(
  userIds: string[],
  groupId: string,
  weekKey: string
): Promise<{ userId: string; completionPercent: number }[]> {
  const results: { userId: string; completionPercent: number }[] = []

  for (const userId of userIds) {
    // Get all goals for this user in this group
    const goals = await prisma.goal.findMany({
      where: { ownerId: userId, groupId, active: true },
      select: {
        id: true,
        cadenceType: true,
        dailyTarget: true,
        weeklyTarget: true,
      },
    })

    if (goals.length === 0) {
      // No goals = 100% (nothing to do)
      results.push({ userId, completionPercent: 100 })
      continue
    }

    // Get check-ins for this week
    const checkIns = await prisma.checkIn.findMany({
      where: {
        userId,
        weekKey,
        goalId: { in: goals.map((g) => g.id) },
      },
      select: { goalId: true, localDateKey: true },
    })

    // Calculate total target and completed for the week
    let totalTarget = 0
    let totalCompleted = 0

    for (const goal of goals) {
      const goalCheckIns = checkIns.filter((c) => c.goalId === goal.id)
      
      if (goal.cadenceType === "WEEKLY") {
        const target = goal.weeklyTarget ?? 1
        totalTarget += target
        totalCompleted += Math.min(goalCheckIns.length, target)
      } else {
        // Daily goal: target is dailyTarget * 7
        const dailyTarget = goal.dailyTarget ?? 1
        const weekTarget = dailyTarget * 7
        totalTarget += weekTarget
        totalCompleted += Math.min(goalCheckIns.length, weekTarget)
      }
    }

    const completionPercent = totalTarget > 0 
      ? Math.round((totalCompleted / totalTarget) * 100)
      : 100

    results.push({ userId, completionPercent })
  }

  return results
}

/**
 * Get the current/pending challenge for a group.
 */
export async function getGroupChallengeAction(groupId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  // Evaluate any pending status transitions first
  await evaluateChallengesAction(groupId)

  // Get challenges (active, scheduled, or pending for current/next week)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true },
  })
  const timezone = user?.timezone ?? "America/Chicago"

  const currentWeekKey = getWeekKey(new Date(), timezone)
  const nextWeekKey = getNextWeekKey(timezone)

  const challenges = await prisma.groupChallenge.findMany({
    where: {
      groupId,
      OR: [
        { weekKey: currentWeekKey },
        { weekKey: nextWeekKey },
        { status: { in: ["PENDING", "SCHEDULED", "ACTIVE"] } },
      ],
    },
    include: {
      approvals: { select: { userId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 1,
  })

  const challenge = challenges[0] ?? null
  const hasApproved = challenge?.approvals.some((a) => a.userId === session.user.id) ?? false

  // Get group member count
  const memberCount = await prisma.groupMember.count({ where: { groupId } })

  // Get group rank
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { rank: true },
  })

  return {
    ok: true,
    challenge: challenge
      ? {
          id: challenge.id,
          weekKey: challenge.weekKey,
          status: challenge.status,
          threshold: challenge.threshold,
          approvalCount: challenge.approvals.length,
          memberCount,
          hasApproved,
          isCurrentWeek: challenge.weekKey === currentWeekKey,
          isNextWeek: challenge.weekKey === nextWeekKey,
        }
      : null,
    groupRank: group?.rank ?? 1,
    currentWeekKey,
  }
}

/**
 * Get challenge results for a completed challenge.
 */
export async function getChallengeResultsAction(challengeId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const challenge = await prisma.groupChallenge.findUnique({
    where: { id: challengeId },
    include: {
      group: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, nickname: true } } },
          },
        },
      },
    },
  })

  if (!challenge) return { ok: false, error: "Challenge not found" }

  if (!["SUCCEEDED", "FAILED"].includes(challenge.status)) {
    return { ok: false, error: "Challenge is not complete" }
  }

  // Get member completion percentages
  const memberCompletions = await calculateMemberCompletions(
    challenge.group.members.map((m) => m.userId),
    challenge.groupId,
    challenge.weekKey
  )

  const results = challenge.group.members.map((m) => {
    const completion = memberCompletions.find((c) => c.userId === m.userId)
    return {
      userId: m.userId,
      name: m.user.nickname ?? m.user.name,
      completionPercent: completion?.completionPercent ?? 0,
      passed: (completion?.completionPercent ?? 0) >= challenge.threshold,
    }
  })

  return {
    ok: true,
    results,
    threshold: challenge.threshold,
    succeeded: challenge.status === "SUCCEEDED",
  }
}
