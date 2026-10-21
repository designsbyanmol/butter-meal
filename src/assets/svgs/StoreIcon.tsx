// assets/svgs/StoreIcon.tsx
import React from 'react';

interface SVGProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  className?: string;
}

const StoreIcon: React.FC<SVGProps> = ({
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
      <g clipPath="url(#clip0_78_29545)">
        <path
          d="M3 21H5M21 21H19M5 21H19M5 21V9.32837M19 21V9.32837M19 9.32837C18.3446 9.70699 17.5265 9.68433 16.8906 9.2604L15 8L13.1094 9.2604C12.4376 9.70827 11.5624 9.70827 10.8906 9.2604L9 8L7.1094 9.2604C6.47351 9.68433 5.65537 9.70699 5 9.32837C4.96299 9.307 4.92651 9.28434 4.8906 9.2604L4.35024 8.90016C3.56331 8.37554 3.25144 7.37141 3.60269 6.49328L4.49711 4.25722C4.80084 3.4979 5.53626 3 6.35407 3H17.6459C18.4637 3 19.1992 3.4979 19.5029 4.25722L20.3973 6.49328C20.7486 7.37141 20.4367 8.37554 19.6498 8.90016L19.1094 9.2604C19.0735 9.28434 19.037 9.307 19 9.32837Z"
          stroke={fill}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 21V16C14 14.8954 13.1046 14 12 14C10.8954 14 10 14.8954 10 16V21"
          stroke={fill}
          strokeWidth="2"
        />
      </g>
    </svg>
  );
};

export default StoreIcon;