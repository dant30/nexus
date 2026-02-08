import { useState } from "react";

export const useAsync = (fn) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async (...args) => {
    setLoading(true);
    setError(null);
    try {
      return await fn(...args);
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { run, loading, error };
};
