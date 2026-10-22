import { memo } from 'react';
import { SNAP_SIZE } from '../../utils/canvas';
import styles from './DotGrid.module.css';

// Fondo de puntos tipo "papel de ingeniería". Cubre todo el viewport (no se ven bordes al
// hacer pan/zoom): el contenedor define --grid-size / --grid-x / --grid-y (ver WorkshopCanvas)
// y el espaciado coincide con el snap de los nodos.
function DotGrid({ spacing = SNAP_SIZE }: { spacing?: number }) {
  return <div className={styles.grid} style={{ ['--grid-base' as string]: `${spacing}px` }} aria-hidden="true" />;
}

export default memo(DotGrid);
