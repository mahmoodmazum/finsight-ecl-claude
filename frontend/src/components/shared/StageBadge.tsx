import clsx from 'clsx'

interface StageBadgeProps {
  stage: 1 | 2 | 3
  size?: 'sm' | 'md'
}

const stageConfig = {
  1: { label: 'Stage 1', className: 'bg-green-100 text-green-800 border-green-200' },
  2: { label: 'Stage 2', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  3: { label: 'Stage 3', className: 'bg-red-100 text-red-800 border-red-200' },
}

export function StageBadge({ stage, size = 'md' }: StageBadgeProps) {
  const config = stageConfig[stage]
  return (
    <span className={clsx(
      'inline-flex items-center rounded-full border font-medium',
      config.className,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
    )}>
      {config.label}
    </span>
  )
}
