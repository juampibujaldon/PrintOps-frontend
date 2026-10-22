import { memo } from 'react';

interface Props {
  id: string;
  /** Path SVG ya calculado (ver buildEdgePath). */
  d: string;
  /** Registra el <path> para poder actualizarlo sin re-render mientras se arrastra un nodo. */
  register: (id: string, el: SVGPathElement | null) => void;
}

// Arista entre dos impresoras: curva bezier en verde oliva.
function CanvasEdgeItem({ id, d, register }: Props) {
  return (
    <path
      ref={(el) => register(id, el)}
      d={d}
      fill="none"
      stroke="#556B2F"
      strokeWidth={3}
      strokeLinecap="round"
    />
  );
}

export default memo(CanvasEdgeItem);
