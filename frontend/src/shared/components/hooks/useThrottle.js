import { useRef } from "react";

export const useThrottle = (fn, limit = 300) => {
  const inThrottle = useRef(false);
  return (...args) => {
    if (inThrottle.current) return;
    fn(...args);
    inThrottle.current = true;
    setTimeout(() => {
      inThrottle.current = false;
    }, limit);
  };
};
