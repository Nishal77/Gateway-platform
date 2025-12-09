import { useState, useEffect } from 'react'
import { api, TopEndpoint } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card'

export default function Endpoints() {
  const [endpoints, setEndpoints] = useState<TopEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchEndpoints = async () => {
      try {
        setError(null)
        const data = await api.getTopEndpoints(20)
        setEndpoints(data)
        setLoading(false)
      } catch (err) {
        setError(err as Error)
        setLoading(false)
      }
    }

    fetchEndpoints()
    const interval = setInterval(fetchEndpoints, 5000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div className="text-center py-12">Loading endpoints...</div>
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">Error: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Top Endpoints</h1>
        <p className="text-muted-foreground">Most frequently called endpoints</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Endpoint Request Counts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {endpoints.map((endpoint, index) => (
              <div
                key={endpoint.endpoint}
                className="flex items-center justify-between p-3 rounded-md hover:bg-accent"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-muted-foreground w-8">
                    #{index + 1}
                  </span>
                  <code className="text-sm font-mono">{endpoint.endpoint}</code>
                </div>
                <span className="text-lg font-bold">{endpoint.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

