export const createBackoff = (min = 1000, max = 30000) => {
  let delay = min;
  return {
    next() {
      const current = delay;
      delay = Math.min(max, delay * 2);
      return current;
    },
    reset() {
      delay = min;
    }
  };
};
