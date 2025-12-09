import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { api } from '../lib/api'
import { formatRPS } from '../utils/formatNumbers'

interface SystemStatus {
  status: 'healthy' | 'degraded' | 'overloaded' | 'critical'
  rps: number
  errorRate: number
  avgLatency: number
  p99Latency: number
  capacity: number
  message: string
}

export function SystemStatus() {
  const [status, setStatus] = useState<SystemStatus>({
    status: 'healthy',
    rps: 0,
    errorRate: 0,
    avgLatency: 0,
    p99Latency: 0,
    capacity: 100,
    message: 'Waiting for traffic...',
  })

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const metrics = await api.getAggregatedMetrics()

        // Calculate real metrics from actual telemetry data
        const totalRps = metrics.reduce((sum, m) => sum + m.rps, 0)
        const totalRequests = metrics.reduce((sum, m) => sum + m.requestCount, 0)
        const totalErrors = metrics.reduce((sum, m) => sum + m.errorCount, 0)
        const avgErrorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
        
        // Calculate weighted average latency (weighted by request count)
        let totalWeightedLatency = 0
        let totalWeight = 0
        let maxP99Latency = 0
        
        metrics.forEach(m => {
          if (m.requestCount > 0) {
            totalWeightedLatency += m.p50LatencyMs * m.requestCount
            totalWeight += m.requestCount
            maxP99Latency = Math.max(maxP99Latency, m.p99LatencyMs)
          }
        })
        
        const avgLatency = totalWeight > 0 ? totalWeightedLatency / totalWeight : 0
        const p99Latency = maxP99Latency

        // Determine system status based on real metrics
        let systemStatus: 'healthy' | 'degraded' | 'overloaded' | 'critical' = 'healthy'
        let capacity = 100
        let message = 'Waiting for traffic...'

        // Only evaluate status if there's actual traffic
        if (totalRps > 0) {
          if (avgErrorRate > 10 || p99Latency > 2000) {
            systemStatus = 'critical'
            capacity = 0
            message = 'System under critical load - immediate attention required'
          } else if (avgErrorRate > 5 || p99Latency > 1000 || totalRps > 1000000) {
            systemStatus = 'overloaded'
            capacity = 25
            message = 'System experiencing high load - performance degraded'
          } else if (avgErrorRate > 1 || p99Latency > 500 || totalRps > 500000) {
            systemStatus = 'degraded'
            capacity = 60
            message = 'System under moderate load - monitoring recommended'
          } else {
            systemStatus = 'healthy'
            capacity = 100
            message = 'System operating normally'
          }

          // Calculate capacity based on RPS (industry-standard thresholds)
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

        setStatus({
          status: systemStatus,
          rps: totalRps,
          errorRate: avgErrorRate,
          avgLatency,
          p99Latency,
          capacity,
          message,
        })
      } catch (error) {
        setStatus({
          status: 'critical',
          rps: 0,
          errorRate: 0,
          avgLatency: 0,
          p99Latency: 0,
          capacity: 0,
          message: 'Unable to fetch system status',
        })
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 2000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = () => {
    switch (status.status) {
      case 'healthy':
        return 'text-green-500'
      case 'degraded':
        return 'text-yellow-500'
      case 'overloaded':
        return 'text-orange-500'
      case 'critical':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getCapacityColor = () => {
    if (status.capacity >= 80) return 'text-green-500'
    if (status.capacity >= 50) return 'text-yellow-500'
    if (status.capacity >= 25) return 'text-orange-500'
    return 'text-red-500'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="transform -rotate-90 w-32 h-32">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - status.capacity / 100)}`}
                  className={getCapacityColor()}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getStatusColor()}`}>
                    {status.capacity}%
                  </div>
                  <div className="text-xs text-muted-foreground">Capacity</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className={`text-lg font-semibold ${getStatusColor()} mb-1`}>
              {status.status.toUpperCase()}
            </div>
            <div className="text-sm text-muted-foreground">
              {status.message}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <div className="text-xs text-muted-foreground">Current RPS</div>
              <div className="text-lg font-semibold">
                {formatRPS(status.rps)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Error Rate</div>
              <div className={`text-lg font-semibold ${status.errorRate > 5 ? 'text-red-500' : status.errorRate > 1 ? 'text-yellow-500' : 'text-green-500'}`}>
                {status.errorRate.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Avg Latency</div>
              <div className="text-lg font-semibold">
                {status.avgLatency.toFixed(0)}ms
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">P99 Latency</div>
              <div className={`text-lg font-semibold ${status.p99Latency > 1000 ? 'text-red-500' : status.p99Latency > 500 ? 'text-yellow-500' : 'text-green-500'}`}>
                {status.p99Latency.toFixed(0)}ms
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

