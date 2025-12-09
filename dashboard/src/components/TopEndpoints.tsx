import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { api, MetricAggregation } from '../lib/api'
import { AlertTriangle, XCircle, CheckCircle2, Loader2, Zap } from 'lucide-react'
import { formatRPS, formatRequests } from '../utils/formatNumbers'

interface TopEndpoint {
  endpoint: string
  method: string
  rps: number
  totalRequests: number
  errorRate: number
  p99Latency: number
  upstreamService: string
  capacityStatus: 'healthy' | 'warning' | 'critical' | 'overloaded'
  capacityPercentage: number
  canHandleMore: boolean
}

export function TopEndpoints() {
  const [endpoints, setEndpoints] = useState<TopEndpoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEndpoints = async () => {
      try {
        const metrics = await api.getAggregatedMetrics()
        
        const endpointData: TopEndpoint[] = metrics
          .map((metric: MetricAggregation) => {
            // Determine capacity status based on multiple factors
            let capacityStatus: 'healthy' | 'warning' | 'critical' | 'overloaded' = 'healthy'
            let capacityPercentage = 100
            let canHandleMore = true
            
            // Calculate capacity based on error rate, latency, and RPS
            const errorRate = metric.errorRate
            const p99Latency = metric.p99LatencyMs
            const rps = metric.rps
            
            // Critical: High error rate or very high latency
            if (errorRate > 10 || p99Latency > 2000) {
              capacityStatus = 'critical'
              capacityPercentage = 0
              canHandleMore = false
            }
            // Overloaded: High error rate or high latency
            else if (errorRate > 5 || p99Latency > 1000 || rps > 50000) {
              capacityStatus = 'overloaded'
              capacityPercentage = 20
              canHandleMore = false
            }
            // Warning: Moderate issues
            else if (errorRate > 1 || p99Latency > 500 || rps > 25000) {
              capacityStatus = 'warning'
              capacityPercentage = 60
              canHandleMore = true
            }
            // Healthy: Normal operation
            else {
              capacityStatus = 'healthy'
              // Estimate capacity based on RPS (assuming max capacity around 100k RPS per endpoint)
              if (rps > 0) {
                capacityPercentage = Math.max(10, 100 - (rps / 100000) * 100)
              } else {
                capacityPercentage = 100
              }
              canHandleMore = true
            }
            
            return {
              endpoint: metric.endpoint,
              method: metric.method,
              rps: metric.rps,
              totalRequests: metric.requestCount,
              errorRate: metric.errorRate,
              p99Latency: metric.p99LatencyMs,
              upstreamService: metric.upstreamService || 'unknown',
              capacityStatus,
              capacityPercentage,
              canHandleMore,
            }
          })
          .sort((a, b) => b.rps - a.rps) // Sort by RPS descending
          .slice(0, 4) // Top 4 only
        
        setEndpoints(endpointData)
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch top endpoints:', error)
        setLoading(false)
      }
    }

    fetchEndpoints()
    const interval = setInterval(fetchEndpoints, 2000)

    return () => clearInterval(interval)
  }, [])

  const getCapacityIcon = (status: string, canHandleMore: boolean) => {
    if (!canHandleMore) {
      return <XCircle className="h-5 w-5 text-red-500" />
    }
    switch (status) {
      case 'critical':
      case 'overloaded':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
    }
  }

  const getCapacityColor = (status: string) => {
    switch (status) {
      case 'critical':
      case 'overloaded':
        return 'bg-red-500'
      case 'warning':
        return 'bg-yellow-500'
      default:
        return 'bg-green-500'
    }
  }

  const getCapacityText = (status: string, canHandleMore: boolean) => {
    if (!canHandleMore) {
      return { text: "Can't Handle More", color: 'text-red-500' }
    }
    switch (status) {
      case 'critical':
      case 'overloaded':
        return { text: 'Overloaded', color: 'text-red-500' }
      case 'warning':
        return { text: 'Near Capacity', color: 'text-yellow-500' }
      default:
        return { text: 'Healthy', color: 'text-green-500' }
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top 4 Most Visited Endpoints</CardTitle>
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
        <CardTitle>Top 4 Most Visited Endpoints</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Most requested endpoints with capacity status
        </p>
      </CardHeader>
      <CardContent>
        {endpoints.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No endpoint data available
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {endpoints.map((endpoint, idx) => {
              const capacityInfo = getCapacityText(endpoint.capacityStatus, endpoint.canHandleMore)
              return (
                <div
                  key={`${endpoint.method}-${endpoint.endpoint}-${idx}`}
                  className="p-4 rounded-lg border bg-card hover:shadow-md transition-all"
                >
                  {/* Header with rank and status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">#{idx + 1}</span>
                      </div>
                      {getCapacityIcon(endpoint.capacityStatus, endpoint.canHandleMore)}
                    </div>
                    <div className={`text-xs font-semibold px-2 py-1 rounded ${capacityInfo.color} bg-opacity-10`}>
                      {capacityInfo.text}
                    </div>
                  </div>

                  {/* Endpoint info */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs px-1.5 py-0.5 bg-muted rounded">
                        {endpoint.method}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {endpoint.upstreamService}
                      </span>
                    </div>
                    <div className="font-semibold text-sm truncate" title={endpoint.endpoint}>
                      {endpoint.endpoint}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">RPS</span>
                      <span className="font-semibold flex items-center gap-1">
                        <Zap className="h-3 w-3 text-blue-500" />
                        {formatRPS(endpoint.rps)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Requests</span>
                      <span className="font-semibold">
                        {formatRequests(endpoint.totalRequests)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Error Rate</span>
                      <span className={`font-semibold ${endpoint.errorRate > 5 ? 'text-red-500' : endpoint.errorRate > 1 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {endpoint.errorRate.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">P99 Latency</span>
                      <span className={`font-semibold ${endpoint.p99Latency > 1000 ? 'text-red-500' : endpoint.p99Latency > 500 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {endpoint.p99Latency.toFixed(0)}ms
                      </span>
                    </div>
                  </div>

                  {/* Capacity indicator */}
                  <div className="mt-4 pt-3 border-t">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Capacity</span>
                      <span className={`text-xs font-semibold ${capacityInfo.color}`}>
                        {endpoint.capacityPercentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getCapacityColor(endpoint.capacityStatus)}`}
                        style={{ width: `${Math.min(endpoint.capacityPercentage, 100)}%` }}
                      />
                    </div>
                    {!endpoint.canHandleMore && (
                      <div className="mt-2 text-xs text-red-500 font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Cannot handle more requests
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

