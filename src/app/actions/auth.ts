"use server"

import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { signUpSchema } from "@/lib/validators"

export async function signUpAction(formData: FormData) {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  }
  const parsed = signUpSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message }
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  })
  if (existing) {
    return { ok: false, error: "Email already in use." }
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    },
  })

  return { ok: true }
}
