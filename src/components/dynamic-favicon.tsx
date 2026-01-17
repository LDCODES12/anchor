"use client"

import { useEffect, useRef } from "react"

interface DynamicFaviconProps {
  completionPercent: number // 0-100
  points: number
}

export function DynamicFavicon({ completionPercent, points }: DynamicFaviconProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    // Create canvas if it doesn't exist
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas")
      canvasRef.current.width = 32
      canvasRef.current.height = 32
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const size = 32

    // Clear canvas with white background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, size, size)

    // Background circle (track)
    const centerX = size / 2
    const centerY = size / 2
    const radius = 12
    const lineWidth = 4

    // Draw background track
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.strokeStyle = "#e5e7eb" // gray-200
    ctx.lineWidth = lineWidth
    ctx.stroke()

    // Draw progress arc
    const progress = Math.min(100, Math.max(0, completionPercent)) / 100
    const startAngle = -Math.PI / 2 // Start from top
    const endAngle = startAngle + progress * 2 * Math.PI

    if (progress > 0) {
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      // Color based on progress: red < 33%, yellow < 66%, green >= 66%
      if (progress >= 0.66) {
        ctx.strokeStyle = "#22c55e" // green-500
      } else if (progress >= 0.33) {
        ctx.strokeStyle = "#eab308" // yellow-500
      } else {
        ctx.strokeStyle = "#ef4444" // red-500
      }
      ctx.lineWidth = lineWidth
      ctx.lineCap = "round"
      ctx.stroke()
    }

    // Draw percentage text in center
    ctx.fillStyle = "#1f2937" // gray-800
    ctx.font = "bold 9px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(`${Math.round(completionPercent)}`, centerX, centerY)

    // Convert canvas to favicon
    const faviconUrl = canvas.toDataURL("image/png")

    // Remove any existing favicon links first
    const existingLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
    existingLinks.forEach(link => link.remove())

    // Create new favicon link
    const link = document.createElement("link")
    link.rel = "icon"
    link.type = "image/png"
    link.href = faviconUrl
    document.head.appendChild(link)

  }, [completionPercent, points])

  // This component doesn't render anything visible
  return null
}
