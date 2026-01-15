"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createGroupAction, joinGroupAction } from "@/app/actions/groups"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function GroupSetup() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await createGroupAction(formData)
      if (!result.ok) {
        toast.error(result.error ?? "Could not create group.")
        return
      }
      toast.success("Group created!")
      router.refresh()
    })
  }

  const handleJoin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await joinGroupAction(formData)
      if (!result.ok) {
        toast.error(result.error ?? "Could not join group.")
        return
      }
      toast.success("Joined the group!")
      router.refresh()
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Create a group</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-2">
              <Label htmlFor="name">Group name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Lab Accountability"
                required
              />
            </div>
            <Button type="submit" disabled={isPending}>
              Create group
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Join with invite code</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleJoin}>
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite code</Label>
              <Input
                id="inviteCode"
                name="inviteCode"
                placeholder="GG-AB12"
                required
              />
            </div>
            <Button type="submit" variant="outline" disabled={isPending}>
              Join group
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
