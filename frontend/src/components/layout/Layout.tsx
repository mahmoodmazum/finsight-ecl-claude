import { useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuthStore } from '../../stores/authStore'
import { useReportingMonthStore } from '../../stores/reportingMonthStore'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

function formatMonthDisplay(m: string): string {
  if (!m || m.length !== 6) return m
  const year = m.slice(0, 4)
  const month = parseInt(m.slice(4), 10)
  const date = new Date(parseInt(year), month - 1, 1)
  return format(date, 'MMM yyyy')
}

function TopBar() {
  const { user, logout } = useAuthStore()
  const { selectedMonth, availableMonths, setMonth, loadAvailableMonths } = useReportingMonthStore()
  const now = toZonedTime(new Date(), 'Asia/Dhaka')
  const dateStr = format(now, 'dd MMM yyyy, HH:mm') + ' BDT'

  useEffect(() => {
    loadAvailableMonths()
  }, [loadAvailableMonths])

  return (
    <header className="h-14 bg-white border-b border-app-border flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="text-sm text-gray-400">{dateStr}</div>
      <div className="flex items-center gap-4">
        {/* Global month selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Reporting Month</span>
          <select
            value={selectedMonth}
            onChange={(e) => setMonth(e.target.value)}
            className="text-sm font-semibold text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            {availableMonths.length === 0 && selectedMonth ? (
              <option value={selectedMonth}>{formatMonthDisplay(selectedMonth)}</option>
            ) : (
              availableMonths.map((m) => (
                <option key={m} value={m}>{formatMonthDisplay(m)}</option>
              ))
            )}
          </select>
        </div>

        <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
          {user?.role}
        </span>
        <span className="text-sm font-medium text-gray-700">{user?.full_name}</span>
        <button
          onClick={logout}
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}

export function Layout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen bg-app-bg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
