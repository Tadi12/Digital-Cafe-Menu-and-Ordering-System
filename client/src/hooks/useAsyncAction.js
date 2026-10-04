import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async action with a loading flag that is safe against rapid clicks.
 *
 * The guard is a ref, not the state value, on purpose. `setLoading(true)` does
 * not change `loading` until React re-renders, so a handler that only checked
 * state would let every click in that window fire its own request — five fast
 * clicks on "Mark as Ready" would become five PATCH calls. The ref flips
 * synchronously inside the click handler, so the second click is dropped before
 * it can reach the API.
 *
 * `run` never rejects: it resolves to the action's value on success and to
 * `undefined` on failure, having already reported the error through `onError`.
 * The loading flag is cleared in `finally`, so a thrown error can never leave
 * the button stuck in its loading state.
 *
 * @param {Function} action     async function to run
 * @param {Object}   [options]
 * @param {Function} [options.onSuccess] called with the resolved value
 * @param {Function} [options.onError]   called with the rejection reason
 * @param {Function} [options.fallbackKey] translation key for the error toast
 * @returns {{ run: Function, loading: boolean, error: unknown }}
 */
const useAsyncAction = (action, { onSuccess, onError, fallbackKey } = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  // Drop late state updates if the page unmounts while a request is open.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Keep the latest callbacks without making `run` change identity every render.
  const callbacksRef = useRef({ onSuccess, onError, fallbackKey });
  callbacksRef.current = { onSuccess, onError, fallbackKey };

  const run = useCallback(
    async (...args) => {
      // Synchronous lock: this is what actually stops duplicate requests.
      if (inFlightRef.current) return undefined;
      inFlightRef.current = true;

      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }

      try {
        const result = await action(...args);
        callbacksRef.current.onSuccess?.(result);
        return result;
      } catch (err) {
        if (mountedRef.current) setError(err);
        callbacksRef.current.onError?.(err, callbacksRef.current.fallbackKey);
        return undefined;
      } finally {
        inFlightRef.current = false;
        // Always reset, so the button can never get stuck disabled.
        if (mountedRef.current) setLoading(false);
      }
    },
    [action],
  );

  return { run, loading, error };
};

export { useAsyncAction };
export default useAsyncAction;
