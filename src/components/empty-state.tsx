import { Button } from "@/components/ui/button"

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-8 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {actionHref && actionLabel ? (
        <Button asChild className="mt-4">
          <a href={actionHref}>{actionLabel}</a>
        </Button>
      ) : null}
    </div>
  )
}
