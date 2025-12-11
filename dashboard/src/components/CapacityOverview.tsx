import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { api } from '../lib/api'
import { formatRPS } from '../utils/formatNumbers'
import { TrendingUp, Gauge, AlertCircle } from 'lucide-react'

const TARGET_RPS = 10000

interface CapacityMetrics {
  currentRPS: number
  capacityPercent: number
  status: 'optimal' | 'normal' | 'high' | 'critical'
}

export function CapacityOverview() {
  const [metrics, setMetrics] = useState<CapacityMetrics>({
    currentRPS: 0,
    capacityPercent: 0,
    status: 'optimal',
  })

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await api.getAggregatedMetrics()
        const totalRps = data.reduce((sum, m) => sum + m.rps, 0)
        const capacityPercent = Math.min((totalRps / TARGET_RPS) * 100, 100)
        
        let status: 'optimal' | 'normal' | 'high' | 'critical' = 'optimal'
        if (capacityPercent >= 90) {
          status = 'critical'
        } else if (capacityPercent >= 70) {
          status = 'high'
        } else if (capacityPercent >= 40) {
          status = 'normal'
        }

        setMetrics({
          currentRPS: totalRps,
          capacityPercent,
          status,
        })
      } catch (error) {
        console.error('Failed to fetch capacity metrics:', error)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 2000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = () => {
    switch (metrics.status) {
      case 'optimal':
        return 'text-green-600'
      case 'normal':
        return 'text-blue-600'
      case 'high':
        return 'text-orange-600'
      case 'critical':
        return 'text-red-600'
    }
  }

  const getProgressColor = () => {
    if (metrics.capacityPercent >= 90) return 'bg-red-500'
    if (metrics.capacityPercent >= 70) return 'bg-orange-500'
    if (metrics.capacityPercent >= 40) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusText = () => {
    switch (metrics.status) {
      case 'optimal':
        return 'Optimal Load'
      case 'normal':
        return 'Normal Load'
      case 'high':
        return 'High Load'
      case 'critical':
        return 'Critical Load'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Capacity Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Capacity Indicator */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">System Capacity</span>
            <span className={`text-lg font-bold ${getStatusColor()}`}>
              {metrics.capacityPercent.toFixed(1)}%
            </span>
          </div>
          
          {/* Large Progress Bar */}
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className={`h-full ${getProgressColor()} transition-all duration-500 ease-out rounded-full flex items-center justify-end pr-3`}
                style={{ width: `${Math.min(metrics.capacityPercent, 100)}%` }}
              >
                {metrics.capacityPercent > 15 && (
                  <span className="text-xs font-semibold text-white">
                    {metrics.capacityPercent.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
            
            {/* Capacity Markers */}
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Current Load vs Target */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <div className="text-xs text-gray-500 mb-1">Current Load</div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-lg font-semibold text-blue-600">
                  {formatRPS(metrics.currentRPS)}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Target Capacity</div>
              <div className="text-lg font-semibold text-gray-700">
                {formatRPS(TARGET_RPS)}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${
            metrics.status === 'critical' ? 'bg-red-50 border border-red-200' :
            metrics.status === 'high' ? 'bg-orange-50 border border-orange-200' :
            metrics.status === 'normal' ? 'bg-blue-50 border border-blue-200' :
            'bg-green-50 border border-green-200'
          }`}>
            {metrics.status === 'critical' && (
              <AlertCircle className={`h-5 w-5 ${getStatusColor()}`} />
            )}
            <span className={`font-semibold ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>

          {/* Capacity Warning */}
          {metrics.capacityPercent >= 80 && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">
                    Approaching Capacity Limit
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    System is at {metrics.capacityPercent.toFixed(1)}% capacity. 
                    Consider scaling infrastructure if load continues to increase.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

