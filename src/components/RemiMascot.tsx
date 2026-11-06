import React from 'react';

interface RemiMascotProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const RemiMascot: React.FC<RemiMascotProps> = ({ size = 'md', className = '' }) => {
  const dimensions = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
  }[size];

  return (
    <div className={`relative inline-flex items-center justify-center ${dimensions} ${className}`}>
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        {/* Speech Bubble Body */}
        <path
          d="M15 35C15 23.9543 23.9543 15 35 15H85C96.0457 15 105 23.9543 105 35V75C105 86.0457 96.0457 95 85 95H55L35 110V95H35C23.9543 95 15 86.0457 15 75V35Z"
          fill="#0F766E"
          stroke="#0B2B2A"
          strokeWidth="3"
        />
        {/* Inner Highlight Reflection */}
        <path
          d="M35 20H85C93.2843 20 100 26.7157 100 35V40C100 31.7157 93.2843 25 85 25H35C26.7157 25 20 31.7157 20 40V35C20 26.7157 26.7157 20 35 20Z"
          fill="white"
          fillOpacity="0.15"
        />
        {/* Left Eye */}
        <circle cx="45" cy="50" r="6" fill="white" />
        <circle cx="46" cy="50" r="2.5" fill="#0B2B2A" />
        
        {/* Right Eye */}
        <circle cx="75" cy="50" r="6" fill="white" />
        <circle cx="76" cy="50" r="2.5" fill="#0B2B2A" />

        {/* Cheeks */}
        <circle cx="36" cy="60" r="5" fill="#FB7185" fillOpacity="0.8" />
        <circle cx="84" cy="60" r="5" fill="#FB7185" fillOpacity="0.8" />

        {/* Smile */}
        <path
          d="M50 64C53 69 67 69 70 64"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Tiny Medical Cross on Bubble corner */}
        <rect x="88" y="22" width="10" height="4" rx="2" fill="#F59E0B" />
        <rect x="91" y="19" width="4" height="10" rx="2" fill="#F59E0B" />
      </svg>
    </div>
  );
};
