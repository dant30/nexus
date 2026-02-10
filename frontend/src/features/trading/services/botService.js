export const startBot = async (payload = {}) => {
  return {
    success: true,
    running: true,
    strategy: payload.strategy || "scalping",
    started_at: new Date().toISOString(),
  };
};

export const stopBot = async () => {
  return {
    success: true,
    running: false,
    stopped_at: new Date().toISOString(),
  };
};
