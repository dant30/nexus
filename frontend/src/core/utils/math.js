export const fibSequence = (n = 7) => {
  const seq = [1, 1.5, 2.25, 3.375, 5, 7.5, 10];
  return seq.slice(0, n);
};

export const calcPnL = (stake, payout) => Number(payout) - Number(stake);
