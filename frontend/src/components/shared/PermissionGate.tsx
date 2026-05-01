import React from 'react'
import { usePermissions } from '../../hooks/usePermissions'

interface PermissionGateProps {
  permission: string
  mode?: 'hide' | 'disable'
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGate({
  permission,
  mode = 'hide',
  children,
  fallback = null,
}: PermissionGateProps) {
  const { can } = usePermissions()

  if (!can(permission)) {
    if (mode === 'disable') {
      return (
        <div className="opacity-40 pointer-events-none select-none">
          {children}
        </div>
      )
    }
    return <>{fallback}</>
  }

  return <>{children}</>
}
