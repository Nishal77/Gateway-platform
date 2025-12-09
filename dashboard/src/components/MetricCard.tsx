import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode
}

export function MetricCard({ title, value, subtitle, trend, icon }: MetricCardProps) {
  const trendIcon = trend === 'up' ? <TrendingUp className="h-4 w-4 text-green-500" /> :
                    trend === 'down' ? <TrendingDown className="h-4 w-4 text-red-500" /> :
                    <Activity className="h-4 w-4 text-gray-500" />

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon || trendIcon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

