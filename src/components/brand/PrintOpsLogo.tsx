// src/components/brand/PrintOpsLogo.tsx
import React, { useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { LOGO_CHARS, LOGO_EM, LOGO_VIEWBOX, SUBTITLE_LINES, SUBTITLE_VIEWBOX } from './logoGlyphs';

// Colores de marca del logo {PRINTOPS}.
export const BRAND = {
  blue: '#508EE3',
  yellow: '#F4BE5E',
  grey: '#666666',
};

// Tiempos del efecto máquina de escribir (mismos que el diseño original).
const START_DELAY = 500;
const TYPING_SPEED = 150;
const CHAR_FADE = 100;
const SUBTITLE_PAUSE = 400;
const SUBTITLE_FADE = 1000;
// En mobile el subtítulo mide 3vw contra 22vw del logo, con un mínimo legible:
// a ancho de teléfono la proporción pura daría un texto de ~6px.
const SUBTITLE_RATIO = 3 / 22;
const SUBTITLE_MIN_FONT = 11;

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  /** Ancho total del logo en px. */
  width: number;
  /** true: aparece letra por letra y luego el subtítulo. false: estático. */
  animated?: boolean;
  showSubtitle?: boolean;
  subtitleColor?: string;
  style?: StyleProp<ViewStyle>;
}

export default function PrintOpsLogo({
  width,
  animated = false,
  showSubtitle = true,
  subtitleColor = BRAND.grey,
  style,
}: Props) {
  const [vbX, vbY, vbW, vbH] = LOGO_VIEWBOX;
  const height = (width * vbH) / vbW;
  // Tamaño de fuente equivalente del logo, para escalar el subtítulo en proporción.
  const em = width / (vbW / LOGO_EM);
  const [sX, sY, sW, sH] = SUBTITLE_VIEWBOX;
  const subEm = Math.max(em * SUBTITLE_RATIO, SUBTITLE_MIN_FONT);
  const subWidth = (sW / LOGO_EM) * subEm;
  const subHeight = (subWidth * sH) / sW;

  const subtitleProgress = useSharedValue(animated ? 0 : 1);
  useEffect(() => {
    if (!animated) return;
    const lastCharAt = START_DELAY + (LOGO_CHARS.length - 1) * TYPING_SPEED + CHAR_FADE;
    subtitleProgress.value = withDelay(
      lastCharAt + SUBTITLE_PAUSE,
      withTiming(1, { duration: SUBTITLE_FADE, easing: Easing.out(Easing.cubic) }),
    );
  }, [animated, subtitleProgress]);

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleProgress.value,
    transform: [{ translateY: (1 - subtitleProgress.value) * 10 }],
  }));

  return (
    <View style={[{ alignItems: 'center' }, style]} accessible accessibilityRole="image" accessibilityLabel="PrintOps, developed by Juan Pablo Bujaldon">
      <Svg width={width} height={height} viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}>
        {LOGO_CHARS.map((c, i) => (
          <LogoChar
            key={i}
            d={c.d}
            color={c.kind === 'bracket' ? BRAND.yellow : BRAND.blue}
            animated={animated}
            delay={START_DELAY + i * TYPING_SPEED}
          />
        ))}
      </Svg>
      {showSubtitle && (
        <Animated.View style={[{ marginTop: em * 0.12 }, subtitleStyle]}>
          <Svg width={subWidth} height={subHeight} viewBox={`${sX} ${sY} ${sW} ${sH}`}>
            <G fill={subtitleColor}>
              {SUBTITLE_LINES.map((d, i) => (
                <Path key={i} d={d} />
              ))}
            </G>
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

// Cada carácter tiene su propia opacidad: aparece a su turno (efecto typewriter).
function LogoChar({ d, color, animated, delay }: { d: string; color: string; animated: boolean; delay: number }) {
  const opacity = useSharedValue(animated ? 0 : 1);
  useEffect(() => {
    if (animated) {
      opacity.value = withDelay(delay, withTiming(1, { duration: CHAR_FADE, easing: Easing.in(Easing.quad) }));
    }
  }, [animated, delay, opacity]);
  const animatedProps = useAnimatedProps(() => ({ opacity: opacity.value }));
  return <AnimatedPath d={d} fill={color} animatedProps={animatedProps} />;
}
