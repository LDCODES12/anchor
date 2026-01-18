"use client"

const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"]

// Pre-computed deterministic values for confetti pieces (avoids Math.random in render)
const CONFETTI_PIECES = [
  { id: 0, left: 15, delay: 0, rotate: -20 },
  { id: 1, left: 45, delay: 25, rotate: 15 },
  { id: 2, left: 75, delay: 50, rotate: -35 },
  { id: 3, left: 30, delay: 75, rotate: 25 },
  { id: 4, left: 60, delay: 100, rotate: -10 },
  { id: 5, left: 90, delay: 20, rotate: 30 },
  { id: 6, left: 20, delay: 60, rotate: -25 },
  { id: 7, left: 50, delay: 90, rotate: 40 },
  { id: 8, left: 80, delay: 40, rotate: -15 },
  { id: 9, left: 35, delay: 110, rotate: 20 },
].map((p, i) => ({ ...p, color: colors[i % colors.length] }))

export function ConfettiBurst() {
  const pieces = CONFETTI_PIECES

  return (
    <div className="confetti-burst absolute -right-1 top-1/2 h-1 w-1">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}px`,
            top: "-12px",
            background: piece.color,
            transform: `rotate(${piece.rotate}deg)`,
            animationDelay: `${piece.delay}ms`,
          }}
        />
      ))}
    </div>
  )
}
