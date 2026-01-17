"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { updateReminderSchema, updateTimezoneSchema } from "@/lib/validators"

const updateNicknameSchema = z.object({
  nickname: z.string().max(30).optional(),
})

export async function updateTimezoneAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const parsed = updateTimezoneSchema.safeParse({
    timezone: formData.get("timezone"),
  })
  if (!parsed.success) return { ok: false, error: "Invalid timezone" }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { timezone: parsed.data.timezone },
  })

  revalidatePath("/settings")
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function updateReminderAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const parsed = updateReminderSchema.safeParse({
    reminderTime: formData.get("reminderTime"),
    reminderFrequency: formData.get("reminderFrequency"),
  })
  if (!parsed.success) return { ok: false, error: "Invalid reminder settings" }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      reminderTime: parsed.data.reminderTime,
      reminderFrequency: parsed.data.reminderFrequency,
    },
  })

  revalidatePath("/settings")
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function updateNicknameAction(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }

  const nicknameValue = formData.get("nickname")
  const parsed = updateNicknameSchema.safeParse({
    nickname: nicknameValue === "" ? null : nicknameValue,
  })
  if (!parsed.success) return { ok: false, error: "Nickname must be 30 characters or less" }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { nickname: parsed.data.nickname || null },
  })

  revalidatePath("/settings")
  revalidatePath("/dashboard")
  revalidatePath("/group")
  return { ok: true }
}
