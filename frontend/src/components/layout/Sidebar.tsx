import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { usePermissions } from '../../hooks/usePermissions'

const navItems = [
  { path: '/dashboard',       label: 'Dashboard',          permission: 'dashboard:view' },
  { path: '/data-ingestion',  label: 'Data Ingestion',      permission: 'data:view' },
  { path: '/segmentation',    label: 'Segmentation',        permission: 'segmentation:view' },
  { path: '/staging',         label: 'Stage Classification',permission: 'staging:view' },
  { path: '/sicr',            label: 'SICR Assessment',     permission: 'sicr:view' },
  { path: '/ecl-calc',        label: 'ECL Calculation',     permission: 'ecl:view' },
  { path: '/macro-scenarios', label: 'Macro Scenarios',     permission: 'macro:view' },
  { path: '/provision',       label: 'Provision & GL',      permission: 'provision:view' },
  { path: '/overlays',        label: 'Mgmt Overlays',       permission: 'overlays:view' },
  { path: '/reports',         label: 'Reports',             permission: 'reports:view' },
  { path: '/governance',      label: 'Model Governance',    permission: 'governance:view' },
  { path: '/audit',           label: 'Audit Trail',         permission: 'audit:log:view' },
  { path: '/admin/users',     label: 'User Management',     permission: 'admin:users:view' },
  { path: '/admin/roles',     label: 'Role Management',     permission: 'admin:roles:view' },
]

// SVG icons matching FinSight color scheme
const NavIcons: Record<string, JSX.Element> = {
  '/dashboard': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  '/data-ingestion': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  '/segmentation': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  '/staging': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  '/sicr': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  '/ecl-calc': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  '/macro-scenarios': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  '/provision': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
    </svg>
  ),
  '/overlays': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
  '/reports': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  '/governance': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  '/audit': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  '/admin/users': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  '/admin/roles': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
}

const navSections = [
  {
    label: 'CORE',
    items: ['/dashboard', '/data-ingestion', '/segmentation'],
  },
  {
    label: 'ECL ENGINE',
    items: ['/staging', '/sicr', '/ecl-calc', '/macro-scenarios'],
  },
  {
    label: 'FINANCIALS',
    items: ['/provision', '/overlays', '/reports'],
  },
  {
    label: 'GOVERNANCE',
    items: ['/governance', '/audit'],
  },
  {
    label: 'ADMIN',
    items: ['/admin/users', '/admin/roles'],
  },
]

const navMap = Object.fromEntries(navItems.map((n) => [n.path, n]))

export function Sidebar() {
  const { can } = usePermissions()

  return (
    <aside className="w-56 bg-sidebar-bg flex flex-col h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <img src="/finsight-logo.svg" alt="FinSight ECL" className="h-8 w-auto" />
      </div>

      {/* Bank label */}
      <div className="px-4 py-2 border-b border-white/10">
        <p className="text-xs text-primary-lighter font-medium uppercase tracking-wider">IFIC Bank Bangladesh</p>
        <p className="text-xs text-white/40 mt-0.5">IFRS 9 ECL Platform</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6">
        {navSections.map((section) => {
          const visibleItems = section.items.filter((path) => {
            const item = navMap[path]
            return item ? can(item.permission) : false
          })
          if (visibleItems.length === 0) return null
          return (
            <div key={section.label}>
              <p className="px-2 mb-2 text-xs font-semibold text-white/30 uppercase tracking-wider">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {visibleItems.map((path) => {
                  const item = navMap[path]
                  return (
                    <li key={path}>
                      <NavLink
                        to={path}
                        className={({ isActive }) =>
                          clsx(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                            isActive
                              ? 'bg-sidebar-active text-white font-medium'
                              : 'text-white/60 hover:bg-sidebar-hover hover:text-white'
                          )
                        }
                      >
                        <span className="flex-shrink-0 opacity-70">{NavIcons[path]}</span>
                        <span className="truncate">{item?.label}</span>
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* Version */}
      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-xs text-white/25">v1.0.0 — Phase 4</p>
      </div>
    </aside>
  )
}
