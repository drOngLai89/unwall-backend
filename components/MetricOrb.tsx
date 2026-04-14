import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, FONTS } from '../lib/theme';

type Props = {
  label: string;
  score: number;
  target?: number;
  unit?: string;
};

export default function MetricOrb({ label, score, target = 100, unit = '%' }: Props) {
  const size = 92;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, score / target));
  const offset = circumference * (1 - progress);

  return (
    <View style={styles.card}>
      <View style={styles.orbWrap}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(102,112,91,0.16)"
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={COLORS.olive}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={styles.center}>
          <Text style={styles.score}>{Math.round(score)}</Text>
          <Text style={styles.unit}>{unit}</Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 132,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    marginRight: 12,
  },
  orbWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  center: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.sans,
  },
  unit: {
    fontSize: 11,
    color: COLORS.subtext,
  },
  label: {
    fontSize: 12,
    color: COLORS.subtext,
    textAlign: 'center',
    fontFamily: FONTS.sans,
  },
});
