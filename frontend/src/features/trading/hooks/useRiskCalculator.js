import { TRADING } from "../../../core/constants/trading.js";

export const useRiskCalculator = () => {
  const isStakeValid = (stake) =>
    stake >= TRADING.MIN_STAKE && stake <= TRADING.MAX_STAKE;

  return { isStakeValid };
};
