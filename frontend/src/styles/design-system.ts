import type React from 'react'

export const COLORS = {
  // Brand
  primary:      '#4F7BE8',
  primaryLight: '#EEF3FD',
  primaryDark:  '#3460C9',

  // Backgrounds
  bg:           '#EEF2F9',
  sidebar:      '#FFFFFF',
  card:         '#FFFFFF',
  inputBg:      '#FAFBFE',
  tabBarBg:     '#F3F6FB',
  tableHeader:  '#EAF5F5',
  topbarChip:   '#F3F6FB',
  detailCard:   '#F8FAFF',

  // Text
  text:         '#1E2A3B',
  textMuted:    '#6B7A99',

  // Border
  border:       '#E2E8F4',
  scrollbar:    '#C8D8F8',

  // Semantic
  success:      '#2DB87A',
  stage1:       '#2DB87A',
  warning:      '#F4A623',
  stage2:       '#F4A623',
  danger:       '#E85454',
  stage3:       '#E85454',
  teal:         '#16B9B9',
} as const

export const STYLES = {
  card: {
    background:   COLORS.card,
    border:       `1px solid ${COLORS.border}`,
    borderRadius: 10,
    boxShadow:    '0 1px 4px rgba(79,123,232,0.06)',
    padding:      '20px 24px',
  } as React.CSSProperties,

  th: {
    background:    COLORS.tableHeader,
    color:         COLORS.textMuted,
    fontSize:      11,
    fontWeight:    600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    padding:       '10px 14px',
    whiteSpace:    'nowrap' as const,
  } as React.CSSProperties,

  td: {
    color:        COLORS.text,
    fontSize:     13,
    padding:      '10px 14px',
    borderBottom: `1px solid ${COLORS.border}`,
  } as React.CSSProperties,

  btnPrimary: {
    background:   COLORS.primary,
    color:        '#FFFFFF',
    border:       'none',
    borderRadius: 6,
    fontSize:     13,
    fontWeight:   600,
    padding:      '8px 18px',
    cursor:       'pointer',
  } as React.CSSProperties,

  btnOutline: {
    background:   'transparent',
    color:        COLORS.primary,
    border:       `1.5px solid ${COLORS.primary}`,
    borderRadius: 6,
    fontSize:     13,
    fontWeight:   600,
    padding:      '8px 18px',
    cursor:       'pointer',
  } as React.CSSProperties,

  btnGhost: {
    background:   'transparent',
    color:        COLORS.textMuted,
    border:       `1.5px solid ${COLORS.border}`,
    borderRadius: 6,
    fontSize:     13,
    fontWeight:   600,
    padding:      '8px 18px',
    cursor:       'pointer',
  } as React.CSSProperties,

  input: {
    background:   COLORS.inputBg,
    border:       `1.5px solid ${COLORS.border}`,
    borderRadius: 7,
    padding:      '9px 12px',
    fontSize:     13,
    color:        COLORS.text,
    outline:      'none',
    width:        '100%',
  } as React.CSSProperties,

  badge: {
    display:      'inline-flex',
    alignItems:   'center',
    padding:      '2px 10px',
    borderRadius: 20,
    fontSize:     11,
    fontWeight:   600,
  } as React.CSSProperties,

  page: {
    padding:    28,
    background: COLORS.bg,
    minHeight:  '100%',
  } as React.CSSProperties,

  pageTitle: {
    fontSize:     22,
    fontWeight:   700,
    color:        COLORS.text,
    marginBottom: 4,
  } as React.CSSProperties,

  pageSubtitle: {
    fontSize: 13,
    color:    COLORS.textMuted,
    margin:   0,
  } as React.CSSProperties,

  metricLabel: {
    fontSize:   12,
    fontWeight: 600,
    color:      COLORS.textMuted,
  } as React.CSSProperties,

  metricValue: {
    fontSize:   26,
    fontWeight: 700,
    color:      COLORS.text,
  } as React.CSSProperties,

  detailTile: {
    background:   COLORS.detailCard,
    borderRadius: 7,
    padding:      '10px 14px',
  } as React.CSSProperties,

  detailTileLabel: {
    fontSize:      10,
    fontWeight:    700,
    color:         COLORS.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom:  2,
  } as React.CSSProperties,

  detailTileValue: {
    fontSize:   13,
    fontWeight: 700,
    color:      COLORS.text,
  } as React.CSSProperties,
}

export function badgeStyle(color: string): React.CSSProperties {
  return {
    ...STYLES.badge,
    background: color + '18',
    color,
  }
}

export function rowBg(index: number): React.CSSProperties {
  return { background: index % 2 === 0 ? '#FFFFFF' : '#FAFBFE' }
}

export const idCell: React.CSSProperties = {
  ...STYLES.td,
  fontFamily: 'monospace',
  fontSize:   12,
  color:      COLORS.primary,
  fontWeight: 600,
}

export const stageColors = {
  1: COLORS.stage1,
  2: COLORS.stage2,
  3: COLORS.stage3,
} as const

export function scenarioCardStyle(color: string): React.CSSProperties {
  return {
    background:   color + '10',
    border:       `1px solid ${color}25`,
    borderRadius: 8,
    padding:      '16px 20px',
  }
}
