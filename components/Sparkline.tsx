import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { COLORS } from '../lib/theme';

type Props = {
  points: number[];
  width?: number;
  height?: number;
};

export default function Sparkline({ points, width = 300, height = 120 }: Props) {
  const safe = points.length > 1 ? points : [40, 52, 46, 64, 58, 72, 78];
  const max = Math.max(...safe);
  const min = Math.min(...safe);
  const range = Math.max(1, max - min);

  const normalized = safe.map((value, index) => {
    const x = (index / (safe.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 16) - 8;
    return { x, y };
  });

  const line = normalized
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return (
    <View style={styles.wrap}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="gradFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="rgba(102,112,91,0.28)" />
            <Stop offset="1" stopColor="rgba(102,112,91,0.02)" />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#gradFill)" />
        <Path d={line} fill="none" stroke={COLORS.olive} strokeWidth={4} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 24,
    overflow: 'hidden',
  },
});
