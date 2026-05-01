import clsx from 'clsx'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const statusStyles: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  QUEUED: 'bg-purple-100 text-purple-800 border-purple-200',
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800 border-amber-200',
  APPROVED: 'bg-green-100 text-green-800 border-green-200',
  LOCKED: 'bg-blue-100 text-blue-800 border-blue-200',
  ACTIVE: 'bg-green-100 text-green-800 border-green-200',
  EXPIRED: 'bg-gray-100 text-gray-600 border-gray-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
  FAILED: 'bg-red-100 text-red-700 border-red-200',
  RUNNING: 'bg-blue-100 text-blue-800 border-blue-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  PRODUCTION: 'bg-green-100 text-green-800 border-green-200',
  VALIDATION: 'bg-amber-100 text-amber-800 border-amber-200',
  DEVELOPMENT: 'bg-purple-100 text-purple-800 border-purple-200',
  RETIRED: 'bg-gray-100 text-gray-600 border-gray-200',
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const style = statusStyles[status] ?? 'bg-gray-100 text-gray-700 border-gray-200'
  const label = status.replace(/_/g, ' ')
  return (
    <span className={clsx(
      'inline-flex items-center rounded-full border font-medium',
      style,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
    )}>
      {label}
    </span>
  )
}
