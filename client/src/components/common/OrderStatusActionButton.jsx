import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChefHat, Check, Ban } from 'lucide-react';
import ActionButton from './ActionButton';
import { orderStatusFlow, canAdvanceOrderStatus } from '../../utils/orderStatus';

const FLOW_ICONS = {
  Pending: ChefHat,
  Preparing: CheckCircle2,
  Ready: Check,
};

/**
 * The single status button for an order, shared by the admin order cards and the
 * kitchen display so both surfaces behave identically.
 *
 * Rendered from ORDER_STATUS_FLOW rather than a chain of status branches, which
 * is what guarantees the rules the flow has to obey:
 *
 *   - Only the action valid for the *current* status is offered. A Completed or
 *     Cancelled order has no flow entry, so it renders a terminal label and no
 *     button at all — "Mark as Ready" can never appear on a finished order.
 *   - While the request is open the button shows the loading copy, is disabled,
 *     and the click handler is additionally locked by the parent hook.
 *   - On success it shows a check and the new status label, so the admin sees
 *     the transition land rather than watching the button silently change.
 *
 * @param {object}   props.order            the order
 * @param {string}   props.role             current staff role
 * @param {Function} props.onUpdate         (orderId, nextStatus) => void
 * @param {string}   [props.pendingTarget]  status currently being requested
 * @param {string}   [props.succeededStatus] status that just succeeded
 */
const OrderStatusActionButton = ({
  order,
  role,
  onUpdate,
  pendingTarget,
  succeededStatus,
  className = '',
  buttonClassName = '',
}) => {
  const { t } = useTranslation();
  const flow = orderStatusFlow(order.status);

  // Terminal states: no action button, just the outcome.
  if (!flow) {
    const cancelled = order.status === 'Cancelled';
    const Icon = cancelled ? Ban : Check;
    return (
      <div
        className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
          cancelled
            ? 'text-red-600 bg-red-50'
            : 'text-emerald-700 bg-emerald-50'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="truncate">
          {t(cancelled ? 'order_cancelled_label' : 'order_completed_label')}
        </span>
      </div>
    );
  }

  // This role cannot advance the order yet — show the passive status instead.
  if (!canAdvanceOrderStatus(order.status, role)) {
    return (
      <div className="text-center py-1 text-xs font-bold text-gray-500">
        <span className="truncate inline-block max-w-full align-middle">
          {t(flow.waitingKey)}
        </span>
      </div>
    );
  }

  // A success that is still within its display window: hold the check rather
  // than swapping straight to the next action, so the admin sees the result.
  const justArrived = succeededStatus === order.status;

  return (
    <ActionButton
      onClick={() => onUpdate(order._id, flow.next)}
      loading={pendingTarget === flow.next}
      loadingText={t(flow.loadingKey)}
      success={justArrived}
      successText={t(flow.successKey)}
      icon={FLOW_ICONS[order.status]}
      disabled={Boolean(pendingTarget)}
      className={`w-full text-white py-2 px-3 rounded-xl font-bold text-xs shadow transition-colors disabled:opacity-70 ${flow.classes} ${buttonClassName} ${className}`}
      aria-label={`${t(flow.actionKey)} - ${order.orderNumber}`}
    >
      {t(flow.actionKey)}
    </ActionButton>
  );
};

export default OrderStatusActionButton;
