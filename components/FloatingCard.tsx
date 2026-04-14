import { ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOW } from '../lib/theme';

type Props = {
  children: ReactNode;
};

export default function FloatingCard({ children }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 2600,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const rotateX = interpolate(progress.value, [0, 1], [2, -2]);
    const rotateY = interpolate(progress.value, [0, 1], [-4, 4]);
    const translateY = interpolate(progress.value, [0, 1], [0, -8]);

    return {
      transform: [
        { perspective: 1000 },
        { rotateX: `${rotateX}deg` },
        { rotateY: `${rotateY}deg`Y}deg` },
        { translateY },
      ],
    };
  });

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <LinearGradient
        colors={[COLORS.paper, COLORS.card2]}
        start={{ x: 0.05, y: 0.05 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.glow} />
        {children}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...SHADOW,
  },
  card: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  glow: {
    position: 'absolute',
    width: 160,
    height: 160,
    right: -20,
    top: -30,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
