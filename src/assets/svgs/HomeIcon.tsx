// assets/svgs/HomeIcon.tsx
import React from 'react';

interface SVGProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  className?: string;
}

const HomeIcon: React.FC<SVGProps> = ({
  width = 24,
  height = 24,
  fill = 'currentColor',
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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <g clipPath="url(#clip0_78_30332)">
        <path
          d="M19 10V19C19 20.1046 18.1046 21 17 21H7C5.89543 21 5 20.1046 5 19V10M19 10L21 12M19 10L12 3L5 10M5 10L3 12"
          stroke={fill}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export default HomeIcon;