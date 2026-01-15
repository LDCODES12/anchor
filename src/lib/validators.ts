import { z } from "zod"

export const signUpSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const createGroupSchema = z.object({
  name: z.string().min(2),
})

export const joinGroupSchema = z.object({
  inviteCode: z.string().min(4),
})

export const createGoalSchema = z.object({
  name: z.string().min(2),
  cadenceType: z.enum(["DAILY", "WEEKLY"]),
  weeklyTarget: z.coerce.number().int().min(1).max(14).optional(),
  notes: z.string().max(280).optional(),
})

export const checkInSchema = z.object({
  goalId: z.string().cuid(),
})

export const updateTimezoneSchema = z.object({
  timezone: z.string().min(3),
})
