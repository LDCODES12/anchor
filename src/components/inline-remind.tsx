"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { sendReminderAction } from "@/app/actions/reminders"

export function InlineRemind({
  recipientId,
  recipientName,
  goalName,
}: {
  recipientId: string
  recipientName: string
  goalName: string
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      disabled={isPending}
      className="text-[10px] text-muted-foreground hover:text-primary hover:underline disabled:opacity-50"
      onClick={() =>
        startTransition(async () => {
          const result = await sendReminderAction({ recipientId, goalName })
          if (!result.ok) {
            toast.error(result.error ?? "Could not send reminder.")
            return
          }
          toast.success(`Reminded ${recipientName} about ${goalName}`)
        })
      }
    >
      remind
    </button>
  )
}
