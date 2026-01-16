"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createGoalAction } from "@/app/actions/goals"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function GoalCreateForm() {
  const [cadenceType, setCadenceType] = useState("DAILY")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const formRef = useRef<HTMLFormElement | null>(null)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    formData.set("cadenceType", cadenceType)
    startTransition(async () => {
      const result = await createGoalAction(formData)
      if (!result.ok) {
        toast.error(result.error ?? "Could not create goal.")
        return
      }
      toast.success("Goal created!")
      formRef.current?.reset()
      setCadenceType("DAILY")
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a goal</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Goal name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Read 10 pages"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Cadence</Label>
            <Select value={cadenceType} onValueChange={setCadenceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly target</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {cadenceType === "WEEKLY" ? (
            <div className="space-y-2">
              <Label htmlFor="weeklyTarget">Weekly target</Label>
              <Input
                id="weeklyTarget"
                name="weeklyTarget"
                type="number"
                min={1}
                max={14}
                placeholder="3"
                required
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Add a tip or why this matters."
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Create goal"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
