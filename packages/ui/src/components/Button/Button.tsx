import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'accent';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary: Petrol · outline: Petrol-Rahmen · ghost: ohne Fläche · accent: Mint (aktiver Umschalter) */
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        styles.button,
        styles[variant],
        size === 'sm' && styles.sm,
        fullWidth && styles.fullWidth,
        className,
      )}
      {...rest}
    />
  );
}
