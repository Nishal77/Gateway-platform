import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { api, MetricAggregation } from '../lib/api'
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react'

interface EndpointHealth {
  endpoint: string
  method: string
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  rps: number
  errorRate: number
  p99Latency: number
  lastSeen: number
  upstreamService: string
}

export function EndpointStatus() {
  const [endpoints, setEndpoints] = useState<EndpointHealth[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEndpoints = async () => {
      try {
        const metrics = await api.getAggregatedMetrics()
        const now = Date.now()
        
        const endpointMap = new Map<string, EndpointHealth>()
        
        metrics.forEach((metric: MetricAggregation) => {
          const key = `${metric.method}:${metric.endpoint}`
          const windowEnd = new Date(metric.windowEnd).getTime()
          const timeSinceLastRequest = now - windowEnd
          
          // Determine status based on metrics
          let status: 'healthy' | 'degraded' | 'down' | 'unknown' = 'unknown'
          
          // If no requests in last 60 seconds, consider it down
          if (timeSinceLastRequest > 60000) {
            status = 'down'
          } else if (metric.errorRate > 10 || metric.p99LatencyMs > 2000) {
            status = 'down'
          } else if (metric.errorRate > 5 || metric.p99LatencyMs > 1000) {
            status = 'degraded'
          } else if (metric.rps > 0) {
            status = 'healthy'
          }
          
          endpointMap.set(key, {
            endpoint: metric.endpoint,
            method: metric.method,
            status,
            rps: metric.rps,
            errorRate: metric.errorRate,
            p99Latency: metric.p99LatencyMs,
            lastSeen: timeSinceLastRequest,
            upstreamService: metric.upstreamService || 'unknown',
          })
        })
        
        setEndpoints(Array.from(endpointMap.values()))
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch endpoint status:', error)
        setLoading(false)
      }
    }

    fetchEndpoints()
    const interval = setInterval(fetchEndpoints, 2000)

    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'degraded':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'down':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  const formatTimeAgo = (ms: number) => {
    if (ms < 1000) return 'just now'
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  const healthyCount = endpoints.filter(e => e.status === 'healthy').length
  const degradedCount = endpoints.filter(e => e.status === 'degraded').length
  const downCount = endpoints.filter(e => e.status === 'down').length

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Endpoint Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Endpoint Health</CardTitle>
        <div className="flex gap-4 text-sm mt-2">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">Healthy: {healthyCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-muted-foreground">Degraded: {degradedCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-muted-foreground">Down: {downCount}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {endpoints.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No endpoints detected
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {endpoints
              .sort((a, b) => {
                // Sort: down first, then degraded, then healthy
                const statusOrder = { down: 0, degraded: 1, healthy: 2, unknown: 3 }
                return statusOrder[a.status] - statusOrder[b.status]
              })
              .map((endpoint, idx) => (
                <div
                  key={`${endpoint.method}-${endpoint.endpoint}-${idx}`}
                  className={`p-3 rounded-lg border ${getStatusColor(endpoint.status)} transition-all hover:shadow-md`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(endpoint.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs px-1.5 py-0.5 bg-muted rounded">
                            {endpoint.method}
                          </span>
                          <span className="font-semibold text-sm truncate">
                            {endpoint.endpoint}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {endpoint.upstreamService}
                        </div>
                        <div className="flex gap-4 text-xs">
                          <span>RPS: <strong>{endpoint.rps.toFixed(1)}</strong></span>
                          <span>Errors: <strong className={endpoint.errorRate > 5 ? 'text-red-500' : ''}>{endpoint.errorRate.toFixed(2)}%</strong></span>
                          <span>P99: <strong className={endpoint.p99Latency > 1000 ? 'text-red-500' : ''}>{endpoint.p99Latency.toFixed(0)}ms</strong></span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground ml-2">
                      {formatTimeAgo(endpoint.lastSeen)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

