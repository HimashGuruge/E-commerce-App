import React, { useState } from 'react';

export default function Marquee({ 
  children, 
  speed = 50,
  pauseOnHover = true,
  className = '',
  fadeColor = 'rgb(2, 6, 23)',
  fadeWidth = 80
}) {
  const [isPaused, setIsPaused] = useState(false);

  const getStyles = () => {
    return `
      @keyframes marquee {
        0% { transform: translateX(0%); }
        100% { transform: translateX(-50%); }
      }
      .marquee-container::before,
      .marquee-container::after {
        content: "";
        height: 100%;
        position: absolute;
        top: 0;
        width: ${fadeWidth}px;
        z-index: 2;
        pointer-events: none;
      }
      .marquee-container::before {
        left: 0;
        background: linear-gradient(to right, ${fadeColor} 0%, transparent 100%);
      }
      .marquee-container::after {
        right: 0;
        background: linear-gradient(to left, ${fadeColor} 0%, transparent 100%);
      }
    `;
  };

  return (
    <div 
      className={`marquee-container relative overflow-hidden w-full bg-transparent ${className}`}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      <style>{getStyles()}</style>
      <div 
        className="flex w-max whitespace-nowrap text-white" 
        style={{
          animation: `marquee ${speed}s linear infinite`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      >
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden="true">{children}</div>
      </div>
    </div>
  );
}
