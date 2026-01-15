"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { checkInGoalAction } from "@/app/actions/checkins"

export function CheckInButton({
  goalId,
  completed,
  label = "Check in",
}: {
  goalId: string
  completed: boolean
  label?: string
}) {
  const [isPending, startTransition] = useTransition()
  const [optimisticDone, setOptimisticDone] = useState(completed)
  const router = useRouter()

  const handleCheckIn = () => {
    if (optimisticDone) return
    setOptimisticDone(true)
    const formData = new FormData()
    formData.set("goalId", goalId)
    startTransition(async () => {
      const result = await checkInGoalAction(formData)
      if (!result.ok) {
        setOptimisticDone(false)
        toast.error(result.error ?? "Could not check in.")
        return
      }
      toast.success("Check-in logged!")
      router.refresh()
    })
  }

  return (
    <Button
      onClick={handleCheckIn}
      disabled={isPending || optimisticDone}
      variant={optimisticDone ? "secondary" : "default"}
    >
      {optimisticDone ? "Done today" : label}
    </Button>
  )
}
