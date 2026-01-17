"use client"

import { useEffect } from "react"

interface DynamicFaviconProps {
  completionPercent: number // 0-100
  points: number
}

export function DynamicFavicon({ completionPercent, points }: DynamicFaviconProps) {
  useEffect(() => {
    const updateFavicon = () => {
      const canvas = document.createElement("canvas")
      canvas.width = 32
      canvas.height = 32
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // White background
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, 32, 32)

      // Background circle track
      ctx.beginPath()
      ctx.arc(16, 16, 12, 0, 2 * Math.PI)
      ctx.strokeStyle = "#d1d5db"
      ctx.lineWidth = 4
      ctx.stroke()

      // Progress arc
      const progress = Math.min(100, Math.max(0, completionPercent)) / 100
      if (progress > 0) {
        ctx.beginPath()
        ctx.arc(16, 16, 12, -Math.PI / 2, -Math.PI / 2 + progress * 2 * Math.PI)
        ctx.strokeStyle = progress >= 0.66 ? "#22c55e" : progress >= 0.33 ? "#eab308" : "#ef4444"
        ctx.lineWidth = 4
        ctx.lineCap = "round"
        ctx.stroke()
      }

      // Percentage text
      ctx.fillStyle = "#374151"
      ctx.font = "bold 10px Arial"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(String(Math.round(completionPercent)), 16, 16)

      // Set favicon
      const dataUrl = canvas.toDataURL("image/png")
      
      // Remove ALL existing favicons
      document.querySelectorAll('link[rel*="icon"]').forEach(el => el.remove())
      
      // Add new favicon
      const link = document.createElement("link")
      link.rel = "icon"
      link.type = "image/png"
      link.href = dataUrl
      document.head.appendChild(link)
    }

    // Run immediately and after a short delay (for hydration)
    updateFavicon()
    const timer = setTimeout(updateFavicon, 500)
    
    return () => clearTimeout(timer)
  }, [completionPercent, points])

  return null
}
