import React from 'react';

interface EmailIconProps {
  width?: number;
  height?: number;
  fill?: string;
  className?: string;
  'aria-hidden'?: boolean;
}

const EmailIcon: React.FC<EmailIconProps> = ({
  width = 20,
  height = 20,
  fill = 'currentColor',
  className,
  'aria-hidden': ariaHidden,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
  >
    {/* Envelope outline */}
    <rect
      x="2.5"
      y="4.5"
      width="19"
      height="15"
      rx="2.5"
      ry="2.5"
      stroke={fill}
      strokeWidth="1.7"
      fill="none"
    />
    {/* Flap */}
    <path
      d="M3.5 6.5 L12 12.75 L20.5 6.5"
      stroke={fill}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export default EmailIcon;