import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { api, MetricAggregation } from '../lib/api'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Loader2 } from 'lucide-react'

interface ServiceTraffic {
  name: string
  value: number
  rps: number
  requests: number
  color: string
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8',
  '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'
]

export function TrafficDistribution() {
  const [serviceData, setServiceData] = useState<ServiceTraffic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const metrics = await api.getAggregatedMetrics()
        
        // Group by upstream service
        const serviceMap = new Map<string, { rps: number; requests: number }>()
        
        metrics.forEach((metric: MetricAggregation) => {
          const service = metric.upstreamService || 'unknown'
          const existing = serviceMap.get(service) || { rps: 0, requests: 0 }
          serviceMap.set(service, {
            rps: existing.rps + metric.rps,
            requests: existing.requests + metric.requestCount,
          })
        })
        
        const totalRequests = Array.from(serviceMap.values())
          .reduce((sum, s) => sum + s.requests, 0)
        
        const services: ServiceTraffic[] = Array.from(serviceMap.entries())
          .map(([name, data], idx) => ({
            name,
            value: totalRequests > 0 ? (data.requests / totalRequests) * 100 : 0,
            rps: data.rps,
            requests: data.requests,
            color: COLORS[idx % COLORS.length],
          }))
          .sort((a, b) => b.value - a.value)
        
        setServiceData(services)
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch traffic distribution:', error)
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 2000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Traffic Distribution</CardTitle>
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
        <CardTitle>Traffic Distribution by Service</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Request distribution across upstream services
        </p>
      </CardHeader>
      <CardContent>
        {serviceData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No traffic data available
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={serviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {serviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Traffic Share']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="space-y-2 pt-4 border-t">
              {serviceData.map((service) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: service.color }}
                    />
                    <span className="text-sm font-medium">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      {service.rps.toFixed(1)} RPS
                    </span>
                    <span className="text-muted-foreground">
                      {service.requests.toLocaleString()} req
                    </span>
                    <span className="font-semibold">
                      {service.value.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

