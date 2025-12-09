import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { api, MetricAggregation } from '../lib/api'
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'
import { formatRPS, formatRequests } from '../utils/formatNumbers'

interface EndpointLoad {
  endpoint: string
  method: string
  rps: number
  totalRequests: number
  errorRate: number
  p50Latency: number
  p99Latency: number
  upstreamService: string
  loadPercentage: number
  trend: 'up' | 'down' | 'stable'
}

export function EndpointLoadTable() {
  const [endpoints, setEndpoints] = useState<EndpointLoad[]>([])
  const [loading, setLoading] = useState(true)
  const [previousData, setPreviousData] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    const fetchEndpoints = async () => {
      try {
        const metrics = await api.getAggregatedMetrics()
        
        // Calculate total RPS for load percentage
        const totalRps = metrics.reduce((sum: number, m: MetricAggregation) => sum + m.rps, 0)
        
        const endpointLoads: EndpointLoad[] = metrics.map((metric: MetricAggregation) => {
          const key = `${metric.method}:${metric.endpoint}`
          const previousRps = previousData.get(key) || 0
          const currentRps = metric.rps
          
          let trend: 'up' | 'down' | 'stable' = 'stable'
          if (currentRps > previousRps * 1.1) {
            trend = 'up'
          } else if (currentRps < previousRps * 0.9) {
            trend = 'down'
          }
          
          const loadPercentage = totalRps > 0 ? (metric.rps / totalRps) * 100 : 0
          
          return {
            endpoint: metric.endpoint,
            method: metric.method,
            rps: metric.rps,
            totalRequests: metric.requestCount,
            errorRate: metric.errorRate,
            p50Latency: metric.p50LatencyMs,
            p99Latency: metric.p99LatencyMs,
            upstreamService: metric.upstreamService || 'unknown',
            loadPercentage,
            trend,
          }
        })
        
        // Update previous data for trend calculation
        const newPreviousData = new Map<string, number>()
        endpointLoads.forEach(e => {
          newPreviousData.set(`${e.method}:${e.endpoint}`, e.rps)
        })
        setPreviousData(newPreviousData)
        
        // Sort by RPS descending
        endpointLoads.sort((a, b) => b.rps - a.rps)
        
        setEndpoints(endpointLoads)
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch endpoint load:', error)
        setLoading(false)
      }
    }

    fetchEndpoints()
    const interval = setInterval(fetchEndpoints, 2000)

    return () => clearInterval(interval)
  }, [previousData])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const getLoadColor = (percentage: number) => {
    if (percentage > 30) return 'bg-red-500'
    if (percentage > 15) return 'bg-orange-500'
    if (percentage > 5) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Endpoint Load Distribution</CardTitle>
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
        <CardTitle>Endpoint Load Distribution</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time load metrics per endpoint
        </p>
      </CardHeader>
      <CardContent>
        {endpoints.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No endpoint data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-left p-2 text-xs font-semibold text-muted-foreground">Method</th>
                  <th className="text-left p-2 text-xs font-semibold text-muted-foreground">Endpoint</th>
                  <th className="text-right p-2 text-xs font-semibold text-muted-foreground">RPS</th>
                  <th className="text-right p-2 text-xs font-semibold text-muted-foreground">Load %</th>
                  <th className="text-right p-2 text-xs font-semibold text-muted-foreground">Requests</th>
                  <th className="text-right p-2 text-xs font-semibold text-muted-foreground">Error Rate</th>
                  <th className="text-right p-2 text-xs font-semibold text-muted-foreground">P50</th>
                  <th className="text-right p-2 text-xs font-semibold text-muted-foreground">P99</th>
                  <th className="text-left p-2 text-xs font-semibold text-muted-foreground">Service</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((endpoint, idx) => (
                  <tr
                    key={`${endpoint.method}-${endpoint.endpoint}-${idx}`}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-2">
                      {getTrendIcon(endpoint.trend)}
                    </td>
                    <td className="p-2">
                      <span className="font-mono text-xs px-1.5 py-0.5 bg-muted rounded">
                        {endpoint.method}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="font-medium text-sm max-w-[300px] truncate" title={endpoint.endpoint}>
                        {endpoint.endpoint}
                      </div>
                    </td>
                    <td className="p-2 text-right">
                      <span className="font-semibold">{formatRPS(endpoint.rps)}</span>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2 min-w-[60px]">
                          <div
                            className={`h-2 rounded-full transition-all ${getLoadColor(endpoint.loadPercentage)}`}
                            style={{ width: `${Math.min(endpoint.loadPercentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground min-w-[40px] text-right">
                          {endpoint.loadPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-2 text-right text-sm">
                      {formatRequests(endpoint.totalRequests)}
                    </td>
                    <td className="p-2 text-right">
                      <span className={`text-sm font-medium ${endpoint.errorRate > 5 ? 'text-red-500' : endpoint.errorRate > 1 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {endpoint.errorRate.toFixed(2)}%
                      </span>
                    </td>
                    <td className="p-2 text-right text-sm text-muted-foreground">
                      {endpoint.p50Latency.toFixed(0)}ms
                    </td>
                    <td className="p-2 text-right">
                      <span className={`text-sm font-medium ${endpoint.p99Latency > 1000 ? 'text-red-500' : endpoint.p99Latency > 500 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {endpoint.p99Latency.toFixed(0)}ms
                      </span>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {endpoint.upstreamService}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

