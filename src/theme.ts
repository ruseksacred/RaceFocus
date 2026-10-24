import type { TextStyle } from 'react-native';

export const colors = {
  red: '#E10600',
  carbon: '#15151E',
  surface: '#1F1F2B',
  surface2: '#2A2A38',
  line: '#38384A',
  text: '#F2F4F8',
  muted: '#A3ACBD',
  /** Cleared tiles on the board. */
  dim: '#7A8599',
  purple: '#B57BFF',
  green: '#3DDC84',
  /** Yellow flag after a wrong tap. */
  yellow: '#FFD12E',
  white: '#FFFFFF',
} as const;

export const fonts = {
  heading: 'BarlowCondensed_700Bold',
  headingSemi: 'BarlowCondensed_600SemiBold',
  body: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold',
} as const;

/** Small uppercase label used above values. */
export const label: TextStyle = {
  fontFamily: fonts.bodySemi,
  fontSize: 12,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  color: colors.muted,
};

/** Use on every timer so digits do not jump. */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };
