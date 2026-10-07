import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChefHat, Check, Ban } from 'lucide-react';
import ActionButton from './ActionButton';
import { preparationFlow, preparationStatusLabel, PREPARATION_ACTION_KEYS, isOrderClosed } from '../../utils/orderStatus';

const FLOW_ICONS = {
  pending: ChefHat,
  preparing: CheckCircle2,
};

/**
 * The status button for ONE preparation track, used by the chef (food) and the
 * barista (drink).
 *
 * The rule this component exists to express: a station's job ends at "ready".
 *
 *   Pending   -> [Start Preparing]
 *   Preparing -> [Mark Food Ready] / [Mark Drink Ready]
 *   Ready     -> a passive "Ready" line, and NO button
 *
 * There is deliberately no "Mark Completed" action here. Completing the CUSTOMER
 * order is the waiter's job and happens on a different endpoint; the API also
 * refuses a 'completed' preparation value, so this button could not offer one even
 * if it tried.
 *
 * Rendered from PREPARATION_FLOW rather than a chain of branches, which guarantees:
 *   - only the action valid for the current track status is offered;
 *   - while the request is open the button shows loading copy, is disabled, and the
 *     parent hook additionally locks the click handler, so a rapid double tap
 *     cannot queue two PATCH requests for the same order;
 *   - on failure nothing is applied locally, so the previous state stays on screen
 *     and only a toast reports the problem.
 *
 * @param {object}   props.order            the (station-scoped) order
 * @param {string}   props.track            'food' | 'drink'
 * @param {Function} props.onUpdate         (orderId, track, nextStatus) => void
 * @param {string}   [props.pendingTarget]  track status currently being requested
 * @param {string}   [props.succeededStatus] track status that just succeeded
 */
const PreparationStatusButton = ({
  order,
  track,
  onUpdate,
  pendingTarget,
  succeededStatus,
  className = '',
  buttonClassName = '',
}) => {
  const { t } = useTranslation();

  // The station status travels on the order as `stationStatus`, which the API sets
  // when it narrows the order to this role's items.
  // A missing stationStatus is treated as 'pending', matching stationStatusLabel and
  // StationDashboard's statusOf. Left undefined it would normalise to 'not_required',
  // which has no preparation button at all — a brand-new ticket would show the
  // station no way to start it.
  const currentStatus = order?.stationStatus || 'pending';
  const flow = preparationFlow(currentStatus);

  // A closed order has nothing left to press, whichever way it closed.
  //
  // Cancelled and Completed are the same situation for a station: the floor has
  // taken the order past this screen. Previously only Cancelled was handled, so a
  // served order left a chef looking at a passive "Ready" line — indistinguishable
  // from one that is still sitting on the pass waiting to be collected. The label
  // is the overall outcome, not the track, because the track is permanently 'ready'.
  if (isOrderClosed(order?.status)) {
    const cancelled = order.status === 'Cancelled';
    return (
      <div
        className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
          cancelled ? 'text-red-600 bg-red-50' : 'text-cafe-700 bg-cafe-100'
        } ${className}`}
      >
        {cancelled ? (
          <Ban className="w-4 h-4 shrink-0" aria-hidden="true" />
        ) : (
          <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
        )}
        <span className="truncate">
          {cancelled ? t('order_cancelled_label') : t('order_completed_label')}
        </span>
      </div>
    );
  }

  // 'ready' is the END of this station's work, not a pause before more work. It
  // gets a passive confirmation and no button — which is what keeps a chef from
  // ever being offered the final customer-order completion.
  if (!flow) {
    const done = currentStatus === 'ready';
    return (
      <div
        className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
          done ? 'text-emerald-700 bg-emerald-50' : 'text-cafe-500 bg-cafe-100'
        } ${className}`}
      >
        <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="truncate">
          {done
            ? t('preparation_ready_label')
            // The `|| 'pending'` is the same guard stationStatusLabel applies: an
            // order whose stationStatus has not arrived yet normalises to
            // 'not_required', which reads "Not required" on a ticket this station
            // demonstrably has work for.
            : preparationStatusLabel(currentStatus || 'pending', t)}
        </span>
      </div>
    );
  }

  // A success still inside its display window: hold the check rather than swapping
  // straight to the next action, so the station sees the result land.
  const justArrived = succeededStatus === currentStatus;
  const actionKey =
    PREPARATION_ACTION_KEYS[track]?.[currentStatus] || flow.actionKey;

  return (
    <ActionButton
      onClick={() => onUpdate(order._id, track, flow.next)}
      loading={pendingTarget === flow.next}
      loadingText={t(flow.loadingKey)}
      success={justArrived}
      successText={t(flow.successKey)}
      icon={FLOW_ICONS[currentStatus]}
      disabled={Boolean(pendingTarget)}
      className={`w-full text-white py-2 px-3 rounded-xl font-bold text-xs shadow transition-all duration-150 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 ${flow.classes} ${buttonClassName} ${className}`}
      aria-label={`${t(actionKey)} - ${order.orderNumber}`}
    >
      {t(actionKey)}
    </ActionButton>
  );
};

export default PreparationStatusButton;
