"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createGoalAction, deleteGoalAction } from "@/app/actions/goals"
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
import { Undo2 } from "lucide-react"

export function GoalCreateForm() {
  const [cadenceType, setCadenceType] = useState("DAILY")
  const [showDailyTarget, setShowDailyTarget] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [lastCreatedGoalId, setLastCreatedGoalId] = useState<string | null>(null)
  const router = useRouter()
  const formRef = useRef<HTMLFormElement | null>(null)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    formData.set("cadenceType", cadenceType)
    if (!showDailyTarget) {
      formData.delete("dailyTarget")
    }
    startTransition(async () => {
      const result = await createGoalAction(formData)
      if (!result.ok) {
        toast.error(result.error ?? "Could not create goal.")
        return
      }
      setLastCreatedGoalId(result.goalId ?? null)
      toast.success("Goal created!", {
        action: result.goalId ? {
          label: "Undo",
          onClick: () => handleUndo(result.goalId!),
        } : undefined,
      })
      formRef.current?.reset()
      setCadenceType("DAILY")
      setShowDailyTarget(false)
      router.refresh()
    })
  }

  const handleUndo = async (goalId: string) => {
    const result = await deleteGoalAction(goalId)
    if (result.ok) {
      toast.success("Goal removed")
      setLastCreatedGoalId(null)
      router.refresh()
    } else {
      toast.error(result.error ?? "Could not undo")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Create a goal</span>
          {lastCreatedGoalId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => handleUndo(lastCreatedGoalId)}
            >
              <Undo2 className="h-4 w-4 mr-1" />
              Undo last
            </Button>
          )}
        </CardTitle>
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
              <Label htmlFor="weeklyTarget">Times per week</Label>
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
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="multiplePerDay"
                  checked={showDailyTarget}
                  onChange={(e) => setShowDailyTarget(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="multiplePerDay" className="text-sm font-normal cursor-pointer">
                  Requires multiple completions per day
                </Label>
              </div>
              {showDailyTarget && (
                <div className="space-y-2">
                  <Label htmlFor="dailyTarget">Times per day</Label>
                  <Input
                    id="dailyTarget"
                    name="dailyTarget"
                    type="number"
                    min={2}
                    max={10}
                    placeholder="2"
                    defaultValue={2}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    E.g., take medication 3x/day, drink 8 glasses of water
                  </p>
                </div>
              )}
            </div>
          )}
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
