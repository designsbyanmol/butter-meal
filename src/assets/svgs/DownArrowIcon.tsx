// src/assets/svgs/DownArrowIcon.tsx
import React from 'react';

interface SVGProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  strokeWidth?: number | string;
  className?: string;
}

const DownArrowIcon: React.FC<SVGProps> = ({
  width = 24,
  height = 24,
  fill = 'currentColor',
  strokeWidth = 2,
  className,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={fill}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
};

export default DownArrowIcon;