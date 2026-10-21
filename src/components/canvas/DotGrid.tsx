import React, { memo } from 'react';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { Colors } from '../../constants/theme';

interface Props {
  width: number;
  height: number;
  spacing?: number;
}

// Fondo de puntos tipo "papel de ingeniería". Se dibuja más grande que el
// lienzo (3x) para que al hacer pan/zoom-out no se vean los bordes.
// El espaciado coincide con el snap de los nodos (20px).
function DotGrid({ width, height, spacing = 20 }: Props) {
  // Desfase para que los puntos caigan en múltiplos de `spacing` del lienzo
  // (donde se alinean las esquinas de los nodos), aunque el SVG arranque en -width.
  const offsetX = (width - spacing / 2) % spacing;
  const offsetY = (height - spacing / 2) % spacing;
  return (
    <Svg
      pointerEvents="none"
      width={width * 3}
      height={height * 3}
      style={{ position: 'absolute', left: -width, top: -height }}
    >
      <Defs>
        <Pattern id="dots" x={offsetX} y={offsetY} width={spacing} height={spacing} patternUnits="userSpaceOnUse">
          <Circle cx={spacing / 2} cy={spacing / 2} r={1.1} fill={Colors.textTertiary} opacity={0.45} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill="url(#dots)" />
    </Svg>
  );
}

export default memo(DotGrid);
