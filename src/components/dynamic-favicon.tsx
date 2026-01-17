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
      canvasRef.current.width = 64
      canvasRef.current.height = 64
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, 64, 64)

    // Background circle (track)
    const centerX = 32
    const centerY = 24
    const radius = 20
    const lineWidth = 6

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
    ctx.font = "bold 14px system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(`${Math.round(completionPercent)}%`, centerX, centerY)

    // Draw points below
    ctx.fillStyle = "#6b7280" // gray-500
    ctx.font = "bold 11px system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    
    // Format points (e.g., 1.2k for 1234)
    const pointsText = points >= 1000 
      ? `${(points / 1000).toFixed(1)}k` 
      : `${points}`
    ctx.fillText(pointsText, centerX, 50)

    // Convert canvas to favicon
    const faviconUrl = canvas.toDataURL("image/png")

    // Update or create favicon link
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement("link")
      link.rel = "icon"
      link.type = "image/png"
      document.head.appendChild(link)
    }
    link.href = faviconUrl

    // Also update apple-touch-icon for iOS
    let appleLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
    if (!appleLink) {
      appleLink = document.createElement("link")
      appleLink.rel = "apple-touch-icon"
      document.head.appendChild(appleLink)
    }
    appleLink.href = faviconUrl

  }, [completionPercent, points])

  // This component doesn't render anything visible
  return null
}
