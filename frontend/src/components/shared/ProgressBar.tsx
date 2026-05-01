import clsx from 'clsx'

interface ProgressBarProps {
  value: number
  max?: number
  color?: 'primary' | 'stage1' | 'stage2' | 'stage3'
  showLabel?: boolean
  size?: 'sm' | 'md'
}

const colorStyles = {
  primary: 'bg-primary',
  stage1: 'bg-stage1',
  stage2: 'bg-stage2',
  stage3: 'bg-stage3',
}

export function ProgressBar({ value, max = 100, color = 'primary', showLabel, size = 'md' }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="flex items-center gap-2">
      <div className={clsx('flex-1 bg-gray-100 rounded-full overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2')}>
        <div
          className={clsx('h-full rounded-full transition-all', colorStyles[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <span className="text-xs text-gray-500 w-9 text-right">{pct}%</span>}
    </div>
  )
}
