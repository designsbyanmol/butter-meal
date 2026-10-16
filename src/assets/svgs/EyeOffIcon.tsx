// src/assets/svgs/EyeOffIcon.tsx
import React from 'react';

interface Props {
  width?: number;
  height?: number;
  fill?: string;
}

const EyeOffIcon: React.FC<Props> = ({
  width = 20,
  height = 20,
  fill = 'currentColor',
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M3.3 3.3 2 4.6l3 3A12.7 12.7 0 0 0 2 12c1 2.5 5 7 10 7 1.7 0 3.3-.5 4.7-1.3l3 3 1.3-1.3-17.7-17.1Zm8.7 13.2a4.5 4.5 0 0 1-4.5-4.5c0-.6.1-1.1.4-1.6l5.7 5.7c-.5.2-1 .4-1.6.4Zm0-10.5c-1.7 0-3.3.5-4.7 1.3l2.2 2.2c.7-.6 1.5-.9 2.5-.9a4.5 4.5 0 0 1 4.5 4.5c0 1-.3 1.8-.9 2.5l2.2 2.2A12.6 12.6 0 0 0 22 12c-1-2.5-5-7-10-7Z"
      fill={fill}
    />
  </svg>
);

export default EyeOffIcon;