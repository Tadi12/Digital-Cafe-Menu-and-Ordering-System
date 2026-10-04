import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChefHat, Check, Ban } from 'lucide-react';
import ActionButton from './ActionButton';
import { preparationFlow } from '../../utils/orderStatus';

const FLOW_ICONS = {
  pending: ChefHat,
  preparing: CheckCircle2,
  ready: Check,
};

/**
 * The status button for ONE preparation track, used by the chef (food) and the
 * barista (drink).
 *
 * Rendered from PREPARATION_FLOW rather than a chain of branches, which guarantees
 * the rules the flow has to obey:
 *
 *   - Only the action valid for the *current* track status is offered. A completed
 *     or cancelled order has no flow entry, so it renders a terminal label and no
 *     button — "Mark Ready" can never appear on finished work.
 *   - While the request is open the button shows loading copy, is disabled, and
 *     the parent hook additionally locks the click handler, so a rapid double tap
 *     cannot queue two PATCH requests for the same order.
 *   - On success it shows a check and the new status, so the station sees the
 *     transition land rather than watching the button silently change. On failure
 *     nothing is applied locally, so the previous state stays on screen and only a
 *     toast reports the problem.
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
  const currentStatus = order?.stationStatus;
  const flow = preparationFlow(currentStatus);

  // Terminal states: nothing left to press, just the outcome.
  if (!flow) {
    const cancelled = order?.status === 'Cancelled';
    const Icon = cancelled ? Ban : Check;
    return (
      <div
        className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
          cancelled ? 'text-red-600 bg-red-50' : 'text-emerald-700 bg-emerald-50'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="truncate">
          {t(cancelled ? 'order_cancelled_label' : 'order_completed_label')}
        </span>
      </div>
    );
  }

  // A success still inside its display window: hold the check rather than swapping
  // straight to the next action, so the station sees the result land.
  const justArrived = succeededStatus === currentStatus;

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
      aria-label={`${t(flow.actionKey)} - ${order.orderNumber}`}
    >
      {t(flow.actionKey)}
    </ActionButton>
  );
};

export default PreparationStatusButton;
