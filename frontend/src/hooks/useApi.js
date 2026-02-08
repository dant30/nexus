/**
 * React Hooks for API Calls
 * useQuery (GET), useMutation (POST/PUT/PATCH/DELETE)
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { apiClient } from "../api/client.js";
import { handleAPIError } from "../api/errorHandler.js";

/**
 * useQuery Hook
 * Fetch data from API
 */
export function useQuery(url, options = {}) {
  const { enabled = true, refetchInterval = null, onSuccess = null, onError = null } = options;

  const [state, setState] = useState({
    data: null,
    loading: enabled,
    error: null,
  });

  const refetchTimerRef = useRef(null);

  const refetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      const data = await apiClient.get(url);
      setState({ data, loading: false, error: null });
      if (onSuccess) onSuccess(data);
    } catch (error) {
      const apiError = handleAPIError(error, { showNotification: false });
      setState({ data: null, loading: false, error: apiError });
      if (onError) onError(apiError);
    }
  }, [url, onSuccess, onError]);

  useEffect(() => {
    if (!enabled || !url) return;

    refetch();

    // Setup auto-refetch if interval provided
    if (refetchInterval) {
      refetchTimerRef.current = setInterval(refetch, refetchInterval);
      return () => {
        if (refetchTimerRef.current) {
          clearInterval(refetchTimerRef.current);
        }
      };
    }
  }, [url, enabled, refetch, refetchInterval]);

  return { ...state, refetch };
}

/**
 * useMutation Hook
 * POST, PUT, PATCH, DELETE operations
 */
export function useMutation(onSuccess = null, onError = null) {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(
    async (url, options = {}) => {
      const { method = "POST", body = null } = options;

      setState({ data: null, loading: true, error: null });

      try {
        let data;

        switch (method.toUpperCase()) {
          case "POST":
            data = await apiClient.post(url, body);
            break;
          case "PUT":
            data = await apiClient.put(url, body);
            break;
          case "PATCH":
            data = await apiClient.patch(url, body);
            break;
          case "DELETE":
            data = await apiClient.delete(url);
            break;
          default:
            throw new Error(`Unsupported method: ${method}`);
        }

        setState({ data, loading: false, error: null });
        if (onSuccess) onSuccess(data);
        return data;
      } catch (error) {
        const apiError = handleAPIError(error, { showNotification: false });
        setState({ data: null, loading: false, error: apiError });
        if (onError) onError(apiError);
        throw apiError;
      }
    },
    [onSuccess, onError]
  );

  return { ...state, mutate };
}

/**
 * useApi Hook
 * Convenience hook for common operations
 */
export function useApi(url, method = "GET", options = {}) {
  if (method === "GET") {
    return useQuery(url, options);
  } else {
    return useMutation(options.onSuccess, options.onError);
  }
}

/**
 * useAsyncEffect Hook
 * Run async functions in useEffect
 */
export function useAsyncEffect(asyncFunction, dependencies = []) {
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        await asyncFunction();
      } catch (error) {
        if (isMounted) {
          console.error("Async effect error:", error);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, dependencies);
}

/**
 * useDebounce Hook
 * Debounce state updates
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useLocalStorage Hook
 * Sync state with localStorage
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("LocalStorage read error:", error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error("LocalStorage write error:", error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

/**
 * useFetch Hook
 * Simple fetch wrapper with loading state
 */
export function useFetch(url, options = {}) {
  const [state, setState] = useState({
    data: null,
    loading: options.immediate !== false,
    error: null,
  });

  const fetch = useCallback(async () => {
    setState({ data: null, loading: true, error: null });

    try {
      const response = await apiClient.get(url);
      setState({ data: response, loading: false, error: null });
      return response;
    } catch (error) {
      const apiError = handleAPIError(error, { showNotification: false });
      setState({ data: null, loading: false, error: apiError });
      throw apiError;
    }
  }, [url]);

  useEffect(() => {
    if (options.immediate !== false) {
      fetch();
    }
  }, [fetch, options.immediate]);

  return { ...state, fetch };
}
