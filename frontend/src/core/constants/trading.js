export const TRADING = {
  MIN_STAKE: 0.35,
  MAX_STAKE: 1000,
  DEFAULT_STAKE: 0.35,
  MIN_SIGNAL_CONFIDENCE: 0.6,
  TRADE_TYPES: [
    { value: "RISE_FALL", label: "Rise/Fall" },
    { value: "CALL_PUT", label: "Call/Put" },
  ],
  TRADE_TYPE_CONTRACTS: {
    RISE_FALL: [
      { value: "RISE", label: "Rise" },
      { value: "FALL", label: "Fall" },
    ],
    CALL_PUT: [
      { value: "CALL", label: "Call" },
      { value: "PUT", label: "Put" },
    ],
  },
  CONTRACT_TYPES: [
    { value: "CALL", label: "Call" },
    { value: "PUT", label: "Put" },
  ],
  DIRECTIONS: [
    { value: "RISE", label: "Rise" },
    { value: "FALL", label: "Fall" },
  ],
};
