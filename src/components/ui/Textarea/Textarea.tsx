// src/components/ui/Textarea/Textarea.tsx
import React from 'react';
import styles from './Textarea.module.scss';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

const Textarea: React.FC<TextareaProps> = ({
  invalid,
  className,
  rows = 3,
  ...rest
}) => {
  return (
    <textarea
      rows={rows}
      className={[styles.textarea, invalid ? styles.invalid : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
};

export default Textarea;