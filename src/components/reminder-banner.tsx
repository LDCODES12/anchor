"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { dismissReminderAction } from "@/app/actions/reminders"

type ReminderItem = {
  id: string
  senderName: string
}

export function ReminderBanner({ reminders }: { reminders: ReminderItem[] }) {
  const [isPending, startTransition] = useTransition()

  if (reminders.length === 0) return null

  return (
    <div className="rounded-2xl border bg-background px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Reminders</div>
          <div className="font-medium">
            {reminders
              .map((reminder) => reminder.senderName)
              .join(", ")}{" "}
            nudged you to finish today&apos;s goals.
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await Promise.all(
                reminders.map((reminder) =>
                  dismissReminderAction(reminder.id)
                )
              )
            })
          }
        >
          Mark as read
        </Button>
      </div>
    </div>
  )
}
