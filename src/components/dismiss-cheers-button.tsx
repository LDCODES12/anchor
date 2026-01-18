"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { dismissCheerAction, dismissAllCheersAction } from "@/app/actions/cheers"
import { X } from "lucide-react"

export function DismissCheerButton({ cheerId }: { cheerId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0 shrink-0"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await dismissCheerAction(cheerId)
        })
      }
    >
      <X className="h-3.5 w-3.5" />
    </Button>
  )
}

export function DismissAllCheersButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs text-muted-foreground"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await dismissAllCheersAction()
        })
      }
    >
      Dismiss all
    </Button>
  )
}
