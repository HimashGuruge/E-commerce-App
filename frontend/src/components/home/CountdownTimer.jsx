import React, { useState, useEffect, useMemo } from "react";

const calculateTimeLeft = (endDate) => {
  const difference = new Date(endDate).getTime() - new Date().getTime();
  
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    total: difference,
  };
};

const CountdownTimer = ({ endDate, countdownText = "Sale Ends In:", isActive = true }) => {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(endDate));

  useEffect(() => {
    if (!isActive || timeLeft.total <= 0) return;

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(endDate);
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate, isActive, timeLeft.total]);

  if (!isActive || timeLeft.total <= 0) return null;

  const isLessThanDay = timeLeft.days === 0;

  return (
    <div className={`absolute ${isLessThanDay ? 'bottom-4 right-4' : 'bottom-4 left-4'} bg-black/80 backdrop-blur-sm rounded-xl px-4 py-2 text-white z-20`}>
      <p className="text-[10px] sm:text-xs font-medium text-white/80">{countdownText}</p>
      <div className={`flex gap-1 sm:gap-2 ${isLessThanDay ? 'text-sm sm:text-lg' : 'text-lg sm:text-2xl'} font-bold font-mono`}>
        {timeLeft.days > 0 && (
          <>
            <span className="bg-white/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">{String(timeLeft.days).padStart(2, '0')}</span>
            <span className="text-white/60">d</span>
          </>
        )}
        <span className="bg-white/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="text-white/60">h</span>
        <span className="bg-white/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="text-white/60">m</span>
        <span className="bg-white/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="text-white/60">s</span>
      </div>
    </div>
  );
};

export default CountdownTimer;
