import { useState, useEffect } from 'react'
import { api, MetricAggregation } from '../lib/api'

export function useMetrics(refreshInterval: number = 2000) {
  const [metrics, setMetrics] = useState<MetricAggregation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setError(null)
        const data = await api.getAggregatedMetrics()
        setMetrics(data)
        setLoading(false)
      } catch (err) {
        setError(err as Error)
        setLoading(false)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval])

  return { metrics, loading, error }
}

