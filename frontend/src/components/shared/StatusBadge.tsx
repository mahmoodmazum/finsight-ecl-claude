import { badgeStyle, COLORS } from '../../styles/design-system'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

function statusColor(status: string): string {
  switch (status) {
    case 'APPROVED':
    case 'ACTIVE':
    case 'PASSED':
    case 'COMPLETED':
    case 'PRODUCTION':
      return COLORS.success
    case 'PENDING':
    case 'PENDING_APPROVAL':
    case 'REVIEW':
    case 'WARNING':
    case 'DRAFT':
    case 'VALIDATION':
    case 'DEVELOPMENT':
      return COLORS.warning
    case 'FAILED':
    case 'QUARANTINED':
    case 'REJECTED':
    case 'OPEN':
      return COLORS.danger
    case 'IN_PROGRESS':
    case 'RUNNING':
    case 'QUEUED':
      return COLORS.teal
    case 'LOCKED':
    case 'SUPERSEDED':
    case 'EXPIRED':
    case 'RETIRED':
      return COLORS.textMuted
    default:
      return COLORS.textMuted
  }
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = statusColor(status)
  const label = status.replace(/_/g, ' ')
  return (
    <span style={badgeStyle(color)}>{label}</span>
  )
}
