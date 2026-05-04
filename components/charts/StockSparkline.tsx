'use client'

import { useEffect, useState } from 'react'

type ChartData = {
  symbol: string
  points: number[]
  previousClose: number
  last: number
  change: number
  changePct: number
}

type Props = {
  name: string
  width?: number
  height?: number
  className?: string
}

// In-memory dedupe so that re-renders / parallel rows requesting the same
// stock don't fire duplicate requests. Lifetimes match the page; the API
// route handles its own caching across requests.
const cache = new Map<string, Promise<ChartData | null>>()

async function fetchChart(name: string): Promise<ChartData | null> {
  const key = name.toUpperCase()
  if (cache.has(key)) return cache.get(key)!

  const promise = (async () => {
    try {
      const res = await fetch(`/api/stock-chart?name=${encodeURIComponent(name)}`)
      if (!res.ok) return null
      return (await res.json()) as ChartData
    } catch {
      return null
    }
  })()

  cache.set(key, promise)
  return promise
}

export function StockSparkline({ name, width = 80, height = 28, className }: Props) {
  const [data, setData] = useState<ChartData | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    fetchChart(name).then((d) => {
      if (!active) return
      if (d) setData(d)
      else setFailed(true)
    })
    return () => {
      active = false
    }
  }, [name])

  if (failed) {
    return <div className={className} style={{ width, height }} aria-hidden />
  }

  if (!data) {
    return (
      <div
        className={`animate-pulse bg-accent-soft rounded ${className ?? ''}`}
        style={{ width, height }}
        aria-hidden
      />
    )
  }

  const isUp = data.change >= 0
  const stroke = isUp ? 'var(--success)' : 'var(--danger)'
  const fill = isUp ? 'rgba(5, 150, 105, 0.12)' : 'rgba(220, 38, 38, 0.12)'

  const points = data.points
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const stepX = points.length > 1 ? width / (points.length - 1) : 0

  const coords = points.map((p, i) => {
    const x = i * stepX
    const y = height - ((p - min) / span) * height
    return [x, y] as const
  })

  const path = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ')

  const area =
    points.length > 0
      ? `${path} L${(width).toFixed(2)},${height} L0,${height} Z`
      : ''

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-label={`${data.symbol} 1D price chart`}
    >
      <path d={area} fill={fill} stroke="none" />
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
