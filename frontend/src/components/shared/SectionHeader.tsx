import { type ReactNode } from 'react'
import { COLORS, STYLES } from '../../styles/design-system'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  bordered?: boolean
}

export function SectionHeader({ title, subtitle, actions, bordered }: SectionHeaderProps) {
  return (
    <div style={{
      display:        'flex',
      alignItems:     'flex-start',
      justifyContent: 'space-between',
      marginBottom:   bordered ? 20 : 0,
      paddingBottom:  bordered ? 16 : 0,
      borderBottom:   bordered ? `1px solid ${COLORS.border}` : undefined,
    }}>
      <div>
        <h1 style={STYLES.pageTitle}>{title}</h1>
        {subtitle && <p style={STYLES.pageSubtitle}>{subtitle}</p>}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 16 }}>
          {actions}
        </div>
      )}
    </div>
  )
}
