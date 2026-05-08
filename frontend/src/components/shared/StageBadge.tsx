import { badgeStyle, stageColors } from '../../styles/design-system'

interface StageBadgeProps {
  stage: 1 | 2 | 3
  size?: 'sm' | 'md'
}

export function StageBadge({ stage }: StageBadgeProps) {
  const color = stageColors[stage]
  return (
    <span style={badgeStyle(color)}>
      <span style={{
        width:        6,
        height:       6,
        borderRadius: '50%',
        background:   color,
        marginRight:  5,
        flexShrink:   0,
        display:      'inline-block',
      }} />
      Stage {stage}
    </span>
  )
}
