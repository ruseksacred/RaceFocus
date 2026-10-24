import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { isCleared, type LapState } from '@/game';
import { colors, fonts } from '@/theme';

/**
 * react-native-web waits 50 ms before firing onPressIn, so quick taps are lost.
 * Native fires it right away. The prop is web-only and missing from RN types.
 */
const instantPressIn = (Platform.OS === 'web' ? { delayPressIn: 0 } : {}) as object;

/** Board width and tile size for a track on this screen. */
export function useBoardSize(size: number) {
  const { width } = useWindowDimensions();
  const gap = size >= 7 ? 6 : 8;
  const boardWidth = Math.min(width, 480) - 48;
  const tileSize = Math.floor((boardWidth - gap * (size - 1)) / size);
  return { gap, boardWidth, tileSize };
}

/** The grid of numbers. Taps fire on touch down for speed. */
export function Board({
  lap,
  wrongValue,
  onTap,
}: {
  lap: LapState;
  wrongValue: number | null;
  onTap: (value: number) => void;
}) {
  const { gap, boardWidth, tileSize } = useBoardSize(lap.config.size);
  return (
    <View style={[styles.board, { width: boardWidth, gap }]}>
      {lap.board.map((value) => {
        const cleared = isCleared(lap, value);
        const wrong = value === wrongValue;
        return (
          <Pressable
            key={value}
            {...instantPressIn}
            onPressIn={() => onTap(value)}
            accessibilityRole="button"
            accessibilityLabel={`${value}`}
            accessibilityState={{ disabled: cleared }}
            style={[
              styles.tile,
              { width: tileSize, height: tileSize },
              cleared && styles.tileCleared,
              wrong && styles.tileWrong,
            ]}>
            <Text
              style={[
                styles.tileText,
                { fontSize: Math.round(tileSize * 0.45) },
                cleared && styles.tileTextCleared,
              ]}>
              {value}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const LIGHTS = 3;

/**
 * Start lights in the board's place: red lights come on one by one, then all
 * turn green just before the start.
 */
export function StartLights({
  lit,
  green,
  text,
  size,
}: {
  lit: number;
  green: boolean;
  text: string;
  size: number;
}) {
  const { boardWidth } = useBoardSize(size);
  return (
    <View style={[styles.lightsBox, { width: boardWidth, height: boardWidth }]}>
      <View style={styles.lights} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: LIGHTS }, (_, i) => (
          <View key={i} style={[styles.light, green ? styles.lightGreen : i < lit && styles.lightOn]} />
        ))}
      </View>
      <Text
        style={[styles.countdownText, green && { color: colors.green }]}
        accessibilityLiveRegion="assertive">
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  board: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, alignSelf: 'center' },
  tile: {
    borderRadius: 12,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileCleared: { backgroundColor: colors.carbon },
  tileWrong: { borderColor: colors.yellow, borderWidth: 2, backgroundColor: '#3A3418' },
  tileText: { fontFamily: fonts.heading, color: colors.text },
  tileTextCleared: { color: colors.dim },
  lightsBox: { marginTop: 10, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', gap: 24 },
  countdownText: { fontFamily: fonts.heading, fontSize: 56, color: colors.text, textAlign: 'center' },
  lights: { flexDirection: 'row', gap: 14 },
  light: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  lightOn: { backgroundColor: colors.red, borderColor: colors.red },
  lightGreen: { backgroundColor: colors.green, borderColor: colors.green },
});
