// src/assets/svgs/PowerIcon.tsx
import React from 'react';

interface Props {
  width?: number;
  height?: number;
  fill?: string;
}

const PowerIcon: React.FC<Props> = ({
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
      d="M12 3v9"
      stroke={fill}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M6.2 6.2a8 8 0 1 0 11.6 0"
      stroke={fill}
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

export default PowerIcon;