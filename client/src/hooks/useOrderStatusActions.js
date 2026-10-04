import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { updateOrderStatusApi, updatePreparationStatusApi } from '../api/orderApi';
import { resolveApiError } from '../utils/apiError';

/** How long the success state stays on the button before the card re-renders. */
const SUCCESS_VISIBLE_MS = 1600;

/**
 * Drives the Pending -> Preparing -> Ready -> Completed buttons.
 *
 * Two problems this solves beyond showing a spinner:
 *
 * 1. Duplicate requests. The per-order ref lock flips synchronously on click, so
 *    repeated clicks (or two admins, or a socket echo landing mid-flight) cannot
 *    queue up a second PATCH for the same order while the first is still open.
 * 2. Cross-order interference. State is keyed by order id, so updating one order
 *    never disables or re-enables the buttons on another card.
 *
 * The order in the list is only replaced once the server has confirmed the new
 * status, and a failed request leaves the card exactly as it was.
 *
 * @param {Function} onOrderUpdated receives the updated order from the API
 */
const useOrderStatusActions = (onOrderUpdated) => {
  const { t } = useTranslation();
  const [pendingStatus, setPendingStatus] = useState({});
  const [succeededStatus, setSucceededStatus] = useState({});
  const lockedRef = useRef({});
  const timersRef = useRef({});
  const onOrderUpdatedRef = useRef(onOrderUpdated);

  useEffect(() => {
    onOrderUpdatedRef.current = onOrderUpdated;
  }, [onOrderUpdated]);

  // Drop every pending success timer on unmount so no setState runs afterwards.
  useEffect(
    () => () => {
      Object.values(timersRef.current).forEach((timer) =>
        window.clearTimeout(timer),
      );
    },
    [],
  );

  const clearKey = useCallback((setter, orderId) => {
    setter((prev) => {
      if (!(orderId in prev)) return prev;
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
  }, []);

  const updateStatus = useCallback(
    async (orderId, nextStatus) => {
      // Synchronous per-order lock — the duplicate-click guard.
      if (lockedRef.current[orderId]) return;
      lockedRef.current[orderId] = true;

      // Loading state goes up before the request, so the UI reacts on click.
      setPendingStatus((prev) => ({ ...prev, [orderId]: nextStatus }));
      clearKey(setSucceededStatus, orderId);

      try {
        const res = await updateOrderStatusApi(orderId, { status: nextStatus });
        if (!res?.success) {
          throw new Error(res?.message || 'Status update was rejected');
        }

        onOrderUpdatedRef.current?.(res.data);
        setSucceededStatus((prev) => ({ ...prev, [orderId]: nextStatus }));

        const timer = window.setTimeout(() => {
          timersRef.current[orderId] = null;
          clearKey(setSucceededStatus, orderId);
        }, SUCCESS_VISIBLE_MS);
        timersRef.current[orderId] = timer;
      } catch (err) {
        // Card keeps its previous status; only the toast reports the failure.
        toast.error(resolveApiError(err, t, 'failed_update_order'));
      } finally {
        // Always release the lock and the spinner, even on failure.
        lockedRef.current[orderId] = false;
        clearKey(setPendingStatus, orderId);
      }
    },
    [clearKey, t],
  );

  return {
    updateStatus,
    pendingStatus,
    succeededStatus,
    isPending: useCallback(
      (orderId, status) =>
        pendingStatus[orderId] === undefined ||
        pendingStatus[orderId] === status,
      [pendingStatus],
    ),
    pendingTarget: useCallback((orderId) => pendingStatus[orderId], [pendingStatus]),
  };
};

/**
 * Drives the chef's and the barista's per-track status buttons.
 *
 * Identical guarantees to the hook above, applied to a single preparation track:
 * a synchronous per-order lock blocks double clicks, the button is disabled while
 * the PATCH is open, the card only changes once the server confirms, and a failure
 * leaves the card exactly as it was with a toast explaining why.
 *
 * The lock is per order rather than per track because one screen only ever owns one
 * track — a chef cannot have the barista's drink button on the same card.
 *
 * @param {Function} onOrderUpdated receives the updated order from the API
 */
export const usePreparationStatusActions = (onOrderUpdated) => {
  const { t } = useTranslation();
  const [pendingStatus, setPendingStatus] = useState({});
  const [succeededStatus, setSucceededStatus] = useState({});
  const lockedRef = useRef({});
  const timersRef = useRef({});
  const onOrderUpdatedRef = useRef(onOrderUpdated);

  useEffect(() => {
    onOrderUpdatedRef.current = onOrderUpdated;
  }, [onOrderUpdated]);

  useEffect(
    () => () => {
      Object.values(timersRef.current).forEach((timer) =>
        window.clearTimeout(timer),
      );
    },
    [],
  );

  const clearKey = useCallback((setter, orderId) => {
    setter((prev) => {
      if (!(orderId in prev)) return prev;
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
  }, []);

  const updatePreparation = useCallback(
    async (orderId, track, nextStatus) => {
      if (lockedRef.current[orderId]) return;
      lockedRef.current[orderId] = true;

      setPendingStatus((prev) => ({ ...prev, [orderId]: nextStatus }));
      clearKey(setSucceededStatus, orderId);

      try {
        const res = await updatePreparationStatusApi(orderId, {
          track,
          status: nextStatus,
        });
        if (!res?.success) {
          throw new Error(res?.message || 'Status update was rejected');
        }

        onOrderUpdatedRef.current?.(res.data);
        setSucceededStatus((prev) => ({ ...prev, [orderId]: nextStatus }));

        const timer = window.setTimeout(() => {
          timersRef.current[orderId] = null;
          clearKey(setSucceededStatus, orderId);
        }, SUCCESS_VISIBLE_MS);
        timersRef.current[orderId] = timer;
      } catch (err) {
        // Previous state is restored because the card was never optimistically
        // updated; only the toast reports the failure.
        toast.error(resolveApiError(err, t, 'failed_update_order'));
      } finally {
        lockedRef.current[orderId] = false;
        clearKey(setPendingStatus, orderId);
      }
    },
    [clearKey, t],
  );

  return {
    updatePreparation,
    pendingPreparation: pendingStatus,
    succeededPreparation: succeededStatus,
    pendingPreparationTarget: useCallback((orderId) => pendingStatus[orderId], [pendingStatus]),
  };
};

export { useOrderStatusActions };
export default useOrderStatusActions;