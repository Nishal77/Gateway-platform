import { useMetrics } from '../hooks/useMetrics'
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card'

export default function Metrics() {
  const { metrics, loading, error } = useMetrics()

  if (loading) {
    return <div className="text-center py-12">Loading metrics...</div>
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">Error: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Metrics</h1>
        <p className="text-muted-foreground">Detailed metrics for all endpoints</p>
      </div>

      <div className="grid gap-4">
        {metrics.map((metric) => (
          <Card key={`${metric.endpoint}-${metric.method}`}>
            <CardHeader>
              <CardTitle>
                {metric.method} {metric.endpoint}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">RPS</p>
                  <p className="text-2xl font-bold">{metric.rps.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">P50 Latency</p>
                  <p className="text-2xl font-bold">{metric.p50LatencyMs}ms</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">P90 Latency</p>
                  <p className="text-2xl font-bold">{metric.p90LatencyMs}ms</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">P99 Latency</p>
                  <p className="text-2xl font-bold">{metric.p99LatencyMs}ms</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Error Rate</p>
                  <p className="text-2xl font-bold">{metric.errorRate.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold">{metric.requestCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Success</p>
                  <p className="text-2xl font-bold text-green-500">{metric.successCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Errors</p>
                  <p className="text-2xl font-bold text-red-500">{metric.errorCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

