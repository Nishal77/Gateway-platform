import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { api, MetricAggregation } from '../lib/api'
import { AlertCircle, XCircle, AlertTriangle, Bell, Loader2, CheckCircle2 } from 'lucide-react'

interface Alert {
  id: string
  type: 'error' | 'warning' | 'critical'
  message: string
  endpoint?: string
  method?: string
  timestamp: Date
  metric?: string
  value?: number
}

export function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const metrics = await api.getAggregatedMetrics()
        const newAlerts: Alert[] = []
        const now = new Date()
        
        metrics.forEach((metric: MetricAggregation) => {
          const windowEnd = new Date(metric.windowEnd).getTime()
          const timeSinceLastRequest = Date.now() - windowEnd
          
          // Check for down endpoints (no traffic in last 60 seconds)
          if (timeSinceLastRequest > 60000 && metric.rps === 0) {
            newAlerts.push({
              id: `down-${metric.method}-${metric.endpoint}`,
              type: 'critical',
              message: `Endpoint appears to be down`,
              endpoint: metric.endpoint,
              method: metric.method,
              timestamp: now,
              metric: 'Availability',
            })
          }
          
          // Check for high error rate
          if (metric.errorRate > 10) {
            newAlerts.push({
              id: `error-${metric.method}-${metric.endpoint}`,
              type: 'critical',
              message: `Error rate is critically high`,
              endpoint: metric.endpoint,
              method: metric.method,
              timestamp: now,
              metric: 'Error Rate',
              value: metric.errorRate,
            })
          } else if (metric.errorRate > 5) {
            newAlerts.push({
              id: `warning-error-${metric.method}-${metric.endpoint}`,
              type: 'warning',
              message: `Error rate is elevated`,
              endpoint: metric.endpoint,
              method: metric.method,
              timestamp: now,
              metric: 'Error Rate',
              value: metric.errorRate,
            })
          }
          
          // Check for high latency
          if (metric.p99LatencyMs > 2000) {
            newAlerts.push({
              id: `latency-critical-${metric.method}-${metric.endpoint}`,
              type: 'critical',
              message: `P99 latency is critically high`,
              endpoint: metric.endpoint,
              method: metric.method,
              timestamp: now,
              metric: 'P99 Latency',
              value: metric.p99LatencyMs,
            })
          } else if (metric.p99LatencyMs > 1000) {
            newAlerts.push({
              id: `latency-warning-${metric.method}-${metric.endpoint}`,
              type: 'warning',
              message: `P99 latency is elevated`,
              endpoint: metric.endpoint,
              method: metric.method,
              timestamp: now,
              metric: 'P99 Latency',
              value: metric.p99LatencyMs,
            })
          }
          
          // Check for very high RPS (potential DDoS or traffic spike)
          if (metric.rps > 100000) {
            newAlerts.push({
              id: `rps-${metric.method}-${metric.endpoint}`,
              type: 'warning',
              message: `Unusually high request rate detected`,
              endpoint: metric.endpoint,
              method: metric.method,
              timestamp: now,
              metric: 'RPS',
              value: metric.rps,
            })
          }
        })
        
        // Sort by type (critical first) and timestamp (newest first)
        newAlerts.sort((a, b) => {
          const typeOrder = { critical: 0, error: 1, warning: 2 }
          const typeDiff = typeOrder[a.type] - typeOrder[b.type]
          if (typeDiff !== 0) return typeDiff
          return b.timestamp.getTime() - a.timestamp.getTime()
        })
        
        // Keep only top 10 alerts
        setAlerts(newAlerts.slice(0, 10))
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch alerts:', error)
        setLoading(false)
      }
    }

    fetchAlerts()
    const interval = setInterval(fetchAlerts, 2000)

    return () => clearInterval(interval)
  }, [])

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'border-red-500/50 bg-red-500/10'
      case 'error':
        return 'border-red-500/30 bg-red-500/5'
      case 'warning':
        return 'border-yellow-500/50 bg-yellow-500/10'
      default:
        return 'border-gray-500/30 bg-gray-500/5'
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  const criticalCount = alerts.filter(a => a.type === 'critical').length
  const warningCount = alerts.filter(a => a.type === 'warning').length

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alerts & Notifications</CardTitle>
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
        <CardTitle>Alerts & Notifications</CardTitle>
        <div className="flex gap-4 text-sm mt-2">
          {criticalCount > 0 && (
            <div className="flex items-center gap-1">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-500 font-semibold">Critical: {criticalCount}</span>
            </div>
          )}
          {warningCount > 0 && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-yellow-500 font-semibold">Warnings: {warningCount}</span>
            </div>
          )}
          {alerts.length === 0 && (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-green-500">All systems operational</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-muted-foreground">No active alerts</p>
            <p className="text-sm text-muted-foreground mt-1">All endpoints are healthy</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${getAlertColor(alert.type)} transition-all hover:shadow-md`}
              >
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {alert.method && (
                        <span className="font-mono text-xs px-1.5 py-0.5 bg-muted rounded">
                          {alert.method}
                        </span>
                      )}
                      <span className="font-semibold text-sm">{alert.message}</span>
                    </div>
                    {alert.endpoint && (
                      <div className="text-xs text-muted-foreground mb-1 font-mono">
                        {alert.endpoint}
                      </div>
                    )}
                    {alert.metric && alert.value !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        {alert.metric}: <strong>{alert.value.toFixed(2)}{alert.metric.includes('Latency') ? 'ms' : alert.metric === 'RPS' ? '' : '%'}</strong>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(alert.timestamp)}
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

