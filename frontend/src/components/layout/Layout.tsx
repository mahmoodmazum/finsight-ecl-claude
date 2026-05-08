import { useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuthStore } from '../../stores/authStore'
import { useReportingMonthStore } from '../../stores/reportingMonthStore'
import { COLORS, STYLES, badgeStyle } from '../../styles/design-system'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

function formatMonthDisplay(m: string): string {
  if (!m || m.length !== 6) return m
  const year  = m.slice(0, 4)
  const month = parseInt(m.slice(4), 10)
  const date  = new Date(parseInt(year), month - 1, 1)
  return format(date, 'MMM yyyy')
}

function TopBar() {
  const { user, logout }                                          = useAuthStore()
  const { selectedMonth, availableMonths, setMonth, loadAvailableMonths } = useReportingMonthStore()
  const now     = toZonedTime(new Date(), 'Asia/Dhaka')
  const dateStr = format(now, 'dd MMM yyyy, HH:mm') + ' BDT'

  useEffect(() => { loadAvailableMonths() }, [loadAvailableMonths])

  return (
    <header style={{
      height:       56,
      background:   '#FFFFFF',
      borderBottom: `1px solid ${COLORS.border}`,
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'space-between',
      padding:      '0 28px',
      position:     'sticky',
      top:          0,
      zIndex:       10,
      flexShrink:   0,
    }}>
      <div style={{ fontSize: 12, color: COLORS.textMuted }}>{dateStr}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Global month selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600 }}>Reporting Month</span>
          <select
            value={selectedMonth}
            onChange={(e) => setMonth(e.target.value)}
            style={{
              background:   COLORS.topbarChip,
              border:       `1px solid ${COLORS.border}`,
              borderRadius: 6,
              padding:      '5px 12px',
              fontSize:     13,
              fontWeight:   600,
              color:        COLORS.primary,
              cursor:       'pointer',
            }}
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

        <span style={badgeStyle(COLORS.primary)}>{user?.role}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{user?.full_name}</span>
        <button
          onClick={logout}
          style={{ ...STYLES.btnGhost, padding: '5px 12px', fontSize: 12 }}
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
    <div style={{ display: 'flex', height: '100vh', background: COLORS.bg, overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
