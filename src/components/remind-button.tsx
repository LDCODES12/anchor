"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function RemindButton({ name }: { name: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => toast(`Sent a friendly reminder to ${name}.`)}
    >
      Remind
    </Button>
  )
}
