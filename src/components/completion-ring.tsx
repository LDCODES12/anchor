export function CompletionRing({
  value,
  label,
}: {
  value: number
  label: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full text-sm font-semibold"
        style={{
          background: `conic-gradient(var(--primary) ${clamped}%, var(--muted) 0)`,
        }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-xs">
          {clamped}%
        </div>
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
