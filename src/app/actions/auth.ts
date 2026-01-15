"use server"

import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { signUpSchema } from "@/lib/validators"

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), ms)
    ),
  ])
}

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

  try {
    const existing = await withTimeout(
      prisma.user.findUnique({
        where: { email: parsed.data.email },
      }),
      8000
    )
    if (existing) {
      return { ok: false, error: "Email already in use." }
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10)
    await withTimeout(
      prisma.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash,
        },
      }),
      8000
    )

    return { ok: true }
  } catch (error) {
    console.error("Sign up failed", error)
    return {
      ok: false,
      error:
        error instanceof Error && error.message === "Request timed out"
          ? "Signup is taking too long. Please try again."
          : "Could not create account. Try again.",
    }
  }
}
