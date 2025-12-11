import { useMetrics } from '../hooks/useMetrics'
import { MetricCard } from '../components/MetricCard'
import { SystemStatus } from '../components/SystemStatus'
import { CapacityOverview } from '../components/CapacityOverview'
import { EndpointStatus } from '../components/EndpointStatus'
import { EndpointLoadTable } from '../components/EndpointLoadTable'
import { TrafficDistribution } from '../components/TrafficDistribution'
import { Alerts } from '../components/Alerts'
import { TopEndpoints } from '../components/TopEndpoints'
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity, Zap, AlertCircle, Clock } from 'lucide-react'
import { formatRPS, formatRequests } from '../utils/formatNumbers'

export default function Dashboard() {
  const { metrics, loading, error } = useMetrics()

  if (loading) {
    return <div className="text-center py-12">Loading metrics...</div>
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">Error: {error.message}</div>
  }

  // Calculate real metrics from actual telemetry data
  const totalRPS = metrics.reduce((sum, m) => sum + m.rps, 0)
  const totalRequests = metrics.reduce((sum, m) => sum + m.requestCount, 0)
  
  // Calculate weighted average error rate (weighted by request count)
  let totalErrorRate = 0
  let totalWeight = 0
  metrics.forEach(m => {
    if (m.requestCount > 0) {
      totalErrorRate += m.errorRate * m.requestCount
      totalWeight += m.requestCount
    }
  })
  const avgErrorRate = totalWeight > 0 ? totalErrorRate / totalWeight : 0
  
  // Calculate weighted average P99 latency
  let totalP99Latency = 0
  let p99Weight = 0
  metrics.forEach(m => {
    if (m.requestCount > 0) {
      totalP99Latency += m.p99LatencyMs * m.requestCount
      p99Weight += m.requestCount
    }
  })
  const avgP99Latency = p99Weight > 0 ? totalP99Latency / p99Weight : 0

  // Prepare chart data from real metrics (sorted by RPS, top 10)
  const chartData = metrics
    .sort((a, b) => b.rps - a.rps)
    .slice(0, 10)
    .map((m) => ({
      name: m.endpoint.split('/').pop() || m.endpoint,
      rps: m.rps,
      p99: m.p99LatencyMs,
    }))

  // Show empty state when no metrics available
  if (metrics.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Real-time API analytics and metrics</p>
        </div>
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-lg text-muted-foreground mb-2">No traffic detected</p>
          <p className="text-sm text-muted-foreground">
            Start the traffic generator to see real-time metrics
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Real-time API analytics and metrics</p>
      </div>

      {/* System Status and Capacity Overview - Prominent placement at top */}
      <div className="grid gap-4 md:grid-cols-2">
        <SystemStatus />
        <CapacityOverview />
      </div>

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total RPS"
          value={formatRPS(totalRPS)}
          subtitle="Requests per second"
          icon={<Zap className="h-4 w-4 text-blue-500" />}
        />
        <MetricCard
          title="Total Requests"
          value={formatRequests(totalRequests)}
          subtitle="Last 60 seconds"
          icon={<Activity className="h-4 w-4 text-green-500" />}
        />
        <MetricCard
          title="Error Rate"
          value={`${avgErrorRate.toFixed(2)}%`}
          subtitle="Average error percentage"
          icon={<AlertCircle className="h-4 w-4 text-red-500" />}
          trend={avgErrorRate > 5 ? 'up' : 'neutral'}
        />
        <MetricCard
          title="Avg P99 Latency"
          value={`${avgP99Latency.toFixed(0)}ms`}
          subtitle="99th percentile latency"
          icon={<Clock className="h-4 w-4 text-orange-500" />}
        />
      </div>

      {/* Alerts Section - Prominent placement */}
      <Alerts />

      {/* System Health and Endpoint Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <EndpointStatus />
        <TopEndpoints />
      </div>

      {/* Traffic Distribution */}
      <TrafficDistribution />

      {/* Endpoint Load Table - Full Width */}
      <EndpointLoadTable />

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>RPS by Endpoint</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Top 10 endpoints by requests per second
            </p>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="rps" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No endpoint data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>P99 Latency by Endpoint</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Latency percentiles for top endpoints
            </p>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="p99" stroke="#82ca9d" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No endpoint data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

