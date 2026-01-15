import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SettingsForm } from "@/components/settings-form"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/auth/signin")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })
  if (!user) redirect("/auth/signin")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Keep your profile and preferences up to date.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Name:</span> {user.name}
          </div>
          <div>
            <span className="text-muted-foreground">Email:</span> {user.email}
          </div>
        </CardContent>
      </Card>

      <SettingsForm currentTimezone={user.timezone} />

      <Card>
        <CardHeader>
          <CardTitle>Data export</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Export tools are coming soon. For now, reach out to support for a data
          extract.
        </CardContent>
      </Card>
    </div>
  )
}
