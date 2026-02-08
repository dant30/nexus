import { useState } from "react";

export const useMutation = (fn) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fn(...args);
      return res;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
};
