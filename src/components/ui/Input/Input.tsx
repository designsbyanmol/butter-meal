// src/components/ui/Input/Input.tsx
import React from 'react';
import styles from './Input.module.scss';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  invalid?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({
  invalid,
  inputSize = 'md',
  leftIcon,
  rightIcon,
  className,
  ...rest
}) => {
  const classes = [
    styles.input,
    styles[inputSize],
    invalid ? styles.invalid : '',
    leftIcon ? styles.hasLeftIcon : '',
    rightIcon ? styles.hasRightIcon : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  if (!leftIcon && !rightIcon) {
    return <input className={classes} {...rest} />;
  }

  return (
    <div className={styles.wrap}>
      {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
      <input className={classes} {...rest} />
      {rightIcon && <span className={styles.rightIcon}>{rightIcon}</span>}
    </div>
  );
};

export default Input;