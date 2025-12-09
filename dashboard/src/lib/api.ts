// Use relative URL for API calls - nginx will proxy to analytics service
// For local development, use direct connection to analytics service
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:20006/api/v1' : '/api/v1')

export interface MetricAggregation {
  endpoint: string
  method: string
  windowStart: string
  windowEnd: string
  requestCount: number
  rps: number
  p50LatencyMs: number
  p90LatencyMs: number
  p99LatencyMs: number
  minLatencyMs: number
  maxLatencyMs: number
  errorRate: number
  errorCount: number
  successCount: number
  upstreamService: string
}

export interface TopEndpoint {
  endpoint: string
  count: number
}

export const api = {
  async getAggregatedMetrics(): Promise<MetricAggregation[]> {
    const response = await fetch(`${API_BASE_URL}/metrics/aggregated`)
    if (!response.ok) {
      throw new Error('Failed to fetch metrics')
    }
    return response.json()
  },

  async getRPS(): Promise<{ rps: number; window_seconds: number }> {
    const response = await fetch(`${API_BASE_URL}/metrics/rps`)
    if (!response.ok) {
      throw new Error('Failed to fetch RPS')
    }
    return response.json()
  },

  async getTopEndpoints(limit: number = 10): Promise<TopEndpoint[]> {
    const response = await fetch(`${API_BASE_URL}/metrics/top-endpoints?limit=${limit}`)
    if (!response.ok) {
      throw new Error('Failed to fetch top endpoints')
    }
    const data = await response.json()
    return data.map((item: any) => ({
      endpoint: item.endpoint,
      count: item.count,
    }))
  },

  async getEndpointMetrics(endpoint: string, method: string = 'GET'): Promise<MetricAggregation> {
    const response = await fetch(`${API_BASE_URL}/metrics/endpoint/${encodeURIComponent(endpoint)}?method=${method}`)
    if (!response.ok) {
      throw new Error('Failed to fetch endpoint metrics')
    }
    return response.json()
  },

  async getSystemStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'overloaded' | 'critical'
    rps: number
    errorRate: number
    avgLatency: number
    p99Latency: number
    capacity: number
    message: string
  }> {
    const metrics = await this.getAggregatedMetrics()

    const totalRps = metrics.reduce((sum, m) => sum + m.rps, 0)
    const totalRequests = metrics.reduce((sum, m) => sum + m.requestCount, 0)
    const totalErrors = metrics.reduce((sum, m) => sum + m.errorCount, 0)
    const avgErrorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
    const avgLatency = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.p50LatencyMs, 0) / metrics.length
      : 0
    const p99Latency = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.p99LatencyMs, 0) / metrics.length
      : 0

    let status: 'healthy' | 'degraded' | 'overloaded' | 'critical' = 'healthy'
    let capacity = 100
    let message = 'System operating normally'

    if (avgErrorRate > 10 || p99Latency > 2000) {
      status = 'critical'
      capacity = 0
      message = 'System under critical load - immediate attention required'
    } else if (avgErrorRate > 5 || p99Latency > 1000 || totalRps > 1000000) {
      status = 'overloaded'
      capacity = 25
      message = 'System experiencing high load - performance degraded'
    } else if (avgErrorRate > 1 || p99Latency > 500 || totalRps > 500000) {
      status = 'degraded'
      capacity = 60
      message = 'System under moderate load - monitoring recommended'
    }

    if (totalRps > 0) {
      if (totalRps < 100000) {
        capacity = 100
      } else if (totalRps < 500000) {
        capacity = 80
      } else if (totalRps < 1000000) {
        capacity = 50
      } else if (totalRps < 5000000) {
        capacity = 30
      } else {
        capacity = 10
      }
    }

    return {
      status,
      rps: totalRps,
      errorRate: avgErrorRate,
      avgLatency,
      p99Latency,
      capacity,
      message,
    }
  },
}

