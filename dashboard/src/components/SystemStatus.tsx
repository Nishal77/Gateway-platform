import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { api } from '../lib/api'
import { formatRPS } from '../utils/formatNumbers'
import { Activity, AlertTriangle, CheckCircle, XCircle, TrendingUp } from 'lucide-react'

interface SystemStatus {
  status: 'healthy' | 'degraded' | 'overloaded' | 'critical'
  rps: number
  errorRate: number
  avgLatency: number
  p99Latency: number
  capacity: number
  message: string
  targetCapacity: number
}

const TARGET_RPS = 10000 // Target capacity for 10k RPS

export function SystemStatus() {
  const [status, setStatus] = useState<SystemStatus>({
    status: 'healthy',
    rps: 0,
    errorRate: 0,
    avgLatency: 0,
    p99Latency: 0,
    capacity: 0,
    message: 'Waiting for traffic...',
    targetCapacity: TARGET_RPS,
  })

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const metrics = await api.getAggregatedMetrics()

        const totalRps = metrics.reduce((sum, m) => sum + m.rps, 0)
        const totalRequests = metrics.reduce((sum, m) => sum + m.requestCount, 0)
        const totalErrors = metrics.reduce((sum, m) => sum + m.errorCount, 0)
        const avgErrorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
        
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

        // Calculate capacity percentage based on RPS (0-10k RPS = 0-100%)
        const capacityPercent = Math.min((totalRps / TARGET_RPS) * 100, 100)

        // Determine system status
        let systemStatus: 'healthy' | 'degraded' | 'overloaded' | 'critical' = 'healthy'
        let message = 'System operating normally'

        if (totalRps > 0) {
          if (avgErrorRate > 10 || p99Latency > 2000 || capacityPercent >= 95) {
            systemStatus = 'critical'
            message = 'System under critical load - immediate attention required'
          } else if (avgErrorRate > 5 || p99Latency > 1000 || capacityPercent >= 80) {
            systemStatus = 'overloaded'
            message = 'System experiencing high load - performance degraded'
          } else if (avgErrorRate > 1 || p99Latency > 500 || capacityPercent >= 60) {
            systemStatus = 'degraded'
            message = 'System under moderate load - monitoring recommended'
          } else {
            systemStatus = 'healthy'
            message = 'System operating normally'
          }
          } else {
          message = 'Waiting for traffic...'
        }

        setStatus({
          status: systemStatus,
          rps: totalRps,
          errorRate: avgErrorRate,
          avgLatency,
          p99Latency,
          capacity: capacityPercent,
          message,
          targetCapacity: TARGET_RPS,
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
          targetCapacity: TARGET_RPS,
        })
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 1000)

    return () => clearInterval(interval)
  }, [])

  const getStatusConfig = () => {
    switch (status.status) {
      case 'healthy':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          icon: CheckCircle,
          iconColor: 'text-green-500',
        }
      case 'degraded':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: AlertTriangle,
          iconColor: 'text-yellow-500',
        }
      case 'overloaded':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          icon: AlertTriangle,
          iconColor: 'text-orange-500',
        }
      case 'critical':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: XCircle,
          iconColor: 'text-red-500',
        }
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: Activity,
          iconColor: 'text-gray-500',
        }
    }
  }

  const getProgressColor = () => {
    if (status.capacity >= 90) return 'bg-red-500'
    if (status.capacity >= 70) return 'bg-orange-500'
    if (status.capacity >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const config = getStatusConfig()
  const StatusIcon = config.icon

  return (
    <Card className={`${config.borderColor} border-2`}>
      <CardHeader className={`${config.bgColor} pb-3`}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${config.iconColor}`} />
            System Status
          </CardTitle>
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${config.bgColor} ${config.color} border ${config.borderColor}`}>
            {status.status.toUpperCase()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Capacity Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">System Capacity</span>
            <span className={`font-bold ${config.color}`}>
              {status.capacity.toFixed(1)}%
            </span>
                  </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full ${getProgressColor()} transition-all duration-500 ease-out rounded-full flex items-center justify-end pr-2`}
              style={{ width: `${Math.min(status.capacity, 100)}%` }}
            >
              {status.capacity > 10 && (
                <span className="text-xs font-semibold text-white">
                  {status.capacity.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>0 RPS</span>
            <span className="font-medium">{formatRPS(status.targetCapacity)} Target</span>
          </div>
        </div>

        {/* RPS Progress Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Current Load
            </span>
            <span className="font-bold text-blue-600">
              {formatRPS(status.rps)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${Math.min((status.rps / status.targetCapacity) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Status Message */}
        <div className={`p-3 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
          <p className={`text-sm ${config.color} font-medium`}>
            {status.message}
          </p>
          </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Error Rate</div>
            <div className={`text-lg font-semibold ${
              status.errorRate > 5 ? 'text-red-500' : 
              status.errorRate > 1 ? 'text-yellow-500' : 
              'text-green-500'
            }`}>
              {status.errorRate.toFixed(2)}%
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Avg Latency</div>
            <div className={`text-lg font-semibold ${
              status.avgLatency > 1000 ? 'text-red-500' : 
              status.avgLatency > 500 ? 'text-yellow-500' : 
              'text-green-500'
            }`}>
              {status.avgLatency.toFixed(0)}ms
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">P99 Latency</div>
            <div className={`text-lg font-semibold ${
              status.p99Latency > 2000 ? 'text-red-500' : 
              status.p99Latency > 1000 ? 'text-orange-500' : 
              status.p99Latency > 500 ? 'text-yellow-500' : 
              'text-green-500'
            }`}>
              {status.p99Latency.toFixed(0)}ms
            </div>
              </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Capacity Used</div>
            <div className={`text-lg font-semibold ${config.color}`}>
              {status.capacity.toFixed(1)}%
            </div>
              </div>
            </div>

        {/* Capacity Warning */}
        {status.capacity >= 80 && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">
                  High Capacity Usage
                </p>
                <p className="text-xs text-red-600 mt-1">
                  System is operating at {status.capacity.toFixed(1)}% capacity. 
                  Consider scaling if load continues to increase.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
