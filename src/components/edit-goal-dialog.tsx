"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { editGoalAction } from "@/app/actions/goals"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Pencil } from "lucide-react"

interface EditGoalDialogProps {
  goal: {
    id: string
    name: string
    notes: string | null
    cadenceType: "DAILY" | "WEEKLY"
    weeklyTarget: number | null
    dailyTarget: number
  }
  trigger?: React.ReactNode
}

export function EditGoalDialog({ goal, trigger }: EditGoalDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const [name, setName] = useState(goal.name)
  const [notes, setNotes] = useState(goal.notes ?? "")
  const [cadenceType, setCadenceType] = useState<"DAILY" | "WEEKLY">(goal.cadenceType)
  const [weeklyTarget, setWeeklyTarget] = useState(goal.weeklyTarget?.toString() ?? "3")
  const [dailyTarget, setDailyTarget] = useState(goal.dailyTarget.toString())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    startTransition(async () => {
      const result = await editGoalAction({
        goalId: goal.id,
        name,
        notes: notes || null,
        cadenceType,
        weeklyTarget: cadenceType === "WEEKLY" ? parseInt(weeklyTarget) : null,
        dailyTarget: parseInt(dailyTarget) || 1,
      })

      if (!result.ok) {
        toast.error(result.error ?? "Could not update goal.")
        return
      }

      toast.success("Goal updated")
      setOpen(false)
      router.refresh()
    })
  }

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setName(goal.name)
      setNotes(goal.notes ?? "")
      setCadenceType(goal.cadenceType)
      setWeeklyTarget(goal.weeklyTarget?.toString() ?? "3")
      setDailyTarget(goal.dailyTarget.toString())
    }
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
            <DialogDescription>
              Make changes to your goal. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Exercise daily"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cadenceType">Frequency</Label>
              <Select value={cadenceType} onValueChange={(v) => setCadenceType(v as "DAILY" | "WEEKLY")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {cadenceType === "WEEKLY" && (
              <div className="grid gap-2">
                <Label htmlFor="weeklyTarget">Times per week</Label>
                <Select value={weeklyTarget} onValueChange={setWeeklyTarget}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n}x per week
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {cadenceType === "DAILY" && (
              <div className="grid gap-2">
                <Label htmlFor="dailyTarget">Times per day</Label>
                <Select value={dailyTarget} onValueChange={setDailyTarget}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n === 1 ? "Once" : `${n}x per day`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this goal..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
