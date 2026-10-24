import Svg, { Circle, Path } from 'react-native-svg';

export type IconName = 'home' | 'practice' | 'stats' | 'profile';

/** Stroke icons for the tab bar, drawn on a 24 × 24 grid. */
export function Icon({ name, color, size = 24 }: { name: IconName; color: string; size?: number }) {
  const stroke = {
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      {name === 'home' && (
        <Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" {...stroke} />
      )}
      {name === 'practice' && (
        <>
          <Circle cx={12} cy={13.5} r={7.5} {...stroke} />
          <Path d="M12 13.5V9.5M9.5 2.5h5M12 2.5v3.5M18.5 6.5l1.5-1.5" {...stroke} />
        </>
      )}
      {name === 'stats' && <Path d="M3 20.5h18M6 20.5v-7M12 20.5V5M18 20.5v-10" {...stroke} />}
      {name === 'profile' && (
        <>
          <Path d="M3 14a9 9 0 0 1 18 0v2.5a2.5 2.5 0 0 1-2.5 2.5H7a4 4 0 0 1-4-4z" {...stroke} />
          <Path d="M11.5 10.5h9.3M11.5 10.5v2a2 2 0 0 0 2 2h7.3" {...stroke} />
        </>
      )}
    </Svg>
  );
}
