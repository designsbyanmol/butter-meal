// assets/svgs/LimitedIcon.tsx
import React from 'react';

interface SVGProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  className?: string;
}

const LimitedIcon: React.FC<SVGProps> = ({
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
      <g clipPath="url(#clip0_78_29430)">
        <path
          d="M5.63593 18.364C9.15065 21.8787 14.8491 21.8787 18.3639 18.364C21.8786 14.8492 21.8786 9.15076 18.3639 5.63604C14.8491 2.12132 9.15065 2.12132 5.63593 5.63604C3.87745 7.39453 2.99877 9.69966 2.9999 12.0044L2.99988 14"
          stroke={fill}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M1 12L3 14L5 12"
          stroke={fill}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11 8L11 13L16 13"
          stroke={fill}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

    </svg>
  );
};

export default LimitedIcon;