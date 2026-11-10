import React, { useEffect, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  durationMs?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  durationMs = 800,
  decimals = 0,
  suffix = '',
  prefix = '',
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = Number(value) || 0;
    if (start === end) {
      setDisplayValue(end);
      return;
    }

    const stepTime = 16;
    const totalSteps = durationMs / stepTime;
    const stepIncrement = (end - start) / totalSteps;

    const timer = setInterval(() => {
      start += stepIncrement;
      if ((stepIncrement > 0 && start >= end) || (stepIncrement < 0 && start <= end)) {
        clearInterval(timer);
        setDisplayValue(end);
      } else {
        setDisplayValue(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value, durationMs]);

  return (
    <span>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
};

