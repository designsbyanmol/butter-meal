// assets/svgs/RupeeIcon.tsx
import React from 'react';

interface SVGProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  className?: string;
}

const RupeeIcon: React.FC<SVGProps> = ({
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
      <path
        d="M12.5 3C13.4167 3.42536 14.125 4.02937 14.625 4.81203C15.125 5.57768 15.375 6.48795 15.375 7.54284M12.5 3H7M12.5 3H18M15.375 7.54284C15.375 8.59773 15.125 9.5165 14.625 10.2992C14.125 11.0818 13.4167 11.6943 12.5 12.1367C11.5833 12.5791 10.475 12.8003 9.17501 12.8003H7C7 12.8003 8.5 18.7978 12.475 20.712C13.3534 21.1349 15.125 20.9672 15.125 20.9672M15.375 7.54284H7M15.375 7.54284H18"
        stroke={fill}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default RupeeIcon;