"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { sendReminderAction } from "@/app/actions/reminders"

export function RemindButton({
  recipientId,
  recipientName,
  disabled,
}: {
  recipientId: string
  recipientName: string
  disabled?: boolean
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await sendReminderAction({ recipientId })
          if (!result.ok) {
            toast.error(result.error ?? "Could not send reminder.")
            return
          }
          toast.success(`Reminder sent to ${recipientName}.`)
        })
      }
    >
      Remind
    </Button>
  )
}
