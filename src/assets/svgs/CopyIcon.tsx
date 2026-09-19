import React from "react";

interface SVGProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
  className?: string;
}

const CopyIcon: React.FC<SVGProps> = ({
  width = 24,
  height = 24,
  fill = "currentColor",
  className,
}) => {
  return (
    <svg className={className} xmlns="http://w3.org" viewBox="0 0 24 24" width={width} height={height}>
      <path
        fill={fill}
        d="M19 3H9c-1.1 0-2 .9-2 2v2H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-2h2c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12h-2V7c0-1.1-.9-2-2-2H9V5h10v10zm-4 4H5V7h10v12z"
      />
    </svg>
  );
};

export default CopyIcon;
