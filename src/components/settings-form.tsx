"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateTimezoneAction } from "@/app/actions/settings"
import { leaveGroupAction } from "@/app/actions/groups"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

const timezones = [
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
]

export function SettingsForm({ currentTimezone }: { currentTimezone: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleTimezone = (value: string) => {
    const formData = new FormData()
    formData.set("timezone", value)
    startTransition(async () => {
      const result = await updateTimezoneAction(formData)
      if (!result.ok) {
        toast.error(result.error ?? "Could not update timezone.")
        return
      }
      toast.success("Timezone updated.")
      router.refresh()
    })
  }

  const handleLeaveGroup = () => {
    startTransition(async () => {
      const result = await leaveGroupAction()
      if (!result.ok) {
        toast.error(result.error ?? "Could not leave group.")
        return
      }
      toast.success("You left the group.")
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Timezone</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={currentTimezone} onValueChange={handleTimezone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Mobile push notifications are coming soon. We’ll let you know when
            friends check in.
          </div>
          <Switch disabled />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Group membership</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Leave your current group. This won’t delete your account.</p>
          <Button
            variant="destructive"
            onClick={handleLeaveGroup}
            disabled={isPending}
          >
            Leave group
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
