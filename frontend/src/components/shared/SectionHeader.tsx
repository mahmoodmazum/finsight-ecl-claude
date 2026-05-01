import { type ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function SectionHeader({ title, subtitle, actions }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 ml-4">{actions}</div>}
    </div>
  )
}
