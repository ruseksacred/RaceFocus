import { useId } from 'react';
import { View } from 'react-native';
import Svg, { ClipPath, Defs, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { HELMET_COLORS, type Helmet, type HelmetPattern } from '@/game';
import { colors, fonts } from '@/theme';

// Side view of a helmet facing right, on a 64 × 64 grid.
const SHELL =
  'M12 47 C5 37 6 20 19 12 C29 6 45 6 53 14 C56.5 17.5 58.3 22.5 58.5 28 L59 39 C59.2 45 55.5 50 49.5 50 L30 49.3 C23 49 17 49 12 47 Z';
const VISOR =
  'M33.5 19.5 C41 17.6 50 17.8 56.6 19.8 L58.4 31.2 L38.5 32.3 C34.6 32.5 31.6 29.6 31.6 25.8 V22.8 C31.6 21.3 32.3 20 33.5 19.5 Z';
/** Below this size the race number is too small to read, so it is left out. */
const NUMBER_MIN_SIZE = 36;

function Pattern({ pattern, color }: { pattern: HelmetPattern; color: string }) {
  switch (pattern) {
    case 'stripe':
      return <Rect x={0} y={39} width={64} height={5} fill={color} />;
    case 'twin':
      return (
        <>
          <Rect x={0} y={38.5} width={64} height={2.6} fill={color} />
          <Rect x={0} y={43} width={64} height={2.6} fill={color} />
        </>
      );
    case 'halves':
      return <Rect x={0} y={0} width={26} height={64} fill={color} />;
    case 'chevron':
      return <Path d="M0 12 L30 31 L0 50 V41 L16 31 L0 21 Z" fill={color} />;
    case 'chequered':
      return (
        <>
          {Array.from({ length: 32 }, (_, i) => {
            const row = Math.floor(i / 16);
            const col = i % 16;
            return (row + col) % 2 === 0 ? (
              <Rect key={i} x={col * 4} y={42 + row * 4} width={4} height={4} fill={color} />
            ) : null;
          })}
        </>
      );
    case 'crown':
      return <Path d="M0 0 H64 V16 C46 12 24 14 0 26 Z" fill={color} />;
    case 'solid':
      return null;
  }
}

/** A driver's helmet drawing. */
export function HelmetArt({ helmet, size }: { helmet: Helmet; size: number }) {
  const clipId = `helmet${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const showNumber = size >= NUMBER_MIN_SIZE;
  const number = String(helmet.number);
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <ClipPath id={clipId}>
          <Path d={SHELL} />
        </ClipPath>
      </Defs>
      <G transform="translate(3 4) scale(0.9)">
        <Path d={SHELL} fill={HELMET_COLORS[helmet.color]} />
        <G clipPath={`url(#${clipId})`}>
          <Pattern pattern={helmet.pattern} color={HELMET_COLORS[helmet.accent]} />
        </G>
        <Path d={SHELL} fill="none" stroke="#000" strokeOpacity={0.35} strokeWidth={1.2} />
        <Path d={VISOR} fill={colors.carbon} />
        <Path d="M34 24 H56" stroke="#fff" strokeOpacity={0.25} strokeWidth={1.5} strokeLinecap="round" />
        {showNumber && (
          <>
            <SvgText
              x={22}
              y={36}
              fontFamily={fonts.heading}
              fontSize={14}
              textAnchor="middle"
              fill="none"
              stroke={colors.carbon}
              strokeWidth={3}
              strokeLinejoin="round">
              {number}
            </SvgText>
            <SvgText
              x={22}
              y={36}
              fontFamily={fonts.heading}
              fontSize={14}
              textAnchor="middle"
              fill="#fff">
              {number}
            </SvgText>
          </>
        )}
      </G>
    </Svg>
  );
}

/** Round avatar with a helmet inside. */
export function HelmetAvatar({ helmet, size = 40 }: { helmet: Helmet; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.line,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
      <HelmetArt helmet={helmet} size={size} />
    </View>
  );
}
