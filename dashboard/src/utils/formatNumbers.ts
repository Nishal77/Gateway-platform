/**
 * Enterprise-level number formatting utilities
 * Formats large numbers with K (thousands), M (millions), B (billions) suffixes
 */

export function formatNumber(num: number, decimals: number = 2): string {
  if (num === 0) return '0'
  if (isNaN(num) || !isFinite(num)) return '0'
  
  const absNum = Math.abs(num)
  const sign = num < 0 ? '-' : ''
  
  if (absNum < 1000) {
    return sign + absNum.toFixed(decimals === 0 ? 0 : Math.min(decimals, 2))
  }
  
  if (absNum < 1_000_000) {
    const k = absNum / 1000
    return sign + k.toFixed(decimals === 0 ? 1 : Math.min(decimals, 1)) + 'K'
  }
  
  if (absNum < 1_000_000_000) {
    const m = absNum / 1_000_000
    return sign + m.toFixed(decimals === 0 ? 1 : Math.min(decimals, 2)) + 'M'
  }
  
  if (absNum < 1_000_000_000_000) {
    const b = absNum / 1_000_000_000
    return sign + b.toFixed(decimals === 0 ? 1 : Math.min(decimals, 2)) + 'B'
  }
  
  // For trillions and above
  const t = absNum / 1_000_000_000_000
  return sign + t.toFixed(decimals === 0 ? 1 : Math.min(decimals, 2)) + 'T'
}

export function formatRPS(rps: number): string {
  return formatNumber(rps, 2)
}

export function formatRequests(count: number): string {
  if (count < 1000) {
    return count.toLocaleString()
  }
  return formatNumber(count, 1)
}

