"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function sendCheerAction(checkInId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  // Can't cheer your own check-in
  const checkIn = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    include: { user: true, goal: true },
  })
  if (!checkIn) return { ok: false, error: "Check-in not found." }
  
  if (checkIn.userId === session.user.id) {
    return { ok: false, error: "You can't cheer yourself." }
  }

  // Check if already cheered
  const existing = await prisma.cheer.findUnique({
    where: {
      checkInId_senderId: {
        checkInId,
        senderId: session.user.id,
      },
    },
  })
  if (existing) {
    return { ok: false, error: "Already cheered." }
  }

  await prisma.cheer.create({
    data: {
      checkInId,
      senderId: session.user.id,
    },
  })

  revalidatePath("/group")
  return { ok: true, userName: checkIn.user.name }
}

/**
 * Dismiss a cheer notification (mark as read)
 */
export async function dismissCheerAction(cheerId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  // Only the recipient (check-in owner) can dismiss their cheers
  await prisma.cheer.updateMany({
    where: {
      id: cheerId,
      checkIn: { userId: session.user.id },
      readAt: null,
    },
    data: { readAt: new Date() },
  })

  revalidatePath("/dashboard")
  return { ok: true }
}

/**
 * Dismiss all cheer notifications for the current user
 */
export async function dismissAllCheersAction() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  await prisma.cheer.updateMany({
    where: {
      checkIn: { userId: session.user.id },
      readAt: null,
    },
    data: { readAt: new Date() },
  })

  revalidatePath("/dashboard")
  return { ok: true }
}
