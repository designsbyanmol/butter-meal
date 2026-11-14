// assets/svgs/PhoneIcon.tsx
import React from 'react';

interface SVGProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  className?: string;
}

const PhoneIcon: React.FC<SVGProps> = ({
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
      <g clipPath="url(#clip0_78_29662)">
        <path
          d="M7.95953 19.5063C13.6147 18.0666 18.0666 13.6147 19.5063 7.95952C20.0513 5.81867 18.2091 4 16 4H15C14.4477 4 14.0053 4.44883 13.9508 4.99842C13.8587 5.92696 13.6397 6.81816 13.3112 7.65438L14.8305 9.17367C13.648 11.6447 11.6447 13.648 9.17366 14.8305L7.65438 13.3112C6.81815 13.6397 5.92696 13.8587 4.99842 13.9508C4.44883 14.0053 4 14.4477 4 15V16C4 18.2091 5.81867 20.0513 7.95953 19.5063Z"
          stroke={fill}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export default PhoneIcon;