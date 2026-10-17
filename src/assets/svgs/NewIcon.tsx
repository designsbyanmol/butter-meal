// assets/svgs/NewIcon.tsx
import React from 'react';

interface SVGProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  className?: string;
}

const NewIcon: React.FC<SVGProps> = ({
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
      <g clipPath="url(#clip0_2018_1055)">
        <path
          d="M17.3961 20.7847L12.6039 17.1537C12.2468 16.8831 11.7532 16.8831 11.3961 17.1537L6.60392 20.7847C5.94531 21.2837 5 20.814 5 19.9877V3C5 2.44772 5.44772 2 6 2H18C18.5523 2 19 2.44772 19 3V19.9877C19 20.814 18.0547 21.2837 17.3961 20.7847Z"
          stroke={fill}
          strokeWidth="2"
        />
      </g>

    </svg>
  );
};

export default NewIcon;