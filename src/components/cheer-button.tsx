"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function CheerButton({ name }: { name: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => toast.success(`Cheered ${name}!`)}
    >
      👏 Cheer
    </Button>
  )
}
