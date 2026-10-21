// Logo {PRINTOPS} como SVG estático (los textos ya están convertidos a paths).
import { BRAND } from './brand';
import { LOGO_CHARS, LOGO_EM, LOGO_VIEWBOX, SUBTITLE_LINES, SUBTITLE_VIEWBOX } from './logoGlyphs';

// En el diseño original el subtítulo mide 3vw contra 22vw del logo, con un mínimo legible.
const SUBTITLE_RATIO = 3 / 22;
const SUBTITLE_MIN_FONT = 11;

interface Props {
  /** Ancho total del logo en px. */
  width: number;
  showSubtitle?: boolean;
  subtitleColor?: string;
  className?: string;
}

export default function PrintOpsLogo({ width, showSubtitle = true, subtitleColor = BRAND.grey, className }: Props) {
  const [vbX, vbY, vbW, vbH] = LOGO_VIEWBOX;
  const height = (width * vbH) / vbW;
  const em = width / (vbW / LOGO_EM);
  const [sX, sY, sW, sH] = SUBTITLE_VIEWBOX;
  const subEm = Math.max(em * SUBTITLE_RATIO, SUBTITLE_MIN_FONT);
  const subWidth = (sW / LOGO_EM) * subEm;
  const subHeight = (subWidth * sH) / sW;

  return (
    <div
      className={className}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', maxWidth: '100%' }}
      role="img"
      aria-label="PrintOps, developed by Juan Pablo Bujaldon"
    >
      <svg width={width} height={height} viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} style={{ maxWidth: '100%', height: 'auto' }} aria-hidden="true">
        {LOGO_CHARS.map((c, i) => (
          <path key={i} d={c.d} fill={c.kind === 'bracket' ? BRAND.yellow : BRAND.blue} />
        ))}
      </svg>
      {showSubtitle ? (
        <svg
          width={subWidth}
          height={subHeight}
          viewBox={`${sX} ${sY} ${sW} ${sH}`}
          style={{ marginTop: em * 0.12, maxWidth: '100%', height: 'auto' }}
          aria-hidden="true"
        >
          <g fill={subtitleColor}>
            {SUBTITLE_LINES.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        </svg>
      ) : null}
    </div>
  );
}
