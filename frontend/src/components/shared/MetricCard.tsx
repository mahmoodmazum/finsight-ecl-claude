import { type ReactNode } from 'react'
import { COLORS, STYLES } from '../../styles/design-system'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: { value: number; label: string }
  variant?: 'default' | 'stage1' | 'stage2' | 'stage3' | 'primary'
  loading?: boolean
}

const accentColors: Record<string, string> = {
  default:  'transparent',
  primary:  COLORS.primary,
  stage1:   COLORS.stage1,
  stage2:   COLORS.stage2,
  stage3:   COLORS.stage3,
}

const valueColors: Record<string, string> = {
  default:  COLORS.text,
  primary:  COLORS.primary,
  stage1:   COLORS.stage1,
  stage2:   COLORS.stage2,
  stage3:   COLORS.stage3,
}

export function MetricCard({ title, value, subtitle, icon, trend, variant = 'default', loading }: MetricCardProps) {
  const accentColor = accentColors[variant]
  const valueColor  = valueColors[variant]

  if (loading) {
    return (
      <div style={{
        ...STYLES.card,
        borderLeft: `3px solid ${accentColor}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        <div className="skeleton" style={{ height: 12, width: '60%' }} />
        <div className="skeleton" style={{ height: 28, width: '45%' }} />
        <div className="skeleton" style={{ height: 10, width: '35%' }} />
      </div>
    )
  }

  return (
    <div
      style={{
        ...STYLES.card,
        borderLeft: `3px solid ${accentColor}`,
        display:    'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(79,123,232,0.10)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(79,123,232,0.06)' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={STYLES.metricLabel}>{title}</p>
        <p style={{ ...STYLES.metricValue, color: valueColor, margin: '4px 0 2px' }}>{value}</p>
        {subtitle && <p style={STYLES.pageSubtitle}>{subtitle}</p>}
        {trend && (
          <div style={{
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: trend.value >= 0 ? COLORS.danger : COLORS.success,
          }}>
            <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
            <span style={{ color: COLORS.textMuted }}>{trend.label}</span>
          </div>
        )}
      </div>
      {icon && (
        <div style={{
          padding: 8,
          borderRadius: 8,
          background: accentColor + '18',
          color: accentColor,
          flexShrink: 0,
        }}>
          {icon}
        </div>
      )}
    </div>
  )
}
