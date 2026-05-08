import { COLORS } from '../../styles/design-system'

interface ProgressBarProps {
  value: number
  max?: number
  color?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export function ProgressBar({ value, max = 100, color = COLORS.primary, showLabel, size = 'md' }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex:         1,
        background:   COLORS.bg,
        height:       size === 'sm' ? 4 : 6,
        borderRadius: 4,
        overflow:     'hidden',
      }}>
        <div style={{
          width:      `${pct}%`,
          height:     '100%',
          background: color,
          borderRadius: 4,
          transition: 'width 0.4s ease',
        }} />
      </div>
      {showLabel && (
        <span style={{ fontSize: 11, color: COLORS.textMuted, width: 32, textAlign: 'right' }}>
          {pct}%
        </span>
      )}
    </div>
  )
}
