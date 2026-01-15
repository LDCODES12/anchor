"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { updateReminderSchema, updateTimezoneSchema } from "@/lib/validators"

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
