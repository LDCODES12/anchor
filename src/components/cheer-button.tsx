"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { sendCheerAction } from "@/app/actions/cheers"

export function CheerButton({ 
  checkInId,
  userName,
  hasCheered = false,
}: { 
  checkInId: string
  userName: string
  hasCheered?: boolean
}) {
  const [isPending, startTransition] = useTransition()

  if (hasCheered) {
    return (
      <span className="text-[10px] text-muted-foreground">
        👏 Cheered
      </span>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await sendCheerAction(checkInId)
          if (!result.ok) {
            toast.error(result.error ?? "Could not send cheer.")
            return
          }
          toast.success(`Cheered ${userName}!`)
        })
      }
    >
      👏 Cheer
    </Button>
  )
}
