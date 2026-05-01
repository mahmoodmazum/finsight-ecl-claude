import { type ReactNode } from 'react'
import clsx from 'clsx'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: { value: number; label: string }
  variant?: 'default' | 'stage1' | 'stage2' | 'stage3' | 'primary'
  loading?: boolean
}

const variantStyles = {
  default: 'border-app-border',
  primary: 'border-primary border-l-4 border-l-primary',
  stage1: 'border-app-border border-l-4 border-l-stage1',
  stage2: 'border-app-border border-l-4 border-l-stage2',
  stage3: 'border-app-border border-l-4 border-l-stage3',
}

const variantIconBg = {
  default: 'bg-gray-100 text-gray-600',
  primary: 'bg-blue-50 text-primary',
  stage1: 'bg-green-50 text-stage1',
  stage2: 'bg-amber-50 text-stage2',
  stage3: 'bg-red-50 text-stage3',
}

export function MetricCard({ title, value, subtitle, icon, trend, variant = 'default', loading }: MetricCardProps) {
  if (loading) {
    return (
      <div className={clsx('bg-white rounded-xl p-5 border animate-pulse', variantStyles[variant])}>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    )
  }

  return (
    <div className={clsx('bg-white rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow', variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 truncate">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          {trend && (
            <div className={clsx('mt-2 flex items-center text-xs font-medium', trend.value >= 0 ? 'text-red-600' : 'text-green-600')}>
              <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="ml-1 text-gray-500">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={clsx('ml-4 p-2.5 rounded-lg flex-shrink-0', variantIconBg[variant])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
