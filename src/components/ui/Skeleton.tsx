import type { CSSProperties } from 'react';
import { cx } from '../../utils/cx';
import styles from './Skeleton.module.css';

interface Props {
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
}

export default function Skeleton({ width, height, className, style }: Props) {
  return <div aria-hidden="true" className={cx(styles.skeleton, className)} style={{ width, height, ...style }} />;
}
