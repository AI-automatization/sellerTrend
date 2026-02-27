import { useState, useEffect } from 'react';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
}

export function AnimatedNumber({ value, decimals = 0 }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const steps = 30;
    const inc = value / steps;
    let current = 0;
    let frame = 0;
    const timer = setInterval(() => {
      frame++;
      current = Math.min(current + inc, value);
      setDisplay(current);
      if (frame >= steps) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString()}</>;
}
