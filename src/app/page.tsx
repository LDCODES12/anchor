import { getServerSession } from "next-auth"
import Link from "next/link"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { Button } from "@/components/ui/button"

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (session?.user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="text-lg font-semibold">GoalGrid</div>
        <div className="flex items-center gap-3">
          <Link href="/auth/signin" className="text-sm text-muted-foreground">
            Sign in
          </Link>
          <Button asChild>
            <Link href="/auth/signup">Get started</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-6xl gap-12 px-6 pb-20 pt-12 md:grid-cols-2 md:items-center">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Science-based accountability, built for friends.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            GoalGrid blends streaks, weekly targets, and simple check-ins into a
            clean, motivating system. Stay consistent, see your progress, and
            keep each other on track.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg">
              <Link href="/auth/signup">Create your account</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/auth/signin">I already have one</Link>
            </Button>
          </div>
          <div className="mt-6 text-sm text-muted-foreground">
            Built for small groups. Daily habits, weekly goals, shared wins.
          </div>
        </div>
        <div className="rounded-3xl border bg-card p-8 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border bg-background p-4">
              <div className="text-sm text-muted-foreground">This week</div>
              <div className="mt-2 text-3xl font-semibold">86 points</div>
              <div className="mt-4 h-2 w-full rounded-full bg-muted">
                <div className="h-2 w-3/4 rounded-full bg-primary" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                +12 bonus for 7-day streak
              </div>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <div className="text-sm text-muted-foreground">
                Accountability crew
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-medium">Lab Notes</span>
                <span className="text-xs text-muted-foreground">
                  4/5 check-ins
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-medium">Experiments</span>
                <span className="text-xs text-muted-foreground">
                  2/3 check-ins
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
