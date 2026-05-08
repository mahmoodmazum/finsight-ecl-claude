import { COLORS } from '../../styles/design-system'

interface Tab {
  id: string
  label: string
  count?: number
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onChange: (id: string) => void
}

export function TabBar({ tabs, activeTab, onChange }: TabBarProps) {
  return (
    <div style={{
      background:    COLORS.tabBarBg,
      borderRadius:  8,
      padding:       3,
      display:       'inline-flex',
      gap:           2,
    }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              background:   isActive ? COLORS.primary : 'transparent',
              color:        isActive ? '#FFFFFF' : COLORS.textMuted,
              borderRadius: 6,
              padding:      '7px 18px',
              fontSize:     13,
              fontWeight:   600,
              border:       'none',
              cursor:       'pointer',
              transition:   'background 0.18s',
              whiteSpace:   'nowrap',
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                marginLeft:   6,
                padding:      '1px 6px',
                borderRadius: 10,
                fontSize:     11,
                background:   isActive ? 'rgba(255,255,255,0.25)' : COLORS.border,
                color:        isActive ? '#FFFFFF' : COLORS.textMuted,
              }}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
